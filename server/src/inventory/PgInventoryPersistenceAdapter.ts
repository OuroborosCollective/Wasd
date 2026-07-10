/**
 * POSTGRES INVENTORY PERSISTENCE ADAPTER
 *
 * Postgres-based inventory persistence for production.
 * Uses ON CONFLICT for upsert semantics.
 */

import { Client } from "pg";
import {
  createPersistedPlayerInventoryState,
  type InventoryPersistenceAdapter,
  type PersistedPlayerInventoryState,
} from "./InventoryPersistence.js";
import type { PlayerInventoryState } from "./InventoryTypes.js";

interface PersistedInventoryJson {
  readonly slots?: unknown;
  readonly appliedOriginUids?: unknown;
}

function readPersistedInventoryJson(value: unknown): {
  slots: PlayerInventoryState["slots"];
  appliedOriginUids: string[];
} {
  if (Array.isArray(value)) {
    return { slots: value as PlayerInventoryState["slots"], appliedOriginUids: [] };
  }

  if (!value || typeof value !== "object") {
    return { slots: [], appliedOriginUids: [] };
  }

  const record = value as PersistedInventoryJson;
  return {
    slots: Array.isArray(record.slots) ? record.slots as PlayerInventoryState["slots"] : [],
    appliedOriginUids: Array.isArray(record.appliedOriginUids)
      ? record.appliedOriginUids.map((entry) => String(entry))
      : [],
  };
}

export class PgInventoryPersistenceAdapter implements InventoryPersistenceAdapter {
  constructor(private readonly databaseUrl = process.env.DATABASE_URL) {}

  async loadPlayerInventory(playerId: string): Promise<PersistedPlayerInventoryState | null> {
    if (!this.databaseUrl) return null;

    const client = new Client({ connectionString: this.databaseUrl });

    try {
      await client.connect();
      const result = await client.query(
        "SELECT player_id, inventory_json FROM player_inventory_state WHERE player_id = $1",
        [playerId],
      );

      const row = result.rows[0];
      if (!row) return null;

      const persisted = readPersistedInventoryJson(row.inventory_json);
      return createPersistedPlayerInventoryState(
        row.player_id,
        {
          playerId: row.player_id,
          schemaVersion: 1,
          slots: persisted.slots,
          capacity: 32,
        },
        persisted.appliedOriginUids,
      );
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  async savePlayerInventory(state: PersistedPlayerInventoryState): Promise<void> {
    if (!this.databaseUrl) return;

    const normalized = createPersistedPlayerInventoryState(
      state.playerId,
      state,
      state.appliedOriginUids,
    );
    const client = new Client({ connectionString: this.databaseUrl });

    try {
      await client.connect();
      await client.query(
        `
        INSERT INTO player_inventory_state (player_id, schema_version, inventory_json)
        VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (player_id)
        DO UPDATE SET
          schema_version = EXCLUDED.schema_version,
          inventory_json = EXCLUDED.inventory_json,
          updated_at = NOW()
        `,
        [
          normalized.playerId,
          normalized.schemaVersion,
          JSON.stringify({
            slots: normalized.slots,
            appliedOriginUids: normalized.appliedOriginUids,
          }),
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
