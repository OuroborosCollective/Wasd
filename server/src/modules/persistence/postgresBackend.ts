/**
 * PostgreSQL / Supabase persistence backend.
 * Activated when PERSISTENCE_DRIVER=postgres or auto-detected via DATABASE_URL.
 */

import type { IPersistenceBackend } from "./persistenceBackend.js";
import { serializePlayerForPersistence } from "./playerSnapshot.js";

interface PgPoolLike {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}

function createPool(): PgPoolLike | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;

  try {
    // pg is an optional dependency — only loaded when DATABASE_URL is set
    const { Pool } = require("pg") as typeof import("pg");
    return new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      ssl:
        process.env.DATABASE_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  } catch {
    console.warn("[Persistence] pg package not available — cannot use postgres driver.");
    return null;
  }
}

/**
 * Map from in-memory player key names to DB column names.
 * Only the columns that need a rename are listed;
 * keys that match their column name are handled generically.
 */
const FIELD_TO_COLUMN: Record<string, string> = {
  name: "display_name",
  class: "character_class",
  level: "character_level",
  maxHealth: "max_health",
  maxMana: "max_mana",
  maxStamina: "stamina", // stamina column stores current stamina
  dead: "total_deaths",  // handled specially below
  deathAt: "last_death_at",
  sceneId: "scene_id",
  spawnKey: "spawn_key",
  combatTargetNpcId: "combat_target_npc",
  usedChoices: "used_choices",
  matrixEnergy: "matrix_energy",
  skillCooldowns: "skill_cooldowns",
};

function playerToRow(player: Record<string, unknown>): Record<string, unknown> {
  const snap = serializePlayerForPersistence(player as any);
  const row: Record<string, unknown> = {};

  row.player_id = snap.id;
  row.display_name = snap.name ?? "Adventurer";
  row.character_class = snap.class ?? "Novice";
  row.appearance = snap.appearance ?? "default";
  row.role = snap.role ?? "player";

  // Position: in-memory uses {x, y} where y = world z
  const pos = snap.position as { x?: number; y?: number } | undefined;
  row.pos_x = pos?.x ?? 0;
  row.pos_z = pos?.y ?? 0;

  row.health = snap.health ?? 100;
  row.max_health = snap.maxHealth ?? 100;
  row.mana = snap.mana ?? 25;
  row.max_mana = snap.maxMana ?? 25;
  row.stamina = snap.stamina ?? 100;
  row.character_level = snap.level ?? 1;
  row.xp = snap.xp ?? 0;
  row.gold = snap.gold ?? 0;
  row.total_deaths = typeof snap.dead === "boolean" && snap.dead ? 1 : 0;

  // Equipment
  const equip = snap.equipment as { weapon?: { id?: string } | null; armor?: { id?: string } | null } | undefined;
  row.equipped_weapon = equip?.weapon && typeof equip.weapon === "object" ? (equip.weapon as any).id ?? null : null;
  row.equipped_armor = equip?.armor && typeof equip.armor === "object" ? (equip.armor as any).id ?? null : null;

  // JSONB columns
  row.inventory = JSON.stringify(snap.inventory ?? []);
  row.active_quests = JSON.stringify(snap.quests ?? []);
  row.skills = JSON.stringify(snap.skills ?? { combat: { level: 1 } });
  row.skill_cooldowns = JSON.stringify(snap.skillCooldowns ?? {});
  row.flags = JSON.stringify(snap.flags ?? {});
  row.reputation = JSON.stringify(snap.reputation ?? {});
  row.used_choices = JSON.stringify(snap.usedChoices ?? []);

  row.scene_id = snap.sceneId ?? null;
  row.spawn_key = snap.spawnKey ?? null;
  row.combat_target_npc = snap.combatTargetNpcId ?? null;
  row.faction = snap.faction ?? null;
  row.civilization = snap.civilization ?? null;
  row.matrix_energy = snap.matrixEnergy ?? 0;

  return row;
}

