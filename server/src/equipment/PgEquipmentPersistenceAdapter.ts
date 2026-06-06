/**
 * POSTGRES EQUIPMENT PERSISTENCE ADAPTER
 *
 * Postgres-based equipment persistence for production.
 * Uses ON CONFLICT for upsert semantics.
 */

import { Client } from "pg";
import {
  createPersistedPlayerEquipmentState,
  type EquipmentPersistenceAdapter,
  type PersistedPlayerEquipmentState,
} from "./EquipmentPersistence.js";
import { normalizeEquipmentState } from "./EquipmentTypes.js";

export class PgEquipmentPersistenceAdapter implements EquipmentPersistenceAdapter {
  constructor(private readonly databaseUrl = process.env.DATABASE_URL) {}

  async loadPlayerEquipment(playerId: string): Promise<PersistedPlayerEquipmentState | null> {
    if (!this.databaseUrl) return null;

    const client = new Client({ connectionString: this.databaseUrl });

    try {
      await client.connect();
      const result = await client.query(
        "SELECT player_id, equipment_json FROM player_equipment_state WHERE player_id = $1",
        [playerId],
      );

      const row = result.rows[0];
      if (!row) return null;

      return normalizeEquipmentState(
        {
          playerId: row.player_id,
          schemaVersion: 1,
          slots: Array.isArray(row.equipment_json) ? row.equipment_json : [],
        },
        playerId,
      );
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  async savePlayerEquipment(state: PersistedPlayerEquipmentState): Promise<void> {
    if (!this.databaseUrl) return;

    const normalized = createPersistedPlayerEquipmentState(state.playerId, state);
    const client = new Client({ connectionString: this.databaseUrl });

    try {
      await client.connect();
      await client.query(
        `
        INSERT INTO player_equipment_state (player_id, schema_version, equipment_json)
        VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (player_id)
        DO UPDATE SET
          schema_version = EXCLUDED.schema_version,
          equipment_json = EXCLUDED.equipment_json,
          updated_at = NOW()
        `,
        [normalized.playerId, normalized.schemaVersion, JSON.stringify(normalized.slots)],
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