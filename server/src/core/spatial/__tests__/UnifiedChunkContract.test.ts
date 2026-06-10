import { describe, it, expect } from 'vitest';
import {
  UNIFIED_CHUNK_CONTRACT,
  assertValidChunkCoord,
  type UnifiedChunkContract
} from '../UnifiedChunkContract';

describe('UnifiedChunkContract', () => {
  describe('UNIFIED_CHUNK_CONTRACT', () => {
    it('should have correct chunk size in tiles', () => {
      expect(UNIFIED_CHUNK_CONTRACT.chunkSizeTiles).toBe(64);
    });

    it('should have correct chunk size in Kappa', () => {
      expect(UNIFIED_CHUNK_CONTRACT.chunkSizeKappa).toBe(64000);
    });

    it('should have simulation radius of 2 (5x5 grid)', () => {
      expect(UNIFIED_CHUNK_CONTRACT.simulationRadiusChunks).toBe(2);
      expect(UNIFIED_CHUNK_CONTRACT.simulationGridSize).toBe(5);
    });

    it('should have broadcast radius of 1 (3x3 grid)', () => {
      expect(UNIFIED_CHUNK_CONTRACT.broadcastRadiusChunks).toBe(1);
      expect(UNIFIED_CHUNK_CONTRACT.broadcastGridSize).toBe(3);
    });

    it('should have dormant after ticks set to 0', () => {
      expect(UNIFIED_CHUNK_CONTRACT.dormantAfterTicks).toBe(0);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(UNIFIED_CHUNK_CONTRACT)).toBe(true);
    });
  });

  describe('assertValidChunkCoord', () => {
    it('should not throw for valid coordinates', () => {
      expect(() => assertValidChunkCoord(0, 'test')).not.toThrow();
      expect(() => assertValidChunkCoord(100, 'test')).not.toThrow();
      expect(() => assertValidChunkCoord(-50, 'test')).not.toThrow();
    });

    it('should throw for non-integer coordinates', () => {
      expect(() => assertValidChunkCoord(3.14, 'test')).toThrow();
      expect(() => assertValidChunkCoord(1.5, 'test')).toThrow();
    });

    it('should throw for coordinates out of Morton range', () => {
      expect(() => assertValidChunkCoord(-40000, 'test')).toThrow();
      expect(() => assertValidChunkCoord(40000, 'test')).toThrow();
    });

    it('should throw for coordinates at boundary', () => {
      expect(() => assertValidChunkCoord(-32769, 'test')).toThrow();
      expect(() => assertValidChunkCoord(32768, 'test')).toThrow();
    });

    it('should accept coordinates at boundary', () => {
      expect(() => assertValidChunkCoord(-32768, 'test')).not.toThrow();
      expect(() => assertValidChunkCoord(32767, 'test')).not.toThrow();
    });
  });

  describe('interface compliance', () => {
    it('should implement UnifiedChunkContract interface', () => {
      const contract: UnifiedChunkContract = UNIFIED_CHUNK_CONTRACT;
      expect(contract.chunkSizeTiles).toBeDefined();
      expect(contract.chunkSizeKappa).toBeDefined();
      expect(contract.simulationRadiusChunks).toBeDefined();
      expect(contract.broadcastRadiusChunks).toBeDefined();
      expect(contract.simulationGridSize).toBeDefined();
      expect(contract.broadcastGridSize).toBeDefined();
      expect(contract.dormantAfterTicks).toBeDefined();
    });

    it('should have correct type literals', () => {
      // These are type-level checks, but we can verify runtime values match expected literals
      expect(typeof UNIFIED_CHUNK_CONTRACT.chunkSizeTiles).toBe('number');
      expect(typeof UNIFIED_CHUNK_CONTRACT.chunkSizeKappa).toBe('number');
    });
  });

  describe('grid size calculations', () => {
    it('should calculate simulation grid size correctly', () => {
      // Grid size should be 2*radius + 1
      const expected = 2 * UNIFIED_CHUNK_CONTRACT.simulationRadiusChunks + 1;
      expect(UNIFIED_CHUNK_CONTRACT.simulationGridSize).toBe(expected);
    });

    it('should calculate broadcast grid size correctly', () => {
      const expected = 2 * UNIFIED_CHUNK_CONTRACT.broadcastRadiusChunks + 1;
      expect(UNIFIED_CHUNK_CONTRACT.broadcastGridSize).toBe(expected);
    });

    it('should have 25 chunks in simulation grid (5x5)', () => {
      const totalChunks = UNIFIED_CHUNK_CONTRACT.simulationGridSize ** 2;
      expect(totalChunks).toBe(25);
    });

    it('should have 9 chunks in broadcast grid (3x3)', () => {
      const totalChunks = UNIFIED_CHUNK_CONTRACT.broadcastGridSize ** 2;
      expect(totalChunks).toBe(9);
    });
  });

  describe('consistency checks', () => {
    it('simulation radius should be greater than broadcast radius', () => {
      expect(UNIFIED_CHUNK_CONTRACT.simulationRadiusChunks).toBeGreaterThan(
        UNIFIED_CHUNK_CONTRACT.broadcastRadiusChunks
      );
    });

    it('simulation grid should contain broadcast grid', () => {
      expect(UNIFIED_CHUNK_CONTRACT.simulationGridSize).toBeGreaterThan(
        UNIFIED_CHUNK_CONTRACT.broadcastGridSize
      );
    });

    it('chunkSizeKappa should equal chunkSizeTiles * 1000 (KAPPA)', () => {
      expect(UNIFIED_CHUNK_CONTRACT.chunkSizeKappa).toBe(
        UNIFIED_CHUNK_CONTRACT.chunkSizeTiles * 1000
      );
    });
  });
});