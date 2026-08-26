import { describe, it, expect } from 'vitest';
import {
  createStateHash,
  isStateHash,
  stateHashEquals,
  GENESIS_STATE_HASH,
  isGenesisHash,
  xorStateHashes,
  simpleHash,
  StateHashBuilder
} from '../StateHash';

describe('StateHash', () => {
  describe('createStateHash', () => {
    it('should create a valid state hash', () => {
      const hash = createStateHash('a'.repeat(64));
      expect(hash).toBe('a'.repeat(64));
    });

    it('should throw for invalid format', () => {
      expect(() => createStateHash('short')).toThrow();
      expect(() => createStateHash('g'.repeat(64))).toThrow();
      expect(() => createStateHash('a'.repeat(63) + 'g')).toThrow();
    });

    it('should accept lowercase hex', () => {
      const hash = createStateHash('ab'.repeat(32));
      expect(hash).toBe('ab'.repeat(32));
    });

    it('should accept uppercase hex', () => {
      const hash = createStateHash('AB'.repeat(32));
      expect(hash).toBe('AB'.repeat(32));
    });
  });

  describe('isStateHash', () => {
    it('should return true for valid hash', () => {
      expect(isStateHash('a'.repeat(64))).toBe(true);
      expect(isStateHash(GENESIS_STATE_HASH)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isStateHash('short')).toBe(false);
      expect(isStateHash(123)).toBe(false);
      expect(isStateHash(null)).toBe(false);
      expect(isStateHash(undefined)).toBe(false);
      expect(isStateHash('')).toBe(false);
    });
  });

  describe('stateHashEquals', () => {
    it('should return true for equal hashes', () => {
      const hash1 = createStateHash('a'.repeat(64));
      const hash2 = createStateHash('a'.repeat(64));
      expect(stateHashEquals(hash1, hash2)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const hash1 = createStateHash('a'.repeat(64));
      const hash2 = createStateHash('b'.repeat(64));
      expect(stateHashEquals(hash1, hash2)).toBe(false);
    });

    it('should handle different lengths', () => {
      expect(stateHashEquals('abc' as any, 'abcd' as any)).toBe(false);
    });
  });

  describe('GENESIS_STATE_HASH', () => {
    it('should be 64 zeros', () => {
      expect(GENESIS_STATE_HASH).toBe('0'.repeat(64));
    });

    it('should be a valid StateHash', () => {
      expect(isStateHash(GENESIS_STATE_HASH)).toBe(true);
    });
  });

  describe('isGenesisHash', () => {
    it('should return true for genesis hash', () => {
      expect(isGenesisHash(GENESIS_STATE_HASH)).toBe(true);
    });

    it('should return false for other hashes', () => {
      const hash = createStateHash('a'.repeat(64));
      expect(isGenesisHash(hash)).toBe(false);
    });
  });

  describe('xorStateHashes', () => {
    it('should XOR two hashes', () => {
      const hash1 = createStateHash('aa'.repeat(32));
      const hash2 = createStateHash('ff'.repeat(32));
      const result = xorStateHashes(hash1, hash2);
      
      expect(isStateHash(result)).toBe(true);
      expect(result).toBe('55'.repeat(32));
    });

    it('should throw for different lengths', () => {
      const hash1 = createStateHash('a'.repeat(64));
      const hash2 = 'a'.repeat(66) as any;
      expect(() => xorStateHashes(hash1, hash2)).toThrow('[StateHash] Cannot XOR hashes of different lengths');
    });

    it('should be reversible', () => {
      const hash1 = createStateHash('12'.repeat(32));
      const hash2 = createStateHash('34'.repeat(32));
      const xored = xorStateHashes(hash1, hash2);
      const restored = xorStateHashes(xored, hash2);
      expect(restored).toBe(hash1);
    });
  });

  describe('simpleHash', () => {
    it('should return same hash for same input', () => {
      expect(simpleHash('test')).toBe(simpleHash('test'));
    });

    it('should return different hashes for different inputs', () => {
      expect(simpleHash('hello')).not.toBe(simpleHash('world'));
    });

    it('should return positive numbers', () => {
      expect(simpleHash('any string')).toBeGreaterThanOrEqual(0);
    });
  });

  describe('StateHashBuilder', () => {
    it('should build a valid hash', () => {
      const builder = new StateHashBuilder();
      const hash = builder.addString('test').build();
      expect(isStateHash(hash)).toBe(true);
    });

    it('should be deterministic', () => {
      const builder1 = new StateHashBuilder();
      const builder2 = new StateHashBuilder();
      const hash1 = builder1.addString('test').addNumber(42).build();
      const hash2 = builder2.addString('test').addNumber(42).build();
      expect(hash1).toBe(hash2);
    });

    it('should reset builder', () => {
      const builder = new StateHashBuilder();
      const hash1 = builder.addString('test').build();
      builder.reset();
      const hash2 = builder.addString('test').build();
      expect(hash1).toBe(hash2);
    });
  });
});
