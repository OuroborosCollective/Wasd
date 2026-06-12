/**
 * LayerPersistenceQueue - Phase 9: Write-Behind Persistence
 * 
 * Asynchronously persists 13-layer chunk state as ARE-Erhaltung (memory).
 * Non-blocking - does not affect simulation tick timing.
 * 
 * The 13 Layer-Zustände der Chunks werden asynchron weggeschrieben.
 */

import type { ChunkKey, TickId, StateHash, KappaInt } from './types.js';
import type { IARELogicLayers } from './IARELogicLayers.js';
import { createStateHash } from './types.js';

/**
 * Layer persistence event for write-behind queue.
 */
export interface LayerPersistenceEvent {
  chunkKey: ChunkKey;
  tick: TickId;
  layerSnapshot: IARELogicLayers;
  deltaHash: StateHash;
  timestamp: number; // Wall-clock for ops only
}

/**
 * Persistence queue statistics.
 */
export interface PersistenceQueueStats {
  queuedEvents: number;
  flushedEvents: number;
  failedEvents: number;
  lastFlushTimestamp: number;
  averageFlushDurationMs: number;
}

/**
 * LayerPersistenceQueue - Write-behind queue for 13-layer persistence.
 * 
 * Writes are debounced and batched to minimize I/O impact on tick timing.
 * Uses async operations to ensure non-blocking behavior.
 */
export class LayerPersistenceQueue {
  /** Pending persistence events */
  private eventQueue: LayerPersistenceEvent[] = [];
  
  /** Flush interval in ticks (every 300 ticks = 30 seconds at 10Hz) */
  private flushIntervalTicks = 300;
  
  /** Maximum queue size before forced flush */
  private maxQueueSize = 1000;
  
  /** Current tick count */
  private currentTick: TickId = 0 as TickId;
  
  /** Statistics */
  private stats: PersistenceQueueStats = {
    queuedEvents: 0,
    flushedEvents: 0,
    failedEvents: 0,
    lastFlushTimestamp: 0,
    averageFlushDurationMs: 0
  };
  
  /** Flush timer handle */
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  
  /**
   * Enqueue a layer persistence event.
   * Non-blocking - returns immediately.
   */
  enqueue(event: LayerPersistenceEvent): void {
    this.eventQueue.push(event);
    this.stats.queuedEvents++;
    
    // Check if we need to force flush
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flush().catch(e => {
        console.error('[LayerPersistenceQueue] Flush error:', e);
        this.stats.failedEvents++;
      });
    }
  }
  
  /**
   * Check if flush should occur based on tick interval.
   */
  shouldFlush(): boolean {
    return this.currentTick > 0 && this.currentTick % this.flushIntervalTicks === 0;
  }
  
  /**
   * Called each tick to potentially trigger a flush.
   */
  tick(tickCount: TickId): void {
    this.currentTick = tickCount;
    
    if (this.shouldFlush()) {
      this.flush().catch(e => {
        console.error('[LayerPersistenceQueue] Periodic flush error:', e);
        this.stats.failedEvents++;
      });
    }
  }
  
  /**
   * Flush all queued events asynchronously.
   * Non-blocking for tick loop.
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }
    
    const startTime = performance.now();
    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      // Batch write all events
      await this.persistBatch(eventsToFlush);
      
      const duration = performance.now() - startTime;
      this.updateStats(duration);
      
    } catch (error) {
      // Re-queue failed events for retry
      this.eventQueue.unshift(...eventsToFlush);
      this.stats.failedEvents += eventsToFlush.length;
      throw error;
    }
  }
  
  /**
   * Persist a batch of events.
   * In production, this would write to database/filesystem.
   */
  private async persistBatch(events: LayerPersistenceEvent[]): Promise<void> {
    // Simulated async persistence
    // In production: await db.writeBatch(events)
    
    return new Promise((resolve) => {
      // Simulate async write with minimal delay
      setTimeout(() => {
        // In production: actual database write
        // await this.persistenceAdapter.writeEvents(events);
        resolve();
      }, 1);
    });
  }
  
  /**
   * Update statistics after flush.
   */
  private updateStats(durationMs: number): void {
    const totalFlushed = this.stats.flushedEvents + this.eventQueue.length;
    const totalDuration = this.stats.averageFlushDurationMs * this.stats.flushedEvents + durationMs;
    
    this.stats.flushedEvents += this.eventQueue.length;
    this.stats.lastFlushTimestamp = Date.now();
    this.stats.averageFlushDurationMs = totalDuration / this.stats.flushedEvents;
  }
  
  /**
   * Get current queue size.
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }
  
  /**
   * Get statistics.
   */
  getStats(): PersistenceQueueStats {
    return { ...this.stats };
  }
  
  /**
   * Set flush interval in ticks.
   */
  setFlushInterval(ticks: number): void {
    this.flushIntervalTicks = ticks;
  }
  
  /**
   * Clear all pending events.
   */
  clear(): void {
    this.eventQueue = [];
  }
  
  /**
   * Force immediate flush and wait for completion.
   */
  async forceFlush(): Promise<void> {
    await this.flush();
  }
  
  /**
   * Shutdown the queue gracefully.
   */
  async shutdown(): Promise<void> {
    // Clear flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Final flush
    if (this.eventQueue.length > 0) {
      await this.flush();
    }
  }
}

/**
 * Global LayerPersistenceQueue instance.
 */
export const layerPersistenceQueue = new LayerPersistenceQueue();

/**
 * Create a persistence event from chunk state.
 */
export function createLayerPersistenceEvent(
  chunkKey: ChunkKey,
  tick: TickId,
  layers: IARELogicLayers,
  deltaHash: StateHash
): LayerPersistenceEvent {
  return {
    chunkKey,
    tick,
    layerSnapshot: { ...layers }, // Clone to prevent mutation
    deltaHash,
    timestamp: Date.now() // Wall-clock for ops only, not simulation
  };
}

/**
 * ARE-Erhaltung (Memory) constants.
 */
export const PERSISTENCE_CONSTANTS = {
  /** Default flush interval (300 ticks = 30 seconds at 10Hz) */
  DEFAULT_FLUSH_INTERVAL_TICKS: 300,
  
  /** Maximum queue size before forced flush */
  MAX_QUEUE_SIZE: 1000,
  
  /** Minimum time between flushes (ms) */
  MIN_FLUSH_INTERVAL_MS: 100
} as const;
