/**
 * POSTGRES CHARACTER PERSISTENCE ADAPTER
 *
 * Postgres-based character persistence for production.
 * Uses ON CONFLICT for upsert semantics.
 */

import { Client } from "pg";
import {
  createPersistedCharacterProfile,
  type CharacterPersistenceAdapter,
  type PersistedCharacterProfile,
} from "./CharacterPersistence.js";
import { normalizeCharacterProfile } from "./CharacterTypes.js";

export class PgCharacterPersistenceAdapter implements CharacterPersistenceAdapter {
  constructor(private readonly databaseUrl = process.env.DATABASE_URL) {}

  async loadCharacterProfile(playerId: string): Promise<PersistedCharacterProfile | null> {
    if (!this.databaseUrl) return null;

    const client = new Client({ connectionString: this.databaseUrl });

    try {
      await client.connect();
      const result = await client.query(
        "SELECT player_id, schema_version, character_id, display_name, archetype, created_at_tick, selected FROM player_character_profile WHERE player_id = $1",
        [playerId],
      );

      const row = result.rows[0];
      if (!row) return null;

      return normalizeCharacterProfile(
        {
          playerId: row.player_id,
          schemaVersion: row.schema_version,
          characterId: row.character_id,
          displayName: row.display_name,
          archetype: row.archetype,
          createdAtTick: row.created_at_tick,
          selected: row.selected,
        },
        playerId,
      );
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  async saveCharacterProfile(state: PersistedCharacterProfile): Promise<void> {
    if (!this.databaseUrl) return;

    const normalized = createPersistedCharacterProfile(state.playerId, state);
    const client = new Client({ connectionString: this.databaseUrl });

    try {
      await client.connect();
      await client.query(
        `
        INSERT INTO player_character_profile (
          player_id,
          schema_version,
          character_id,
          display_name,
          archetype,
          created_at_tick,
          selected
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (player_id)
        DO UPDATE SET
          schema_version = EXCLUDED.schema_version,
          character_id = EXCLUDED.character_id,
          display_name = EXCLUDED.display_name,
          archetype = EXCLUDED.archetype,
          selected = EXCLUDED.selected,
          updated_at = NOW()
        `,
        [
          normalized.playerId,
          normalized.schemaVersion,
          normalized.characterId,
          normalized.displayName,
          normalized.archetype,
          normalized.createdAtTick,
          normalized.selected,
        ],
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