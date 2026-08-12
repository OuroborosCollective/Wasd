/**
 * LAYER PERSISTENCE ADAPTER FACTORY
 *
 * Creates the appropriate layer persistence adapter based on environment.
 * Supports JSON (default) and Postgres (production). Mirrors the
 * quest/skill/inventory adapter factory pattern (issue #2457).
 *
 * Rules (ARE truth path):
 * - JSON is the explicit fallback when DB unavailable.
 * - No hidden memory/no-op fallback in production green.
 * - Driver name exposed in runtime health for observability.
 */

import {
  JsonLayerPersistenceAdapter,
  resolveLayerStateFilePath,
} from './JsonLayerPersistenceAdapter.js';
import { PgLayerPersistenceAdapter } from './PgLayerPersistenceAdapter.js';
import type { LayerPersistenceAdapter } from './LayerPersistencePort.js';

export type LayerPersistenceDriver = 'json' | 'postgres';

export async function createLayerPersistenceAdapter(): Promise<LayerPersistenceAdapter> {
  const raw = (process.env.LAYER_PERSISTENCE_DRIVER ?? process.env.PERSISTENCE_DRIVER ?? 'json')
    .trim()
    .toLowerCase();
  const driver: LayerPersistenceDriver = raw === 'postgres' ? 'postgres' : 'json';

  if (driver === 'postgres') {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.warn(
        '[layer-persist] LAYER_PERSISTENCE_DRIVER=postgres but DATABASE_URL not set, falling back to JSON',
      );
      return new JsonLayerPersistenceAdapter();
    }

    try {
      const adapter = new PgLayerPersistenceAdapter(dbUrl);
      await adapter.ensureTable();
      return adapter;
    } catch (error) {
      console.error('[layer-persist] Failed to initialize Postgres adapter:', error);
      console.warn('[layer-persist] Falling back to JSON adapter');
      return new JsonLayerPersistenceAdapter();
    }
  }

  return new JsonLayerPersistenceAdapter();
}

/**
 * Get the effective driver name for health checks (synchronous, env-only).
 */
export function getLayerPersistenceDriverName(): LayerPersistenceDriver {
  const raw = (process.env.LAYER_PERSISTENCE_DRIVER ?? process.env.PERSISTENCE_DRIVER ?? 'json')
    .trim()
    .toLowerCase();
  return raw === 'postgres' ? 'postgres' : 'json';
}

/**
 * Resolve the JSON layer-state file path (for health probes).
 */
export function resolveLayerPersistenceFilePath(): string {
  return resolveLayerStateFilePath();
}
