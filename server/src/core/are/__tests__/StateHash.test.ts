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
      expect(() => createStateHash('g'.repeat(64))).toThrow(); // g is not hex
      expect(() => createStateHash('a'.repeat(63) + 'g')).toThrow();
    });

    it('should accept lowercase hex', () => {
      const hash = createStateHash('abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd');
      expect(hash).toBeDefined();
    });

    it('should accept uppercase hex', () => {
      const hash = createStateHash('ABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD');
      expect(hash).toBeDefined();
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
      // aa XOR ff = 55
      expect(result).toBe('55'.repeat(32));
    });

    it('should throw for different lengths', () => {
      const hash1 = createStateHash('a'.repeat(64));
      const hash2 = createStateHash('a'.repeat(63) + 'aa');
      expect(() => xorStateHashes(hash1, hash2)).toThrow();
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
    it('should build hash from string', () => {
      const builder = new StateHashBuilder();
      builder.addString('test');
      const hash = builder.build();
      expect(isStateHash(hash)).toBe(true);
    });

    it('should build hash from number', () => {
      const builder = new StateHashBuilder();
      builder.addNumber(42);
      const hash = builder.build();
      expect(isStateHash(hash)).toBe(true);
    });

    it('should build hash from boolean', () => {
      const builder = new StateHashBuilder();
      builder.addBoolean(true);
      builder.addBoolean(false);
      const hash = builder.build();
      expect(isStateHash(hash)).toBe(true);
    });

    it('should build hash from array', () => {
      const builder = new StateHashBuilder();
      builder.addArray([1, 2, 3]);
      const hash = builder.build();
      expect(isStateHash(hash)).toBe(true);
    });

    it('should build hash from object', () => {
      const builder = new StateHashBuilder();
      builder.addObject({ a: 1, b: 2 });
      const hash = builder.build();
      expect(isStateHash(hash)).toBe(true);
    });

    it('should produce consistent hashes', () => {
      const builder1 = new StateHashBuilder();
      builder1.addString('hello');
      builder1.addNumber(42);

      const builder2 = new StateHashBuilder();
      builder2.addString('hello');
      builder2.addNumber(42);

      expect(builder1.build()).toBe(builder2.build());
    });

    it('should produce different hashes for different data', () => {
      const builder1 = new StateHashBuilder();
      builder1.addString('hello');

      const builder2 = new StateHashBuilder();
      builder2.addString('world');

      expect(builder1.build()).not.toBe(builder2.build());
    });

    it('should reset correctly', () => {
      const builder = new StateHashBuilder();
      builder.addString('test');
      const hash1 = builder.build();
      
      builder.reset();
      builder.addString('different');
      const hash2 = builder.build();
      
      expect(hash1).not.toBe(hash2);
    });

    it('should sort object keys deterministically', () => {
      const builder1 = new StateHashBuilder();
      builder1.addObject({ b: 2, a: 1 });

      const builder2 = new StateHashBuilder();
      builder2.addObject({ a: 1, b: 2 });

      expect(builder1.build()).toBe(builder2.build());
    });

    it('should chain method calls', () => {
      const builder = new StateHashBuilder();
      const hash = builder
        .addString('hello')
        .addNumber(42)
        .addBoolean(true)
        .build();
      
      expect(isStateHash(hash)).toBe(true);
    });
  });
});