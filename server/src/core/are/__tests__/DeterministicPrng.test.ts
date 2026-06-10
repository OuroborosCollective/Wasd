import { describe, it, expect } from 'vitest';
import {
  LcgPrng,
  Mulberry32,
  createDeterministicPrng,
  deriveSeed,
  deriveSeedFromString
} from '../DeterministicPrng';

describe('DeterministicPrng', () => {
  describe('LcgPrng', () => {
    it('should create with number seed', () => {
      const prng = new LcgPrng(42);
      expect(prng).toBeDefined();
    });

    it('should create with bigint seed', () => {
      const prng = new LcgPrng(42n);
      expect(prng).toBeDefined();
    });

    it('should throw for negative seed', () => {
      expect(() => new LcgPrng(-1)).toThrow();
      expect(() => new LcgPrng(-1n)).toThrow();
    });

    it('should generate positive integers', () => {
      const prng = new LcgPrng(42);
      for (let i = 0; i < 100; i++) {
        const val = prng.nextInt();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(4294967296);
      }
    });

    it('should generate floats in [0, 1)', () => {
      const prng = new LcgPrng(42);
      for (let i = 0; i < 100; i++) {
        const val = prng.nextFloat();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('should generate integers in range', () => {
      const prng = new LcgPrng(42);
      for (let i = 0; i < 100; i++) {
        const val = prng.nextIntRange(5, 10);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThanOrEqual(10);
      }
    });

    it('should return same value for same seed', () => {
      const prng1 = new LcgPrng(42);
      const prng2 = new LcgPrng(42);
      
      for (let i = 0; i < 100; i++) {
        expect(prng1.nextInt()).toBe(prng2.nextInt());
      }
    });

    it('should produce different sequences for different seeds', () => {
      const prng1 = new LcgPrng(42);
      const prng2 = new LcgPrng(43);
      
      let different = false;
      for (let i = 0; i < 100; i++) {
        if (prng1.nextInt() !== prng2.nextInt()) {
          different = true;
          break;
        }
      }
      expect(different).toBe(true);
    });

    it('should get and clone state', () => {
      const prng = new LcgPrng(42);
      prng.nextInt();
      prng.nextInt();
      
      const state = prng.getState();
      const clone = prng.clone();
      
      expect(prng.nextInt()).toBe(clone.nextInt());
    });

    it('should serialize and deserialize', () => {
      const prng = new LcgPrng(42);
      prng.nextInt();
      prng.nextInt();
      
      const serialized = prng.serialize();
      const restored = LcgPrng.deserialize(serialized);
      
      expect(prng.nextInt()).toBe(restored.nextInt());
    });

    it('should throw for invalid range', () => {
      const prng = new LcgPrng(42);
      expect(() => prng.nextIntRange(10, 5)).toThrow();
    });
  });

  describe('Mulberry32', () => {
    it('should create with seed', () => {
      const prng = new Mulberry32(42);
      expect(prng).toBeDefined();
    });

    it('should throw for invalid seed', () => {
      expect(() => new Mulberry32(-1)).toThrow();
    });

    it('should generate positive integers', () => {
      const prng = new Mulberry32(42);
      for (let i = 0; i < 100; i++) {
        const val = prng.nextInt();
        expect(val).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return same value for same seed', () => {
      const prng1 = new Mulberry32(42);
      const prng2 = new Mulberry32(42);
      
      for (let i = 0; i < 100; i++) {
        expect(prng1.nextInt()).toBe(prng2.nextInt());
      }
    });

    it('should clone correctly', () => {
      const prng = new Mulberry32(42);
      prng.nextInt();
      prng.nextInt();
      
      const clone = prng.clone();
      
      expect(prng.nextInt()).toBe(clone.nextInt());
    });
  });

  describe('createDeterministicPrng', () => {
    it('should create an LcgPrng by default', () => {
      const prng = createDeterministicPrng(42);
      expect(prng).toBeInstanceOf(LcgPrng);
    });

    it('should produce deterministic sequence', () => {
      const prng = createDeterministicPrng(12345);
      const values = [];
      for (let i = 0; i < 10; i++) {
        values.push(prng.nextInt());
      }
      
      const prng2 = createDeterministicPrng(12345);
      for (let i = 0; i < 10; i++) {
        expect(prng2.nextInt()).toBe(values[i]);
      }
    });
  });

  describe('deriveSeed', () => {
    it('should combine multiple values', () => {
      const seed1 = deriveSeed(1, 2, 3);
      const seed2 = deriveSeed(1, 2, 3);
      const seed3 = deriveSeed(1, 2, 4);
      
      expect(seed1).toBe(seed2);
      expect(seed1).not.toBe(seed3);
    });

    it('should produce positive seeds', () => {
      const seed = deriveSeed(-5, -10, -15);
      expect(seed).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty array', () => {
      const seed = deriveSeed();
      expect(seed).toBe(0);
    });
  });

  describe('deriveSeedFromString', () => {
    it('should hash string to number', () => {
      const seed1 = deriveSeedFromString('hello');
      const seed2 = deriveSeedFromString('world');
      
      expect(seed1).not.toBe(seed2);
    });

    it('should return same seed for same string', () => {
      const seed1 = deriveSeedFromString('test');
      const seed2 = deriveSeedFromString('test');
      expect(seed1).toBe(seed2);
    });

    it('should produce positive seeds', () => {
      const seed = deriveSeedFromString('any string');
      expect(seed).toBeGreaterThanOrEqual(0);
    });
  });
});