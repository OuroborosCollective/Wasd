/**
 * LayerPersistenceQueue - Phase 9: Write-Behind Persistence
 * 
 * Asynchronously persists 13-layer chunk state as ARE-Erhaltung (memory).
 * Non-blocking - does not affect simulation tick timing.
 * 
 * The 13 Layer-Zustände der Chunks werden asynchron weggeschrieben.
 */

import type { ChunkKey, TickId, StateHash } from './types.js';
import type { IARELogicLayers } from './IARELogicLayers.js';
import type { LayerPersistenceAdapter, PersistedLayerState } from './LayerPersistencePort.js';
import { layersToCanonicalArray } from './LayerPersistencePort.js';
import { getLayerPersistenceDriverName } from './createLayerPersistenceAdapter.js';

export interface LayerPersistenceEvent {
  chunkKey: ChunkKey;
  tick: TickId;
  layerSnapshot: IARELogicLayers;
  deltaHash: StateHash;
  timestamp: number;
}

export interface PersistenceQueueStats {
  queuedEvents: number;
  flushedEvents: number;
  failedEvents: number;
  lastFlushTimestamp: number;
  averageFlushDurationMs: number;
  /** Explicit persistence driver in use (json | postgres | none). Never a placeholder. */
  driver: string;
  /** True only when a real adapter confirmed the last write; never a fake-green. */
  lastWriteConfirmed: boolean;
  /** True when the queue degraded (adapter missing/failed) — not green. */
  degraded: boolean;
}

export class LayerPersistenceQueue {
  private eventQueue: LayerPersistenceEvent[] = [];
  private flushIntervalTicks = 300;
  private maxQueueSize = 1000;
  private currentTick: TickId = 0 as TickId;

  /**
   * Real persistence adapter. `null` only before the async factory resolves
   * or when no adapter could be built (degraded). The queue never fakes a
   * write: while `null`, flush is a no-op and stats stay non-green.
   */
  private adapter: LayerPersistenceAdapter | null = null;
  private adapterReady: Promise<void> | null = null;
  private driverName: string = 'none';

  private stats: PersistenceQueueStats = {
    queuedEvents: 0,
    flushedEvents: 0,
    failedEvents: 0,
    lastFlushTimestamp: 0,
    averageFlushDurationMs: 0,
    driver: 'none',
    lastWriteConfirmed: false,
    degraded: true,
  };

  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(adapter: LayerPersistenceAdapter | null = null) {
    if (adapter) {
      this.setAdapter(adapter);
    } else {
      this.driverName = getLayerPersistenceDriverName();
      this.stats.driver = this.driverName;
    }
  }

  /**
   * Inject a real persistence adapter. Required for the queue to count as
   * non-degraded. Used by bootstrap wiring and tests.
   */
  setAdapter(adapter: LayerPersistenceAdapter): void {
    this.adapter = adapter;
    this.driverName = adapter.driverName;
    this.stats.driver = this.driverName;
    this.stats.degraded = false;
  }

  /**
   * Lazily build the production adapter via the async factory. Safe to call
   * repeatedly; resolves once the adapter is set.
   */
  async ensureAdapter(
    factory: () => Promise<LayerPersistenceAdapter>,
  ): Promise<void> {
    if (this.adapter) return;
    if (this.adapterReady) {
      await this.adapterReady;
      return;
    }
    this.adapterReady = (async () => {
      try {
        const built = await factory();
        this.setAdapter(built);
      } catch (error) {
        console.error('[LayerPersistenceQueue] Adapter init failed:', error);
        this.stats.degraded = true;
      } finally {
        this.adapterReady = null;
      }
    })();
    await this.adapterReady;
  }

