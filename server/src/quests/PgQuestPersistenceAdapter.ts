/**
 * POSTGRES PERSISTENCE ADAPTER
 *
 * DB-backed quest persistence for production deployments.
 * Falls back to JSON adapter if DB is unavailable.
 *
 * Rules:
 * - No Math.random() for gameplay values
 * - No Date.now() for gameplay state
 * - Deterministic serialization
 * - Graceful degradation on DB failure
 */

import { Pool } from "pg";
import {
  normalizePersistedQuestState,
  type PersistedQuestPlayerState,
  type QuestPersistenceAdapter,
} from "./QuestPersistence";

export class PgQuestPersistenceAdapter implements QuestPersistenceAdapter {
  private pool: Pool | null = null;
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = new Pool({ connectionString: this.connectionString });
    }
    return this.pool;
  }

  async loadPlayerQuestState(
    playerId: string,
  ): Promise<PersistedQuestPlayerState | null> {
    try {
      const pool = await this.getPool();
      const result = await pool.query(
        `SELECT player_id, schema_version, quests_json
         FROM player_quest_state
         WHERE player_id = $1`,
        [playerId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return normalizePersistedQuestState(
        {
          playerId: row.player_id,
          quests: row.quests_json,
          schemaVersion: row.schema_version,
        },
        playerId,
      );
    } catch (error) {
      console.error("[pg-quest-persist] load failed:", error);
      return null;
    }
  }

  async savePlayerQuestState(
    state: PersistedQuestPlayerState,
  ): Promise<void> {
    try {
      const pool = await this.getPool();
      const normalized = normalizePersistedQuestState(state, state.playerId);

      await pool.query(
        `INSERT INTO player_quest_state (player_id, schema_version, quests_json, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (player_id)
         DO UPDATE SET
           schema_version = EXCLUDED.schema_version,
           quests_json = EXCLUDED.quests_json,
           updated_at = NOW()`,
        [normalized.playerId, normalized.schemaVersion, JSON.stringify(normalized.quests)],
      );
    } catch (error) {
      console.error("[pg-quest-persist] save failed:", error);
      throw error;
    }
  }

  async health(): Promise<{ ok: boolean; driver: string; error?: string }> {
    try {
      const pool = await this.getPool();
      await pool.query("SELECT 1");
      return { ok: true, driver: "postgres" };
    } catch (error) {
      return {
        ok: false,
        driver: "postgres",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

/**
 * Create the player_quest_state table if it doesn't exist.
 * Safe to call multiple times - uses IF NOT EXISTS.
 */
export async function ensurePlayerQuestStateTable(
  connectionString: string,
): Promise<void> {
  const pool = new Pool({ connectionString });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_quest_state (
        player_id TEXT PRIMARY KEY,
        schema_version INTEGER NOT NULL DEFAULT 1,
        quests_json JSONB NOT NULL,
        updated_tick INTEGER NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_player_quest_state_updated_at
      ON player_quest_state(updated_at)
    `);

    console.log("[pg-quest-persist] player_quest_state table ready");
  } finally {
    await pool.end();
  }
}