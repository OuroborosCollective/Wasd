/**
 * LAYER PERSISTENCE PORT
 *
 * Stable persistence contract for ARE 13-layer chunk state.
 * Couples the write-behind persistence queue to a real, explicit backend
 * with provable Write -> Read -> Rehydrate (issue #2457).
 *
 * Rules (ARE truth path):
 * - No Date.now() / Math.random() for persisted gameplay state.
 * - No `Promise.resolve()` as persistence.
 * - No hidden memory/no-op fallback in production green.
 * - Stable canonical sort (ChunkKey -> Tick) for deterministic representation.
 * - schemaVersion explicit for future migrations.
 * - Success counters may only increment after the backend confirms the write.
 */

import type { ChunkKey, TickId, StateHash, KappaInt } from './types.js';
import type { IARELogicLayers } from './IARELogicLayers.js';

/**
 * Canonical persisted representation of one chunk's 13-layer state at a tick.
 *
 * `layerSnapshot` is stored as an explicit, ordered array of (name, value)
 * pairs so the on-disk representation is deterministic regardless of object
 * key insertion order.
 */
export interface PersistedLayerState {
  readonly chunkKey: ChunkKey;
  readonly tick: TickId;
  readonly deltaHash: StateHash;
  readonly schemaVersion: 1;
  readonly layers: ReadonlyArray<readonly [layerName: string, value: KappaInt]>;
}

export interface LayerPersistenceAdapter {
  readonly driverName: string;

  /**
   * Persist a batch of chunk layer states. Must only resolve after the
   * backend has confirmed the write. On failure the caller re-queues events.
   */
  saveBatch(events: ReadonlyArray<PersistedLayerState>): Promise<void>;

  /**
   * Read back the latest persisted layer state for a chunk, or null when no
   * persisted state exists. Used by rehydrate on chunk registration.
   */
  loadChunkState(chunkKey: ChunkKey): Promise<PersistedLayerState | null>;

  /**
   * Load all persisted chunk states. Used for full rehydrate / restart parity.
   */
  loadAllChunkStates?(): Promise<PersistedLayerState[]>;

  /**
   * Runtime health probe. `ok` is only true when the backend is actually
   * writable/readable, never a placeholder.
   */
  health?(): Promise<{ ok: boolean; driver: string; error?: string }>;
}

/**
 * Deterministic ordered layer names — single source of truth for the
 * canonical on-disk ordering of the 13 ARE layers.
 */
export const PERSISTED_LAYER_ORDER = [
  'ecology',
  'market',
  'physiology',
  'trade',
  'memory',
  'politics',
  'conflict',
  'economy',
  'kingdoms',
  'faith',
  'dungeon',
  'fear',
  'cycles',
] as const;

export type PersistedLayerName = (typeof PERSISTED_LAYER_ORDER)[number];

/**
 * Serialize IARELogicLayers into a canonical ordered array.
 */
export function layersToCanonicalArray(
  layers: IARELogicLayers,
): ReadonlyArray<readonly [PersistedLayerName, KappaInt]> {
  return PERSISTED_LAYER_ORDER.map((name) => [name, layers[name]] as const);
}

/**
 * Reconstruct IARELogicLayers from a canonical ordered array.
 * Falls back to 0 for any missing/invalid layer (defensive parsing).
 */
export function canonicalArrayToLayers(
  entries: ReadonlyArray<readonly [layerName: string, value: KappaInt]> | undefined,
): IARELogicLayers {
  const byName = new Map<string, number>();
  if (Array.isArray(entries)) {
    for (const [name, value] of entries) {
      const n = Number(value);
      if (Number.isSafeInteger(n)) {
        byName.set(String(name), n);
      }
    }
  }
  return {
    ecology: (byName.get('ecology') ?? 0) as KappaInt,
    market: (byName.get('market') ?? 0) as KappaInt,
    physiology: (byName.get('physiology') ?? 0) as KappaInt,
    trade: (byName.get('trade') ?? 0) as KappaInt,
    memory: (byName.get('memory') ?? 0) as KappaInt,
    politics: (byName.get('politics') ?? 0) as KappaInt,
    conflict: (byName.get('conflict') ?? 0) as KappaInt,
    economy: (byName.get('economy') ?? 0) as KappaInt,
    kingdoms: (byName.get('kingdoms') ?? 0) as KappaInt,
    faith: (byName.get('faith') ?? 0) as KappaInt,
    dungeon: (byName.get('dungeon') ?? 0) as KappaInt,
    fear: (byName.get('fear') ?? 0) as KappaInt,
    cycles: (byName.get('cycles') ?? 0) as KappaInt,
  };
}

/**
 * Normalize a raw persisted record into a canonical PersistedLayerState.
 * Defensive: corrupt/partial input must not crash rehydrate; missing layers
 * default to 0.
 */
export function normalizePersistedLayerState(
  input: Partial<PersistedLayerState> | null | undefined,
): PersistedLayerState | null {
  if (!input || typeof input !== 'object') return null;

  const chunkKey = typeof input.chunkKey === 'string' ? (input.chunkKey as ChunkKey) : null;
  if (!chunkKey) return null;

  const tick = Number.isSafeInteger(Number(input.tick)) ? (Number(input.tick) as TickId) : (0 as TickId);
  const rawHash = typeof input.deltaHash === 'string' ? input.deltaHash : '';
  const deltaHash = /^[0-9a-f]{64}$/i.test(rawHash)
    ? (rawHash.toLowerCase() as StateHash)
    : null;
  if (!deltaHash) return null;

  const layers = canonicalArrayToLayers(input.layers as ReadonlyArray<readonly [string, KappaInt]> | undefined);

  return Object.freeze({
    chunkKey,
    tick,
    deltaHash,
    schemaVersion: 1,
    layers: layersToCanonicalArray(layers),
  });
}
