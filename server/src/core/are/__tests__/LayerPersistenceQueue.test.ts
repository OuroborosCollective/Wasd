import { describe, it, expect, beforeEach } from 'vitest';
import { 
  LayerPersistenceQueue,
  layerPersistenceQueue,
  createLayerPersistenceEvent,
  PERSISTENCE_CONSTANTS
} from '../LayerPersistenceQueue.js';
import { createChunkKey, createStateHash } from '../types.js';
import { createEmptyIARELogicLayers } from '../IARELogicLayers.js';

describe('LayerPersistenceQueue', () => {
  let queue: LayerPersistenceQueue;

  beforeEach(() => {
    queue = new LayerPersistenceQueue();
  });

  describe('enqueue', () => {
    it('should enqueue events without blocking', () => {
      const event = createLayerPersistenceEvent(
        createChunkKey(1, 1),
        1 as any,
        createEmptyIARELogicLayers(),
        createStateHash('0'.repeat(64))
      );
      
      queue.enqueue(event);
      
      expect(queue.getQueueSize()).toBe(1);
    });

    it('should increment queued events counter', () => {
      const event = createLayerPersistenceEvent(
        createChunkKey(1, 1),
        1 as any,
        createEmptyIARELogicLayers(),
        createStateHash('0'.repeat(64))
      );
      
      queue.enqueue(event);
      
      const stats = queue.getStats();
      expect(stats.queuedEvents).toBe(1);
    });
  });

  describe('flush', () => {
    it('should flush all queued events', async () => {
      // Add multiple events
      for (let i = 0; i < 5; i++) {
        const event = createLayerPersistenceEvent(
          createChunkKey(i, i),
          1 as any,
          createEmptyIARELogicLayers(),
          createStateHash('0'.repeat(64))
        );
        queue.enqueue(event);
      }
      
      expect(queue.getQueueSize()).toBe(5);
      
      await queue.flush();
      
      expect(queue.getQueueSize()).toBe(0);
    });

    it('should do nothing when queue is empty', async () => {
      await expect(queue.flush()).resolves.not.toThrow();
      expect(queue.getQueueSize()).toBe(0);
    });

    it('should update stats after flush', async () => {
      const event = createLayerPersistenceEvent(
        createChunkKey(1, 1),
        1 as any,
        createEmptyIARELogicLayers(),
        createStateHash('0'.repeat(64))
      );
      queue.enqueue(event);
      
      await queue.flush();
      
      const stats = queue.getStats();
      expect(stats.flushedEvents).toBe(1);
      expect(stats.lastFlushTimestamp).toBeGreaterThan(0);
    });
  });

  describe('tick', () => {
    it('should trigger flush on interval', async () => {
      queue.setFlushInterval(10);
      
      // Add an event
      const event = createLayerPersistenceEvent(
        createChunkKey(1, 1),
        1 as any,
        createEmptyIARELogicLayers(),
        createStateHash('0'.repeat(64))
      );
      queue.enqueue(event);
      
      // Tick to trigger flush (tick 10)
      queue.tick(10 as any);
      
      // Wait for async flush
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(queue.getQueueSize()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all pending events', () => {
      for (let i = 0; i < 5; i++) {
        queue.enqueue(createLayerPersistenceEvent(
          createChunkKey(i, i),
          1 as any,
          createEmptyIARELogicLayers(),
          createStateHash('0'.repeat(64))
        ));
      }
      
      queue.clear();
      
      expect(queue.getQueueSize()).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return current statistics', () => {
      const stats = queue.getStats();
      
      expect(stats).toHaveProperty('queuedEvents');
      expect(stats).toHaveProperty('flushedEvents');
      expect(stats).toHaveProperty('failedEvents');
      expect(stats).toHaveProperty('lastFlushTimestamp');
      expect(stats).toHaveProperty('averageFlushDurationMs');
    });
  });

  describe('shutdown', () => {
    it('should flush remaining events on shutdown', async () => {
      queue.enqueue(createLayerPersistenceEvent(
        createChunkKey(1, 1),
        1 as any,
        createEmptyIARELogicLayers(),
        createStateHash('0'.repeat(64))
      ));
      
      await queue.shutdown();
      
      expect(queue.getQueueSize()).toBe(0);
    });
  });
});

describe('createLayerPersistenceEvent', () => {
  it('should create a valid persistence event', () => {
    const chunkKey = createChunkKey(5, 5);
    const layers = createEmptyIARELogicLayers();
    const deltaHash = createStateHash('a'.repeat(64));
    
    const event = createLayerPersistenceEvent(chunkKey, 42 as any, layers, deltaHash);
    
    expect(event.chunkKey).toBe(chunkKey);
    expect(event.tick).toBe(42);
    expect(event.layerSnapshot).toEqual(layers);
    expect(event.deltaHash).toBe(deltaHash);
    expect(event.timestamp).toBeGreaterThan(0);
  });

  it('should clone layers to prevent mutation', () => {
    const layers = createEmptyIARELogicLayers();
    const event = createLayerPersistenceEvent(
      createChunkKey(1, 1),
      1 as any,
      layers,
      createStateHash('0'.repeat(64))
    );
    
    // Modify original layers
    (layers as any).ecology = 999;
    
    // Event should be unaffected
    expect(event.layerSnapshot.ecology).toBe(0);
  });
});

describe('PERSISTENCE_CONSTANTS', () => {
  it('should have correct defaults', () => {
    expect(PERSISTENCE_CONSTANTS.DEFAULT_FLUSH_INTERVAL_TICKS).toBe(300);
    expect(PERSISTENCE_CONSTANTS.MAX_QUEUE_SIZE).toBe(1000);
    expect(PERSISTENCE_CONSTANTS.MIN_FLUSH_INTERVAL_MS).toBe(100);
  });
});

describe('Global layerPersistenceQueue instance', () => {
  it('should export a singleton instance', () => {
    expect(layerPersistenceQueue).toBeInstanceOf(LayerPersistenceQueue);
  });
});