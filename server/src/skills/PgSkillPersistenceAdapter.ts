/**
 * POSTGRES SKILL PERSISTENCE ADAPTER
 *
 * DB-backed persistence for skill state.
 *
 * Rules:
 * - Graceful degradation when DATABASE_URL unavailable
 * - No secrets logged
 * - Deterministic queries
 */

import { Client } from "pg";
import {
  createPersistedPlayerSkillState,
  type PersistedPlayerSkillState,
  type SkillPersistenceAdapter,
} from "./SkillPersistence";
import { normalizePlayerSkillState } from "./SkillTypes";

export async function ensurePlayerSkillStateTable(dbUrl: string): Promise<void> {
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS player_skill_state (
        player_id TEXT PRIMARY KEY,
        schema_version INTEGER NOT NULL DEFAULT 1,
        skills_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_player_skill_state_updated_at
      ON player_skill_state(updated_at)
    `);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export class PgSkillPersistenceAdapter implements SkillPersistenceAdapter {
  constructor(private readonly databaseUrl = process.env.DATABASE_URL) {}

  async loadPlayerSkillState(playerId: string): Promise<PersistedPlayerSkillState | null> {
    if (!this.databaseUrl) return null;

    const client = new Client({ connectionString: this.databaseUrl });

    try {
      await client.connect();
      const result = await client.query(
        "SELECT player_id, skills_json FROM player_skill_state WHERE player_id = $1",
        [playerId]
      );

      const row = result.rows[0];
      if (!row) return null;

      return normalizePlayerSkillState(
        {
          playerId: row.player_id,
          schemaVersion: 1,
          skills: Array.isArray(row.skills_json) ? row.skills_json : [],
        },
        playerId
      );
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  async savePlayerSkillState(state: PersistedPlayerSkillState): Promise<void> {
    if (!this.databaseUrl) return;

    const normalized = createPersistedPlayerSkillState(state.playerId, state);
    const client = new Client({ connectionString: this.databaseUrl });

    try {
      await client.connect();
      await client.query(
        `
        INSERT INTO player_skill_state (player_id, schema_version, skills_json)
        VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (player_id)
        DO UPDATE SET
          schema_version = EXCLUDED.schema_version,
          skills_json = EXCLUDED.skills_json,
          updated_at = NOW()
        `,
        [normalized.playerId, normalized.schemaVersion, JSON.stringify(normalized.skills)]
      );
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  async health(): Promise<{ ok: boolean; driver: string; error?: string }> {
    if (!this.databaseUrl) {
      return { ok: false, driver: "postgres", error: "DATABASE_URL missing" };
    }

    const client = new Client({ connectionString: this.databaseUrl });

    try {
      await client.connect();
      await client.query("SELECT 1");
      return { ok: true, driver: "postgres" };
    } catch (error) {
      return {
        ok: false,
        driver: "postgres",
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await client.end().catch(() => undefined);
    }
  }
}