import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SnapshotComposer, 
  DeterminismViolation,
  snapshotComposer 
} from '../SnapshotComposer.js';
import { createKappa, createChunkKey, createEntityId } from '../types.js';
import { createEmptyIARELogicLayers } from '../IARELogicLayers.js';
import type { IARELogicLayers } from '../IARELogicLayers.js';

describe('SnapshotComposer', () => {
  let composer: SnapshotComposer;

  beforeEach(() => {
    composer = new SnapshotComposer();
  });

  describe('addChunk', () => {
    it('should add a chunk with valid layers', () => {
      const chunkId = createChunkKey(1, 1);
      const layers = createEmptyIARELogicLayers();
      const entities = [];
      
      expect(() => composer.addChunk(chunkId, 1 as any, entities, layers)).not.toThrow();
    });

    it('should compute layer checksum', () => {
      const chunkId = createChunkKey(1, 1);
      const layers = createEmptyIARELogicLayers();
      
      composer.addChunk(chunkId, 1 as any, [], layers);
      
      const snapshot = composer.getChunkSnapshot(chunkId);
      expect(snapshot).toBeDefined();
      expect(snapshot!.layerChecksum).toBe(0);
    });
  });

  describe('validateLayerIntegrity', () => {
    it('should pass for empty layers (sum = 0)', () => {
      const layers = createEmptyIARELogicLayers();
      
      expect(() => SnapshotComposer.validateLayerIntegrity(layers)).not.toThrow();
    });

    it('should pass for valid layer distribution', () => {
      const layers: IARELogicLayers = {
        ecology: 100 as any,
        market: 100 as any,
        physiology: 100 as any,
        trade: 100 as any,
        memory: 100 as any,
        politics: 100 as any,
        conflict: 100 as any,
        economy: 100 as any,
        kingdoms: 100 as any,
        faith: 100 as any,
        dungeon: 100 as any,
        fear: 100 as any,
        cycles: 100 as any
      };
      
      // This would fail if CONST_ARE_TOTAL is set to 0
      // In a dynamic system, this should be allowed
      expect(() => SnapshotComposer.validateLayerIntegrity(layers)).not.toThrow();
    });
  });

  describe('finalizeWorldSnapshot', () => {
    it('should create world snapshot from chunks', () => {
      const chunk1 = createChunkKey(0, 0);
      const chunk2 = createChunkKey(1, 1);
      
      composer.addChunk(chunk1, 1 as any, [], createEmptyIARELogicLayers());
      composer.addChunk(chunk2, 1 as any, [], createEmptyIARELogicLayers());
      
      const snapshot = composer.finalizeWorldSnapshot(1 as any);
      
      expect(snapshot).toHaveProperty('tick', 1);
      expect(snapshot).toHaveProperty('worldHash');
      expect(snapshot).toHaveProperty('chunkSnapshots');
      expect(snapshot).toHaveProperty('layerChecksum');
      expect(snapshot.activeChunkCount).toBe(2);
    });

    it('should compute deterministic world hash', () => {
      const chunk = createChunkKey(5, 5);
      
      composer.addChunk(chunk, 1 as any, [], createEmptyIARELogicLayers());
      
      const snapshot1 = composer.finalizeWorldSnapshot(1 as any);
      
      composer.clear();
      composer.addChunk(chunk, 1 as any, [], createEmptyIARELogicLayers());
      const snapshot2 = composer.finalizeWorldSnapshot(1 as any);
      
      // Same input should produce same hash
      expect(snapshot1.worldHash).toBe(snapshot2.worldHash);
    });
  });

  describe('getChunkSnapshot', () => {
    it('should return undefined for non-existent chunk', () => {
      const snapshot = composer.getChunkSnapshot(createChunkKey(999, 999));
      expect(snapshot).toBeUndefined();
    });

    it('should return snapshot for existing chunk', () => {
      const chunkId = createChunkKey(3, 4);
      composer.addChunk(chunkId, 1 as any, [], createEmptyIARELogicLayers());
      
      const snapshot = composer.getChunkSnapshot(chunkId);
      expect(snapshot).toBeDefined();
      expect(snapshot!.chunkId).toBe(chunkId);
    });
  });

  describe('clear', () => {
    it('should clear all chunk snapshots', () => {
      composer.addChunk(createChunkKey(1, 1), 1 as any, [], createEmptyIARELogicLayers());
      composer.addChunk(createChunkKey(2, 2), 1 as any, [], createEmptyIARELogicLayers());
      
      expect(composer.getChunkCount()).toBe(2);
      
      composer.clear();
      
      expect(composer.getChunkCount()).toBe(0);
    });
  });
});

describe('DeterminismViolation', () => {
  it('should have correct name and message', () => {
    const error = new DeterminismViolation('Test violation');
    
    expect(error.name).toBe('DeterminismViolation');
    expect(error.message).toContain('DeterminismViolation');
    expect(error.message).toContain('Test violation');
  });
});

describe('Global snapshotComposer instance', () => {
  it('should export a singleton instance', () => {
    expect(snapshotComposer).toBeInstanceOf(SnapshotComposer);
  });
});