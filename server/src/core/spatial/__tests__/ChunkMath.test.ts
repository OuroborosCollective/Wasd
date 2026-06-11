import { describe, it, expect } from 'vitest';
import type { ChunkKey } from '../../are/types';
import {
  computeChunkKey,
  computeChunkCoords,
  getChunkCenterTile,
  getChunkGrid,
  get3x3ChunkKeys,
  get5x5ChunkKeys,
  isSameChunk,
  areInSameChunk,
  chunkManhattanDistance,
  chunkEuclideanDistance,
  isValidChunkKey,
  getChunkBoundingBox,
} from '../ChunkMath';

const key = (value: string): ChunkKey => value as ChunkKey;

const expectChunkKeysToContain = (keys: readonly ChunkKey[], value: string): void => {
  expect(keys.map(String)).toContain(value);
};

describe('ChunkMath', () => {
  describe('computeChunkKey', () => {
    it('should compute correct chunk key for tile at origin', () => {
      expect(computeChunkKey(0, 0)).toBe('0:0');
      expect(computeChunkKey(1, 1)).toBe('0:0');
    });

    it('should compute correct chunk key for tiles in first chunk', () => {
      expect(computeChunkKey(32, 32)).toBe('0:0');
      expect(computeChunkKey(63, 63)).toBe('0:0');
    });

    it('should compute correct chunk key for tiles in second chunk', () => {
      expect(computeChunkKey(64, 0)).toBe('1:0');
      expect(computeChunkKey(0, 64)).toBe('0:1');
      expect(computeChunkKey(64, 64)).toBe('1:1');
    });

    it('should handle negative coordinates', () => {
      expect(computeChunkKey(-1, -1)).toBe('-1:-1');
      expect(computeChunkKey(-64, -64)).toBe('-1:-1');
      expect(computeChunkKey(-65, -65)).toBe('-2:-2');
    });

    it('should use custom chunk size', () => {
      expect(computeChunkKey(32, 32, 32)).toBe('1:1');
      expect(computeChunkKey(31, 31, 32)).toBe('0:0');
    });
  });

  describe('computeChunkCoords', () => {
    it('should return correct chunk coordinates', () => {
      const result = computeChunkCoords(100, 200);
      expect(result.cx).toBe(1);
      expect(result.cz).toBe(3);
    });

    it('should handle edge of chunk boundary', () => {
      const result = computeChunkCoords(64, 0);
      expect(result.cx).toBe(1);
      expect(result.cz).toBe(0);
    });
  });

  describe('getChunkCenterTile', () => {
    it('should return center tile of chunk 0:0', () => {
      const center = getChunkCenterTile(0, 0);
      expect(center.tileX).toBe(32);
      expect(center.tileZ).toBe(32);
    });

    it('should return center tile of chunk 1:1', () => {
      const center = getChunkCenterTile(1, 1);
      expect(center.tileX).toBe(96);
      expect(center.tileZ).toBe(96);
    });

    it('should handle custom chunk size', () => {
      const center = getChunkCenterTile(0, 0, 32);
      expect(center.tileX).toBe(16);
      expect(center.tileZ).toBe(16);
    });
  });

  describe('getChunkGrid', () => {
    it('should return 3x3 grid for radius 1', () => {
      const keys = getChunkGrid(key('0:0'), 1);
      expect(keys).toHaveLength(9);
      expectChunkKeysToContain(keys, '0:0');
      expectChunkKeysToContain(keys, '1:0');
      expectChunkKeysToContain(keys, '-1:0');
      expectChunkKeysToContain(keys, '0:1');
      expectChunkKeysToContain(keys, '0:-1');
    });

    it('should return 5x5 grid for radius 2', () => {
      const keys = getChunkGrid(key('0:0'), 2);
      expect(keys).toHaveLength(25);
    });

    it('should return 1x1 grid for radius 0', () => {
      const keys = getChunkGrid(key('5:5'), 0);
      expect(keys).toHaveLength(1);
      expect(String(keys[0])).toBe('5:5');
    });

    it('should throw for invalid chunk key', () => {
      expect(() => getChunkGrid('invalid' as ChunkKey, 1)).toThrow();
    });
  });

  describe('get3x3ChunkKeys', () => {
    it('should return 9 keys for 3x3 grid', () => {
      const keys = get3x3ChunkKeys(key('0:0'));
      expect(keys).toHaveLength(9);
    });
  });

  describe('get5x5ChunkKeys', () => {
    it('should return 25 keys for 5x5 grid', () => {
      const keys = get5x5ChunkKeys(key('0:0'));
      expect(keys).toHaveLength(25);
    });
  });

  describe('isSameChunk', () => {
    it('should return true for same chunk', () => {
      expect(isSameChunk(key('5:5'), key('5:5'))).toBe(true);
    });

    it('should return false for different chunks', () => {
      expect(isSameChunk(key('5:5'), key('5:6'))).toBe(false);
    });
  });

  describe('areInSameChunk', () => {
    it('should return true for tiles in same chunk', () => {
      expect(areInSameChunk(100, 100, 110, 110)).toBe(true);
    });

    it('should return false for tiles in different chunks', () => {
      expect(areInSameChunk(0, 0, 64, 64)).toBe(false);
    });
  });

  describe('chunkManhattanDistance', () => {
    it('should return 0 for same chunk', () => {
      expect(chunkManhattanDistance(key('5:5'), key('5:5'))).toBe(0);
    });

    it('should return correct distance', () => {
      expect(chunkManhattanDistance(key('0:0'), key('3:4'))).toBe(7);
      expect(chunkManhattanDistance(key('1:1'), key('4:1'))).toBe(3);
    });
  });

  describe('chunkEuclideanDistance', () => {
    it('should return 0 for same chunk', () => {
      expect(chunkEuclideanDistance(key('5:5'), key('5:5'))).toBe(0);
    });

    it('should return correct distance in tiles', () => {
      expect(chunkEuclideanDistance(key('0:0'), key('1:0'))).toBe(64);
      expect(chunkEuclideanDistance(key('0:0'), key('0:1'))).toBe(64);
    });

    it('should handle diagonal distance', () => {
      const dist = chunkEuclideanDistance(key('0:0'), key('1:1'));
      expect(dist).toBeCloseTo(64 * Math.SQRT2, 1);
    });
  });

  describe('isValidChunkKey', () => {
    it('should return true for valid keys', () => {
      expect(isValidChunkKey('0:0')).toBe(true);
      expect(isValidChunkKey('-5:10')).toBe(true);
      expect(isValidChunkKey('123:-456')).toBe(true);
    });

    it('should return false for invalid keys', () => {
      expect(isValidChunkKey('invalid')).toBe(false);
      expect(isValidChunkKey('0')).toBe(false);
      expect(isValidChunkKey('0:0:0')).toBe(false);
      expect(isValidChunkKey('')).toBe(false);
    });
  });

  describe('getChunkBoundingBox', () => {
    it('should return empty box for empty array', () => {
      const box = getChunkBoundingBox([]);
      expect(box.width).toBe(0);
      expect(box.height).toBe(0);
    });

    it('should return correct bounding box', () => {
      const box = getChunkBoundingBox([key('0:0'), key('2:3'), key('1:1')]);
      expect(box.minCx).toBe(0);
      expect(box.minCz).toBe(0);
      expect(box.maxCx).toBe(2);
      expect(box.maxCz).toBe(3);
      expect(box.width).toBe(3);
      expect(box.height).toBe(4);
    });
  });
});
