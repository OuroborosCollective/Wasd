/**
 * POSTGRES LAYER PERSISTENCE ADAPTER
 *
 * DB-backed ARE 13-layer chunk persistence for production deployments.
 * Falls back to JSON adapter when DB unavailable (handled by the factory).
 *
 * Rules (ARE truth path):
 * - No nondeterministic randomness for persisted gameplay state.
 * - No wall-clock time for persisted layer values (updated_tick stores the tick).
 * - Deterministic canonical serialization (layers_json sorted by layer name).
 * - `updated_at` is operational metadata, not gameplay truth.
 */

import { Pool } from 'pg';
import {
  type LayerPersistenceAdapter,
  type PersistedLayerState,
  normalizePersistedLayerState,
} from './LayerPersistencePort.js';
import type { ChunkKey } from './types.js';

interface LayerStateRow {
  chunk_key: string;
  schema_version: number;
  tick: number;
  delta_hash: string;
  layers_json: Array<{ name: string; value: number }>;
}

export class PgLayerPersistenceAdapter implements LayerPersistenceAdapter {
  readonly driverName = 'postgres';
  private pool: Pool | null = null;
  private readonly connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = new Pool({ connectionString: this.connectionString });
    }
    return this.pool;
  }

  async ensureTable(): Promise<void> {
    const pool = await this.getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chunk_layer_state (
        chunk_key TEXT PRIMARY KEY,
        schema_version INTEGER NOT NULL DEFAULT 1,
        tick BIGINT NOT NULL,
        delta_hash CHAR(64) NOT NULL,
        layers_json JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chunk_layer_state_tick
      ON chunk_layer_state(tick)
    `);
  }

  async saveBatch(events: ReadonlyArray<PersistedLayerState>): Promise<void> {
    if (events.length === 0) return;

    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Latest persisted wins: keep the newest tick per chunk key within this
      // batch. The ON CONFLICT upsert compares tick so older events never
      // overwrite newer persisted state.
      const ordered = [...events].sort((a, b) =>
        String(a.chunkKey).localeCompare(String(b.chunkKey)) || Number(a.tick) - Number(b.tick),
      );

      for (const event of ordered) {
        const layersJson = event.layers.map(([name, value]) => ({ name, value: Number(value) }));
        await client.query(
          `INSERT INTO chunk_layer_state (chunk_key, schema_version, tick, delta_hash, layers_json)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (chunk_key)
           DO UPDATE SET
             schema_version = EXCLUDED.schema_version,
             tick = EXCLUDED.tick,
             delta_hash = EXCLUDED.delta_hash,
             layers_json = EXCLUDED.layers_json,
             updated_at = NOW()
           WHERE chunk_layer_state.tick <= EXCLUDED.tick`,
          [
            String(event.chunkKey),
            event.schemaVersion,
            Number(event.tick),
            event.deltaHash,
            JSON.stringify(layersJson),
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async loadChunkState(chunkKey: ChunkKey): Promise<PersistedLayerState | null> {
    try {
      const pool = await this.getPool();
      const result = await pool.query(
        `SELECT chunk_key, schema_version, tick, delta_hash, layers_json
         FROM chunk_layer_state
         WHERE chunk_key = $1`,
        [String(chunkKey)],
      );

      if (result.rows.length === 0) return null;
      return rowToState(result.rows[0]);
    } catch (error) {
      console.error('[pg-layer-persist] load failed:', error);
      return null;
    }
  }

  async loadAllChunkStates(): Promise<PersistedLayerState[]> {
    try {
      const pool = await this.getPool();
      const result = await pool.query(
        `SELECT chunk_key, schema_version, tick, delta_hash, layers_json
         FROM chunk_layer_state
         ORDER BY chunk_key ASC`,
      );
      const states: PersistedLayerState[] = [];
      for (const row of result.rows) {
        const state = rowToState(row);
        if (state) states.push(state);
      }
      return states;
    } catch (error) {
      console.error('[pg-layer-persist] loadAll failed:', error);
      return [];
    }
  }

  async health(): Promise<{ ok: boolean; driver: string; error?: string }> {
    try {
      const pool = await this.getPool();
      await pool.query('SELECT 1');
      return { ok: true, driver: this.driverName };
    } catch (error) {
      return {
        ok: false,
        driver: this.driverName,
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

function rowToState(row: LayerStateRow): PersistedLayerState | null {
  // Cast to the partial input shape: normalizePersistedLayerState performs
  // defensive parsing and brands the canonical output itself.
  return normalizePersistedLayerState({
    chunkKey: row.chunk_key as unknown as PersistedLayerState['chunkKey'],
    tick: row.tick as unknown as PersistedLayerState['tick'],
    deltaHash: row.delta_hash as unknown as PersistedLayerState['deltaHash'],
    schemaVersion: row.schema_version as unknown as PersistedLayerState['schemaVersion'],
    layers: Array.isArray(row.layers_json)
      ? row.layers_json.map((entry) => [entry.name, entry.value] as const)
      : [],
  } as Partial<PersistedLayerState>);
}
