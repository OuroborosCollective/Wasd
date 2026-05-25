import { db, isDatabaseConfigured, testConnection as testPostgresConnection } from "../../core/Database.js";
import { serializePlayerForPersistence } from "./playerSnapshot.js";
import type { IPersistenceBackend } from "./persistenceBackend.js";

const CREATE_PLAYER_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS player_snapshots (
  id TEXT PRIMARY KEY,
  snapshot JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

const CREATE_WORLD_OBJECTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS world_object_snapshots (
  id TEXT PRIMARY KEY,
  snapshot JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

/** Same as repo `migrations/005_questline_supabase.sql` — ensures Supabase Postgres works without a separate SQL run. */
const CREATE_QUESTLINE_PROGRESS_SQL = `
CREATE TABLE IF NOT EXISTS questline_progress (
  player_id     TEXT NOT NULL,
  questline_id  TEXT NOT NULL,
  strand_key    TEXT NOT NULL DEFAULT 'A',
  current_node  TEXT NOT NULL DEFAULT 'start',
  state_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, questline_id)
);`;

const CREATE_QUESTLINE_PROGRESS_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS questline_progress_player_idx ON questline_progress (player_id);`,
  `CREATE INDEX IF NOT EXISTS questline_progress_updated_idx ON questline_progress (updated_at DESC);`,
];

export class PostgresPersistenceBackend implements IPersistenceBackend {
  readonly name = "postgres";

  async init(): Promise<void> {
    if (!isDatabaseConfigured()) {
      console.warn("[Persistence] Postgres backend selected but no database connection is configured.");
      return;
    }
    try {
      await db.query(CREATE_PLAYER_TABLE_SQL);
      await db.query(CREATE_WORLD_OBJECTS_TABLE_SQL);
      await db.query(CREATE_QUESTLINE_PROGRESS_SQL);
      for (const sql of CREATE_QUESTLINE_PROGRESS_INDEXES_SQL) {
        await db.query(sql);
      }
    } catch (err) {
      console.error("[Persistence] Failed to initialize Postgres persistence tables:", err);
    }
  }

  async testConnection(): Promise<boolean> {
    if (!isDatabaseConfigured()) {
      return false;
    }
    return testPostgresConnection();
  }

  async save(data: Record<string, any>): Promise<void> {
    if (!isDatabaseConfigured()) {
      console.warn("[Persistence] Postgres save skipped (database not configured).");
      return;
    }

    const ids = Object.keys(data);
    if (ids.length === 0) return;

    try {
      // ⚡ Bolt Optimization: Use bulk inserts to reduce database round-trips.
      // Chunking to stay within PostgreSQL parameter limits (max 65535).
      const chunkSize = 200;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunkIds = ids.slice(i, i + chunkSize);
        const values: any[] = [];
        const valuePlaceholders: string[] = [];

        chunkIds.forEach((id, index) => {
          const payload = {
            ...serializePlayerForPersistence(data[id]),
            lastUpdated: new Date().toISOString(),
          };
          values.push(id, JSON.stringify(payload));
          valuePlaceholders.push(`($${index * 2 + 1}, $${index * 2 + 2}::jsonb, NOW())`);
        });

        const sql = `
          INSERT INTO player_snapshots (id, snapshot, last_updated)
          VALUES ${valuePlaceholders.join(", ")}
          ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, last_updated = NOW()`;

        await db.query(sql, values);
      }
      console.log(`Saved ${ids.length} players to Postgres using bulk inserts.`);
    } catch (err) {
      console.error("[Persistence] Failed to save players to Postgres:", err);
    }
  }

  async load(): Promise<Record<string, any>> {
    if (!isDatabaseConfigured()) {
      return {};
    }
    try {
      const result = await db.query("SELECT id, snapshot FROM player_snapshots");
      const out: Record<string, any> = {};
      for (const row of result.rows ?? []) {
        const id = typeof row.id === "string" ? row.id : "";
        if (!id) continue;
        const snapshot = row.snapshot && typeof row.snapshot === "object" ? row.snapshot : {};
        out[id] = snapshot;
      }
      console.log(`Loaded ${Object.keys(out).length} players from Postgres.`);
      return out;
    } catch (err) {
      console.error("[Persistence] Failed to load players from Postgres:", err);
      return {};
    }
  }

  async saveWorldObjects(objects: any[]): Promise<void> {
    if (!isDatabaseConfigured()) {
      console.warn("[Persistence] Postgres saveWorldObjects skipped (database not configured).");
      return;
    }
    if (objects.length === 0) return;

    try {
      // ⚡ Bolt Optimization: Use bulk inserts to reduce database round-trips.
      const chunkSize = 200;
      for (let i = 0; i < objects.length; i += chunkSize) {
        const chunk = objects.slice(i, i + chunkSize);
        const values: any[] = [];
        const valuePlaceholders: string[] = [];
        let placeholderIndex = 1;

        for (const obj of chunk) {
          const id = typeof obj?.id === "string" ? obj.id : "";
          if (!id) continue;

          values.push(id, JSON.stringify(obj));
          valuePlaceholders.push(`($${placeholderIndex}, $${placeholderIndex + 1}::jsonb, NOW())`);
          placeholderIndex += 2;
        }

        if (values.length === 0) continue;

        const sql = `
          INSERT INTO world_object_snapshots (id, snapshot, last_updated)
          VALUES ${valuePlaceholders.join(", ")}
          ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, last_updated = NOW()`;

        await db.query(sql, values);
      }
      console.log(`Saved ${objects.length} world objects to Postgres using bulk inserts.`);
    } catch (err) {
      console.error("[Persistence] Failed to save world objects to Postgres:", err);
    }
  }

  async loadWorldObjects(): Promise<any[]> {
    if (!isDatabaseConfigured()) {
      return [];
    }
    try {
      const result = await db.query("SELECT snapshot FROM world_object_snapshots");
      const rows = result.rows ?? [];
      return rows
        .map((r) => (r?.snapshot && typeof r.snapshot === "object" ? r.snapshot : null))
        .filter(Boolean);
    } catch (err) {
      console.error("[Persistence] Failed to load world objects from Postgres:", err);
      return [];
    }
  }
}
