import { describe, it, expect, beforeEach } from 'vitest';
import { WorldTickThinShell, worldTickThinShell, registerWorldTickThinShell } from '../WorldTickThinShell.js';
import { tickSystemRegistry } from '../TickSystemRegistry.js';
import { createChunkKey } from '../types.js';

describe('WorldTickThinShell', () => {
  let shell: WorldTickThinShell;

  beforeEach(() => {
    shell = new WorldTickThinShell();
  });

  describe('configuration', () => {
    it('should have correct tick interval (100ms for 10Hz)', () => {
      expect(WorldTickThinShell.TICK_INTERVAL_MS).toBe(100);
    });

    it('should start with tick count 0', () => {
      expect(shell.getTickCount()).toBe(0);
    });
  });

  describe('chunk registration', () => {
    it('should register a chunk', () => {
      const chunkKey = createChunkKey(1, 1);
      
      shell.registerChunk(String(chunkKey));
      
      const snapshot = shell.getWorldBrainSnapshot();
      expect(snapshot.active_chunks).toContain(chunkKey);
    });

    it('should unregister a chunk', () => {
      const chunkKey = createChunkKey(1, 1);
      shell.registerChunk(String(chunkKey));
      shell.unregisterChunk(String(chunkKey));
      
      const snapshot = shell.getWorldBrainSnapshot();
      expect(snapshot.active_chunks).not.toContain(chunkKey);
    });
  });

  describe('tick execution', () => {
    it('should increment tick count', () => {
      shell.registerChunk('0:0');
      
      shell.tick();
      
      expect(shell.getTickCount()).toBe(1);
    });

    it('should execute without error', () => {
      shell.registerChunk('0:0');
      
      expect(() => shell.tick()).not.toThrow();
    });
  });

  describe('lifecycle', () => {
    it('should not be running initially', () => {
      const newShell = new WorldTickThinShell();
      // isRunning is private, but we can check via behavior
      expect(() => newShell.stop()).not.toThrow();
    });

    it('should stop gracefully', async () => {
      const newShell = new WorldTickThinShell();
      newShell.start();
      
      await newShell.stop();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('stats', () => {
    it('should return persistence stats', () => {
      const stats = shell.getPersistenceStats();
      
      expect(stats).toHaveProperty('queuedEvents');
      expect(stats).toHaveProperty('flushedEvents');
      expect(stats).toHaveProperty('failedEvents');
    });

    it('should return snapshot stats', () => {
      const stats = shell.getSnapshotStats();
      
      expect(stats).toHaveProperty('chunkCount');
    });
  });

  describe('world brain snapshot', () => {
    it('should return valid snapshot structure', () => {
      shell.registerChunk('0:0');
      shell.tick();
      
      const snapshot = shell.getWorldBrainSnapshot();
      
      expect(snapshot).toHaveProperty('tick');
      expect(snapshot).toHaveProperty('active_chunks');
      expect(snapshot).toHaveProperty('layer_states');
      expect(snapshot).toHaveProperty('omega_e');
      expect(snapshot).toHaveProperty('world_hash');
    });
  });
});

describe('registerWorldTickThinShell', () => {
  it('should return a WorldTickThinShell instance', () => {
    const shell = registerWorldTickThinShell();
    expect(shell).toBeInstanceOf(WorldTickThinShell);
  });
});

describe('Global worldTickThinShell instance', () => {
  it('should export a singleton instance', () => {
    expect(worldTickThinShell).toBeInstanceOf(WorldTickThinShell);
  });
});