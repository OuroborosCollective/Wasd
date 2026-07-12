import { db, isDatabaseConfigured, testConnection as testPostgresConnection } from "../../core/Database.js";
import { serializePlayerForPersistence } from "./playerSnapshot.js";
import type { IPersistenceBackend } from "./persistenceBackend.js";

export const RUNTIME_PLAYER_SNAPSHOT_TABLE = "runtime_player_snapshots";

const CREATE_RUNTIME_PLAYER_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${RUNTIME_PLAYER_SNAPSHOT_TABLE} (
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

function requireDatabaseConfiguration(operation: string): void {
  if (!isDatabaseConfigured()) {
    throw new Error(`[Persistence] Cannot ${operation}: PostgreSQL is selected but DATABASE_URL/SUPABASE_DB_URL is not configured.`);
  }
}

export class PostgresPersistenceBackend implements IPersistenceBackend {
  readonly name = "postgres";

  async init(): Promise<void> {
    requireDatabaseConfiguration("initialize");
    try {
      await db.query(CREATE_RUNTIME_PLAYER_TABLE_SQL);
      await db.query(CREATE_WORLD_OBJECTS_TABLE_SQL);
      await db.query(CREATE_QUESTLINE_PROGRESS_SQL);
      for (const sql of CREATE_QUESTLINE_PROGRESS_INDEXES_SQL) {
        await db.query(sql);
      }
    } catch (error) {
      console.error("[Persistence] Failed to initialize PostgreSQL persistence tables.");
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!isDatabaseConfigured()) return false;
    return testPostgresConnection();
  }

  async save(data: Readonly<Record<string, unknown>>): Promise<void> {
    requireDatabaseConfiguration("save player snapshots");

    try {
      for (const id of Object.keys(data).sort((a, b) => a.localeCompare(b))) {
        const payload = {
          ...serializePlayerForPersistence(data[id]),
          lastUpdated: "1970-01-01T00:00:00.000Z" /* ARE-DETERMINISM-ALLOW: persistence metadata placeholder */,
        };
        await db.query(
          `INSERT INTO ${RUNTIME_PLAYER_SNAPSHOT_TABLE} (id, snapshot, last_updated)
           VALUES ($1, $2::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, last_updated = NOW()`,
          [id, JSON.stringify(payload)],
        );
      }
      console.log(`Saved ${Object.keys(data).length} players to PostgreSQL runtime snapshots.`);
    } catch (error) {
      console.error("[Persistence] Failed to save player snapshots to PostgreSQL.");
      throw error;
    }
  }

  async load(): Promise<Record<string, unknown>> {
    requireDatabaseConfiguration("load player snapshots");

    try {
      const result = await db.query(
        `SELECT id, snapshot FROM ${RUNTIME_PLAYER_SNAPSHOT_TABLE} ORDER BY id`,
      );
      const out: Record<string, unknown> = {};
      for (const row of result.rows ?? []) {
        const id = typeof row.id === "string" ? row.id : "";
        if (!id) continue;
        const snapshot = row.snapshot && typeof row.snapshot === "object" ? row.snapshot : {};
        out[id] = snapshot;
      }
      console.log(`Loaded ${Object.keys(out).length} players from PostgreSQL runtime snapshots.`);
      return out;
    } catch (error) {
      console.error("[Persistence] Failed to load player snapshots from PostgreSQL.");
      throw error;
    }
  }

  async saveWorldObjects(
    objects: readonly Readonly<Record<string, unknown>>[],
  ): Promise<void> {
    requireDatabaseConfiguration("save world objects");

    try {
      const ordered = [...objects].sort((a, b) => String(a?.id ?? "").localeCompare(String(b?.id ?? "")));
      for (const obj of ordered) {
        const id = typeof obj?.id === "string" ? obj.id : "";
        if (!id) continue;
        await db.query(
          `INSERT INTO world_object_snapshots (id, snapshot, last_updated)
           VALUES ($1, $2::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, last_updated = NOW()`,
          [id, JSON.stringify(obj)],
        );
      }
      console.log(`Saved ${ordered.length} world objects to PostgreSQL.`);
    } catch (error) {
      console.error("[Persistence] Failed to save world objects to PostgreSQL.");
      throw error;
    }
  }

  async loadWorldObjects(): Promise<Record<string, unknown>[]> {
    requireDatabaseConfiguration("load world objects");

    try {
      const result = await db.query(
        "SELECT snapshot FROM world_object_snapshots ORDER BY id",
      );
      return (result.rows ?? [])
        .map((row) => (row?.snapshot && typeof row.snapshot === "object" ? row.snapshot : null))
        .filter(Boolean) as Record<string, unknown>[];
    } catch (error) {
      console.error("[Persistence] Failed to load world objects from PostgreSQL.");
      throw error;
    }
  }
}
