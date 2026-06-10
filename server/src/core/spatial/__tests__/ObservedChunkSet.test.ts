import { describe, it, expect } from 'vitest';
import {
  ObservedChunkSet,
  ChunkSetFactory,
  diffChunks
} from '../ObservedChunkSet';
import type { ChunkKey } from '../../are/types';

const toChunkKey = (s: string): ChunkKey => s as ChunkKey;

describe('ObservedChunkSet', () => {
  describe('update', () => {
    it('should add new chunks', () => {
      const set = new ObservedChunkSet();
      const delta = set.update(['0:0', '1:1', '2:2'].map(toChunkKey));
      
      expect(delta.added).toHaveLength(3);
      expect(delta.removed).toHaveLength(0);
      expect(delta.stable).toHaveLength(0);
    });

    it('should detect removed chunks', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0', '1:1'].map(toChunkKey));
      
      const delta = set.update(['0:0'].map(toChunkKey));
      
      expect(delta.added).toHaveLength(0);
      expect(delta.removed).toHaveLength(1);
      expect(delta.removed).toContain('1:1' as ChunkKey);
    });

    it('should detect stable chunks', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0', '1:1', '2:2'].map(toChunkKey));
      
      const delta = set.update(['0:0', '1:1', '3:3'].map(toChunkKey));
      
      expect(delta.stable).toHaveLength(2);
      expect(delta.stable).toContain('0:0' as ChunkKey);
      expect(delta.stable).toContain('1:1' as ChunkKey);
      expect(delta.added).toContain('3:3' as ChunkKey);
      expect(delta.removed).toContain('2:2' as ChunkKey);
    });
  });

  describe('has', () => {
    it('should return true for existing chunk', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0', '1:1'].map(toChunkKey));
      
      expect(set.has('0:0' as ChunkKey)).toBe(true);
      expect(set.has('1:1' as ChunkKey)).toBe(true);
    });

    it('should return false for non-existing chunk', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0'].map(toChunkKey));
      
      expect(set.has('5:5' as ChunkKey)).toBe(false);
    });
  });

  describe('size', () => {
    it('should return correct size', () => {
      const set = new ObservedChunkSet();
      expect(set.size()).toBe(0);
      
      set.update(['0:0', '1:1', '2:2'].map(toChunkKey));
      expect(set.size()).toBe(3);
    });
  });

  describe('hasChanges', () => {
    it('should return false after update with same chunks', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0', '1:1'].map(toChunkKey));
      
      // Another update with same chunks
      set.update(['0:0', '1:1'].map(toChunkKey));
      expect(set.hasChanges()).toBe(false);
    });

    it('should return true after update with different chunks', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0', '1:1'].map(toChunkKey));
      
      set.update(['0:0', '2:2'].map(toChunkKey));
      expect(set.hasChanges()).toBe(true);
    });
  });

  describe('getCurrent', () => {
    it('should return current chunks', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0', '1:1'].map(toChunkKey));
      
      const current = set.getCurrent();
      expect(current).toContain('0:0' as ChunkKey);
      expect(current).toContain('1:1' as ChunkKey);
    });
  });

  describe('getPrevious', () => {
    it('should return previous chunks after update', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0', '1:1'].map(toChunkKey));
      
      set.update(['0:0', '2:2'].map(toChunkKey));
      
      const prev = set.getPrevious();
      expect(prev).toContain('0:0' as ChunkKey);
      expect(prev).toContain('1:1' as ChunkKey);
      expect(prev).not.toContain('2:2' as ChunkKey);
    });
  });

  describe('getAdded', () => {
    it('should return newly added chunks', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0'].map(toChunkKey));
      set.update(['0:0', '1:1', '2:2'].map(toChunkKey));
      
      const added = set.getAdded();
      expect(added).toHaveLength(2);
      expect(added).toContain('1:1' as ChunkKey);
      expect(added).toContain('2:2' as ChunkKey);
    });
  });

  describe('getRemoved', () => {
    it('should return removed chunks', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0', '1:1', '2:2'].map(toChunkKey));
      set.update(['0:0'].map(toChunkKey));
      
      const removed = set.getRemoved();
      expect(removed).toHaveLength(2);
      expect(removed).toContain('1:1' as ChunkKey);
      expect(removed).toContain('2:2' as ChunkKey);
    });
  });

  describe('getStable', () => {
    it('should return chunks that remain', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0', '1:1', '2:2'].map(toChunkKey));
      set.update(['0:0', '1:1', '3:3'].map(toChunkKey));
      
      const stable = set.getStable();
      expect(stable).toHaveLength(2);
      expect(stable).toContain('0:0' as ChunkKey);
      expect(stable).toContain('1:1' as ChunkKey);
    });
  });

  describe('snapshot/restore', () => {
    it('should allow snapshot and restore', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0', '1:1'].map(toChunkKey));
      
      const snapshot = set.snapshot();
      set.update(['0:0', '2:2'].map(toChunkKey));
      
      expect(set.getCurrent()).toContain('2:2' as ChunkKey);
      
      set.restore(snapshot);
      expect(set.getCurrent()).toContain('1:1' as ChunkKey);
      expect(set.getCurrent()).not.toContain('2:2' as ChunkKey);
    });
  });

  describe('clear', () => {
    it('should clear all chunks', () => {
      const set = new ObservedChunkSet();
      set.update(['0:0', '1:1'].map(toChunkKey));
      set.clear();
      
      expect(set.size()).toBe(0);
      expect(set.hasChanges()).toBe(true);
    });
  });
});

describe('ChunkSetFactory', () => {
  describe('create', () => {
    it('should create empty set', () => {
      const set = ChunkSetFactory.create();
      expect(set.size()).toBe(0);
    });
  });

  describe('createWithChunks', () => {
    it('should create set with initial chunks', () => {
      const set = ChunkSetFactory.createWithChunks(['0:0', '1:1'].map(toChunkKey));
      expect(set.size()).toBe(2);
      expect(set.has('0:0' as ChunkKey)).toBe(true);
    });
  });
});

describe('diffChunks', () => {
  it('should compute correct diff', () => {
    const before = ['0:0', '1:1', '2:2'].map(toChunkKey);
    const after = ['0:0', '1:1', '3:3'].map(toChunkKey);
    
    const delta = diffChunks(before, after);
    
    expect(delta.stable).toHaveLength(2);
    expect(delta.added).toHaveLength(1);
    expect(delta.removed).toHaveLength(1);
  });
});