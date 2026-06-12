import { describe, it, expect, beforeEach } from 'vitest';
import { WorldBrainScheduler, registerWorldBrainScheduler } from '../WorldBrainScheduler.js';
import { createKappa, createChunkKey } from '../types.js';
import { ChunkLayerIndex, ATTRACTOR_TYPES } from '../ChunkLayerState.js';

describe('WorldBrainScheduler', () => {
  let scheduler: WorldBrainScheduler;

  beforeEach(() => {
    scheduler = new WorldBrainScheduler();
  });

  describe('registration', () => {
    it('should have correct name', () => {
      expect(scheduler.name).toBe('world-brain');
    });

    it('should have INFRASTRUCTURE priority', () => {
      expect(scheduler.priority).toBe(0); // INFRASTRUCTURE = 0
    });

    it('should be enabled by default', () => {
      expect(scheduler.enabled).toBe(true);
    });
  });

  describe('chunk registration', () => {
    it('should register a chunk', () => {
      const chunkKey = createChunkKey(1, 1);
      scheduler.registerChunk(chunkKey);
      
      const state = scheduler.getChunkLayerState(chunkKey);
      expect(state).toBeDefined();
    });

    it('should allow unregistering chunks', () => {
      const chunkKey = createChunkKey(1, 1);
      scheduler.registerChunk(chunkKey);
      scheduler.unregisterChunk(chunkKey);
      
      const state = scheduler.getChunkLayerState(chunkKey);
      expect(state).toBeUndefined();
    });
  });

  describe('tick execution', () => {
    it('should execute without error', () => {
      scheduler.registerChunk(createChunkKey(0, 0));
      
      expect(() => scheduler.tick({ tickCount: 1 as any, isHighFrequencyTick: true })).not.toThrow();
    });

    it('should create initial layer state for registered chunks', () => {
      const chunkKey = createChunkKey(5, 5);
      scheduler.registerChunk(chunkKey);
      
      scheduler.tick({ tickCount: 1 as any, isHighFrequencyTick: true });
      
      const state = scheduler.getChunkLayerState(chunkKey);
      expect(state).toBeDefined();
      expect(state!.ecology).toBe(0);
    });
  });

  describe('snapshot', () => {
    it('should return world brain snapshot', () => {
      scheduler.registerChunk(createChunkKey(0, 0));
      scheduler.registerChunk(createChunkKey(1, 1));
      
      scheduler.tick({ tickCount: 1 as any, isHighFrequencyTick: true });
      
      const snapshot = scheduler.getSnapshot();
      
      expect(snapshot).toHaveProperty('active_chunks');
      expect(snapshot).toHaveProperty('layer_states');
      expect(snapshot).toHaveProperty('omega_e');
      expect(snapshot).toHaveProperty('world_hash');
    });
  });

  describe('lifecycle hooks', () => {
    it('should call onStart without error', () => {
      expect(() => scheduler.onStart()).not.toThrow();
    });

    it('should call onShutdown without error', () => {
      expect(() => scheduler.onShutdown()).not.toThrow();
    });
  });
});

describe('registerWorldBrainScheduler', () => {
  it('should return a WorldBrainScheduler instance', () => {
    const scheduler = registerWorldBrainScheduler();
    expect(scheduler).toBeInstanceOf(WorldBrainScheduler);
  });
});