function rowToPlayer(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.player_id,
    name: row.display_name,
    class: row.character_class,
    appearance: row.appearance,
    role: row.role,
    position: { x: Number(row.pos_x) || 0, y: Number(row.pos_z) || 0, z: 0 },
    level: Number(row.character_level) || 1,
    health: Number(row.health) || 100,
    maxHealth: Number(row.max_health) || 100,
    mana: Number(row.mana) || 25,
    maxMana: Number(row.max_mana) || 25,
    stamina: Number(row.stamina) || 100,
    maxStamina: 100,
    gold: Number(row.gold) || 0,
    xp: Number(row.xp) || 0,
    dead: false,
    deathAt: 0,
    totalDeaths: Number(row.total_deaths) || 0,
    inventory: safeJsonParse(row.inventory, []),
    quests: safeJsonParse(row.active_quests, []),
    skills: safeJsonParse(row.skills, { combat: { level: 1 } }),
    skillCooldowns: safeJsonParse(row.skill_cooldowns, {}),
    equipment: {
      weapon: row.equipped_weapon ? { id: row.equipped_weapon } : null,
      armor: row.equipped_armor ? { id: row.equipped_armor } : null,
    },
    flags: safeJsonParse(row.flags, {}),
    reputation: safeJsonParse(row.reputation, {}),
    usedChoices: safeJsonParse(row.used_choices, []),
    faction: row.faction ?? null,
    civilization: row.civilization ?? null,
    matrixEnergy: Number(row.matrix_energy) || 0,
    sceneId: row.scene_id ?? undefined,
    spawnKey: row.spawn_key ?? undefined,
    combatTargetNpcId: row.combat_target_npc ?? null,
  };
}

function safeJsonParse(value: unknown, fallback: unknown): any {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  if (value && typeof value === "object") return value;
  return fallback;
}

export class PostgresPersistenceBackend implements IPersistenceBackend {
  readonly name = "postgres";
  private pool: PgPoolLike | null = null;

  async init(): Promise<void> {
    this.pool = createPool();
    if (!this.pool) {
      console.warn("[Persistence] PostgreSQL pool not created — DATABASE_URL missing or pg unavailable.");
      return;
    }
    console.log("[Persistence] PostgreSQL backend initialized.");
  }

  async testConnection(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch (e) {
      console.error("[Persistence] PostgreSQL connection test failed:", e);
      return false;
    }
  }

  async save(data: Record<string, any>): Promise<void> {
    if (!this.pool) return;

    const ids = Object.keys(data);
    if (ids.length === 0) return;

    for (const id of ids) {
      const row = playerToRow({ ...data[id], id });
      const columns = Object.keys(row);
      const values = columns.map((c) => row[c]);
      const placeholders = columns.map((_, i) => `$${i + 1}`);
      const updates = columns
        .filter((c) => c !== "player_id")
        .map((c) => `${c} = EXCLUDED.${c}`);

      const sql = `
        INSERT INTO player_snapshots (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        ON CONFLICT (player_id) DO UPDATE SET ${updates.join(", ")}
      `;
      try {
        await this.pool.query(sql, values);
      } catch (e) {
        console.error(`[Persistence] Failed to save player ${id}:`, e);
      }
    }
    console.log(`[Persistence] Saved ${ids.length} players to PostgreSQL.`);
  }

  async load(): Promise<Record<string, any>> {
    if (!this.pool) return {};

    try {
      const { rows } = await this.pool.query("SELECT * FROM player_snapshots WHERE is_banned = false");
      const result: Record<string, any> = {};
      for (const row of rows) {
        const player = rowToPlayer(row);
        result[player.id as string] = player;
      }
      console.log(`[Persistence] Loaded ${rows.length} players from PostgreSQL.`);
      return result;
    } catch (e) {
      console.error("[Persistence] Failed to load players from PostgreSQL:", e);
      return {};
    }
  }

  async saveWorldObjects(_objects: any[]): Promise<void> {
    // World object persistence via PostgreSQL is not yet implemented.
    // Could use a separate world_objects table in the future.
  }

  async loadWorldObjects(): Promise<any[]> {
    return [];
  }
}