  enqueue(event: LayerPersistenceEvent): void {
    this.eventQueue.push(event);
    this.stats.queuedEvents++;

    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flush().catch(e => {
        console.error('[LayerPersistenceQueue] Flush error:', e);
        this.stats.failedEvents++;
      });
    }
  }

  shouldFlush(): boolean {
    return this.currentTick > 0 && this.currentTick % this.flushIntervalTicks === 0;
  }

  tick(tickCount: TickId): void {
    this.currentTick = tickCount;

    if (this.shouldFlush()) {
      this.flush().catch(e => {
        console.error('[LayerPersistenceQueue] Periodic flush error:', e);
        this.stats.failedEvents++;
      });
    }
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    // ARE truth path: never fake a write. If no real adapter is wired, keep
    // events in the queue, mark degraded, and count failures.
    if (!this.adapter) {
      this.stats.degraded = true;
      this.stats.failedEvents += this.eventQueue.length;
      return;
    }

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.persistBatch(eventsToFlush);
      this.updateStats(eventsToFlush.length);
      this.stats.lastWriteConfirmed = true;
    } catch (error) {
      // Preserve events on failure — no lost mutations.
      this.eventQueue.unshift(...eventsToFlush);
      this.stats.failedEvents += eventsToFlush.length;
      this.stats.lastWriteConfirmed = false;
      this.stats.degraded = true;
      throw error;
    }
  }

  private async persistBatch(events: LayerPersistenceEvent[]): Promise<void> {
    if (!this.adapter) {
      throw new Error('[LayerPersistenceQueue] No persistence adapter wired');
    }

    // Canonical sort (ChunkKey -> Tick) for deterministic representation.
    const sorted = [...events].sort((a, b) =>
      String(a.chunkKey).localeCompare(String(b.chunkKey)) ||
      Number(a.tick) - Number(b.tick),
    );

    const persisted: PersistedLayerState[] = sorted.map((event) => ({
      chunkKey: event.chunkKey,
      tick: event.tick,
      deltaHash: event.deltaHash,
      schemaVersion: 1 as const,
      layers: layersToCanonicalArray(event.layerSnapshot),
    }));

    await this.adapter.saveBatch(persisted);
  }

  /**
   * Read back the persisted layer state for a chunk, or null. Used by rehydrate
   * on chunk registration. Returns null when no adapter is wired (fail closed).
   */
  async loadChunkState(chunkKey: ChunkKey): Promise<PersistedLayerState | null> {
    if (!this.adapter) return null;
    try {
      return await this.adapter.loadChunkState(chunkKey);
    } catch (error) {
      console.error('[LayerPersistenceQueue] loadChunkState failed:', error);
      return null;
    }
  }

  private updateStats(flushedCount: number): void {
    if (flushedCount <= 0) return;

    this.stats.flushedEvents += flushedCount;
    this.stats.lastFlushTimestamp = Number(this.currentTick) > 0
      ? Number(this.currentTick)
      : this.stats.flushedEvents;
    // averageFlushDurationMs intentionally stays 0 to keep persistence a
    // deterministic side-channel (no wall-clock coupling).
  }

  getQueueSize(): number {
    return this.eventQueue.length;
  }

  getStats(): PersistenceQueueStats {
    return { ...this.stats };
  }

  getDriverName(): string {
    return this.driverName;
  }

  isDegraded(): boolean {
    return this.adapter === null || this.stats.degraded;
  }

  getAdapter(): LayerPersistenceAdapter | null {
    return this.adapter;
  }

  setFlushInterval(ticks: number): void {
    this.flushIntervalTicks = ticks;
  }

  clear(): void {
    this.eventQueue = [];
  }

  async forceFlush(): Promise<void> {
    await this.flush();
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.eventQueue.length > 0) {
      await this.flush();
    }
  }
}

export const layerPersistenceQueue = new LayerPersistenceQueue();

export function createLayerPersistenceEvent(
  chunkKey: ChunkKey,
  tick: TickId,
  layers: IARELogicLayers,
  deltaHash: StateHash
): LayerPersistenceEvent {
  return {
    chunkKey,
    tick,
    layerSnapshot: { ...layers },
    deltaHash,
    timestamp: Number(tick)
  };
}

export const PERSISTENCE_CONSTANTS = {
  DEFAULT_FLUSH_INTERVAL_TICKS: 300,
  DEFAULT_MAX_QUEUE_SIZE: 1000,
  MAX_QUEUE_SIZE: 1000,
  MIN_FLUSH_INTERVAL_MS: 100,
} as const;
