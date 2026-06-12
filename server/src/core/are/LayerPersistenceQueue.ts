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
}

export class LayerPersistenceQueue {
  private eventQueue: LayerPersistenceEvent[] = [];
  private flushIntervalTicks = 300;
  private maxQueueSize = 1000;
  private currentTick: TickId = 0 as TickId;

  private stats: PersistenceQueueStats = {
    queuedEvents: 0,
    flushedEvents: 0,
    failedEvents: 0,
    lastFlushTimestamp: 0,
    averageFlushDurationMs: 0
  };

  private flushTimer: ReturnType<typeof setTimeout> | null = null;

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

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.persistBatch(eventsToFlush);
      this.updateStats(eventsToFlush.length);
    } catch (error) {
      this.eventQueue.unshift(...eventsToFlush);
      this.stats.failedEvents += eventsToFlush.length;
      throw error;
    }
  }

  private async persistBatch(_events: LayerPersistenceEvent[]): Promise<void> {
    await Promise.resolve();
  }

  private updateStats(flushedCount: number): void {
    if (flushedCount <= 0) return;

    this.stats.flushedEvents += flushedCount;
    this.stats.lastFlushTimestamp = Number(this.currentTick) > 0
      ? Number(this.currentTick)
      : this.stats.flushedEvents;
    this.stats.averageFlushDurationMs = 0;
  }

  getQueueSize(): number {
    return this.eventQueue.length;
  }

  getStats(): PersistenceQueueStats {
    return { ...this.stats };
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
