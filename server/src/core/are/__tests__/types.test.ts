import { describe, it, expect } from 'vitest';
import {
  createKappa,
  createKappaFromDecimal,
  createTickId,
  incrementTickId,
  createStateHash,
  isStateHash,
  createChunkCoord,
  createChunkKey,
  parseChunkKey,
  createMortonCode,
  createEntityId,
  GENESIS_STATE_HASH,
  CHUNK_SIZE,
  CHUNK_SIZE_KAPPA
} from '../types';

describe('Branded Types', () => {
  describe('Kappa', () => {
    it('should create a Kappa from integer', () => {
      const kappa = createKappa(1000);
      expect(kappa).toBe(1000);
    });

    it('should throw for non-integer', () => {
      expect(() => createKappa(3.14)).toThrow();
    });

    it('should throw for unsafe integer', () => {
      expect(() => createKappa(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    });

    it('should create Kappa from decimal', () => {
      const kappa = createKappaFromDecimal(3.5);
      expect(kappa).toBe(3500); // 3.5 * 1000
    });

    it('should round decimal values', () => {
      expect(createKappaFromDecimal(3.14159)).toBe(3142);
      expect(createKappaFromDecimal(3.5)).toBe(3500);
      expect(createKappaFromDecimal(3.4999)).toBe(3500); // rounds up
    });
  });

  describe('TickId', () => {
    it('should create TickId from integer', () => {
      const tick = createTickId(0);
      expect(tick).toBe(0);
    });

    it('should create TickId from positive integer', () => {
      const tick = createTickId(100);
      expect(tick).toBe(100);
    });

    it('should throw for negative', () => {
      expect(() => createTickId(-1)).toThrow();
    });

    it('should throw for non-integer', () => {
      expect(() => createTickId(1.5)).toThrow();
    });

    it('should increment correctly', () => {
      const tick = createTickId(99);
      const next = incrementTickId(tick);
      expect(next).toBe(100);
    });
  });

  describe('StateHash', () => {
    it('should create from valid hex', () => {
      const hash = createStateHash('a'.repeat(64));
      expect(hash).toBe('a'.repeat(64));
    });

    it('should throw for invalid hex', () => {
      expect(() => createStateHash('short')).toThrow();
      expect(() => createStateHash('g'.repeat(64))).toThrow();
    });

    it('should validate correctly', () => {
      const hash = createStateHash('b'.repeat(64));
      expect(isStateHash(hash)).toBe(true);
      expect(isStateHash('invalid')).toBe(false);
    });
  });

  describe('ChunkCoord', () => {
    it('should create from integer', () => {
      const coord = createChunkCoord(5);
      expect(coord).toBe(5);
    });

    it('should throw for non-integer', () => {
      expect(() => createChunkCoord(3.14)).toThrow();
    });
  });

  describe('ChunkKey', () => {
    it('should create from coordinates', () => {
      const key = createChunkKey(5, -3);
      expect(key).toBe('5:-3');
    });

    it('should throw for non-integers', () => {
      expect(() => createChunkKey(3.14, 5)).toThrow();
      expect(() => createChunkKey(5, 2.71)).toThrow();
    });

    it('should parse back to coordinates', () => {
      const key = createChunkKey(10, 20);
      const { cx, cz } = parseChunkKey(key);
      expect(cx).toBe(10);
      expect(cz).toBe(20);
    });

    it('should throw for invalid key format', () => {
      expect(() => parseChunkKey('invalid' as any)).toThrow();
      expect(() => parseChunkKey('0:0:0' as any)).toThrow();
    });
  });

  describe('MortonCode', () => {
    it('should create from coordinates', () => {
      const code = createMortonCode(5, 10);
      expect(typeof code).toBe('number');
      expect(code).toBeGreaterThan(0);
    });

    it('should produce different codes for different coords', () => {
      const code1 = createMortonCode(1, 0);
      const code2 = createMortonCode(0, 1);
      expect(code1).not.toBe(code2);
    });
  });

  describe('EntityId', () => {
    it('should create from string', () => {
      const id = createEntityId('player-123');
      expect(id).toBe('player-123');
    });

    it('should throw for empty string', () => {
      expect(() => createEntityId('')).toThrow();
    });
  });

  describe('Constants', () => {
    it('should have correct CHUNK_SIZE', () => {
      expect(CHUNK_SIZE).toBe(64);
    });

    it('should have correct CHUNK_SIZE_KAPPA', () => {
      expect(CHUNK_SIZE_KAPPA).toBe(64000); // 64 * 1000
    });

    it('should have valid GENESIS_STATE_HASH', () => {
      expect(isStateHash(GENESIS_STATE_HASH)).toBe(true);
      expect(GENESIS_STATE_HASH).toBe('0'.repeat(64));
    });
  });
});