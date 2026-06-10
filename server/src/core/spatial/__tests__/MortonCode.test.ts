import { describe, it, expect } from 'vitest';
import {
  encodeMorton,
  decodeMorton,
  MortonCode,
  chunkKeyToMorton,
  mortonToChunkKey,
  mortonDistance,
  mortonMidpoint,
  isMortonInRange,
  getMortonBounds,
  MortonCodeRange
} from '../MortonCode';

describe('MortonCode', () => {
  describe('encodeMorton', () => {
    it('should encode origin correctly', () => {
      expect(encodeMorton(0, 0)).toBe(0);
    });

    it('should encode positive coordinates', () => {
      const code = encodeMorton(1, 0);
      expect(code).toBeGreaterThan(0);
    });

    it('should encode different coordinates differently', () => {
      const code1 = encodeMorton(5, 10);
      const code2 = encodeMorton(10, 5);
      expect(code1).not.toBe(code2);
    });

    it('should maintain spatial locality', () => {
      const code0 = encodeMorton(0, 0);
      const code1 = encodeMorton(1, 0);
      const code2 = encodeMorton(2, 0);
      expect(code1).toBeGreaterThan(code0);
      expect(code2).toBeGreaterThan(code1);
    });
  });

  describe('decodeMorton', () => {
    it('should decode origin correctly', () => {
      const { x, z } = decodeMorton(0);
      expect(x).toBe(0);
      expect(z).toBe(0);
    });

    it('should round-trip encode/decode', () => {
      const original = { x: 123, z: 456 };
      const code = encodeMorton(original.x, original.z);
      const decoded = decodeMorton(code);
      expect(decoded.x).toBe(original.x);
      expect(decoded.z).toBe(original.z);
    });
  });

  describe('MortonCode class', () => {
    it('should create from coordinates', () => {
      const mc = MortonCode.fromCoords(100, 200);
      expect(mc.x()).toBe(100);
      expect(mc.z()).toBe(200);
    });

    it('should create from chunk key', () => {
      const mc = MortonCode.fromChunkKey('10:-5' as any);
      expect(mc.x()).toBe(10);
      expect(mc.z()).toBe(-5);
    });

    it('should convert back to chunk key', () => {
      const mc = MortonCode.fromCoords(7, 8);
      const key = mc.toChunkKey();
      expect(key).toBe('7:8');
    });

    it('should compare correctly', () => {
      const mc1 = MortonCode.fromCoords(1, 0);
      const mc2 = MortonCode.fromCoords(2, 0);
      const mc3 = MortonCode.fromCoords(1, 0);
      
      expect(mc1.compare(mc2)).toBeLessThan(0);
      expect(mc2.compare(mc1)).toBeGreaterThan(0);
      expect(mc1.compare(mc3)).toBe(0);
    });

    it('should check equality', () => {
      const mc1 = MortonCode.fromCoords(5, 5);
      const mc2 = MortonCode.fromCoords(5, 5);
      const mc3 = MortonCode.fromCoords(5, 6);
      
      expect(mc1.equals(mc2)).toBe(true);
      expect(mc1.equals(mc3)).toBe(false);
    });

    it('should clone correctly', () => {
      const mc1 = MortonCode.fromCoords(42, 42);
      const mc2 = mc1.clone();
      expect(mc1.equals(mc2)).toBe(true);
      expect(mc1).not.toBe(mc2);
    });
  });

  describe('chunkKeyToMorton and mortonToChunkKey', () => {
    it('should round-trip correctly', () => {
      const key = '100:-200';
      const code = chunkKeyToMorton(key as any);
      const restored = mortonToChunkKey(code);
      expect(restored).toBe(key);
    });
  });

  describe('mortonDistance', () => {
    it('should return 0 for same code', () => {
      const code = encodeMorton(5, 5);
      expect(mortonDistance(code, code)).toBe(0);
    });

    it('should return positive distance for different codes', () => {
      const code1 = encodeMorton(0, 0);
      const code2 = encodeMorton(100, 100);
      expect(mortonDistance(code1, code2)).toBeGreaterThan(0);
    });
  });

  describe('mortonMidpoint', () => {
    it('should return midpoint between two codes', () => {
      const code1 = encodeMorton(0, 0);
      const code2 = encodeMorton(10, 10);
      const mid = mortonMidpoint(code1, code2);
      expect(mid).toBeGreaterThan(code1);
      expect(mid).toBeLessThan(code2);
    });
  });

  describe('isMortonInRange', () => {
    it('should return true for code in range', () => {
      const min = encodeMorton(0, 0);
      const max = encodeMorton(10, 10);
      const mid = encodeMorton(5, 5);
      expect(isMortonInRange(mid, min, max)).toBe(true);
    });

    it('should return false for code outside range', () => {
      const min = encodeMorton(0, 0);
      const max = encodeMorton(10, 10);
      const outside = encodeMorton(20, 20);
      expect(isMortonInRange(outside, min, max)).toBe(false);
    });
  });

  describe('getMortonBounds', () => {
    it('should return correct bounds', () => {
      const [min, max] = getMortonBounds(0, 0, 10, 10);
      expect(min).toBeLessThan(max);
    });
  });

  describe('MortonCodeRange', () => {
    it('should create with valid range', () => {
      const range = new MortonCodeRange(100, 200);
      expect(range.minCode).toBe(100);
      expect(range.maxCode).toBe(200);
    });

    it('should throw for invalid range', () => {
      expect(() => new MortonCodeRange(200, 100)).toThrow();
    });

    it('should check containment', () => {
      const range = new MortonCodeRange(100, 200);
      expect(range.contains(150)).toBe(true);
      expect(range.contains(50)).toBe(false);
      expect(range.contains(300)).toBe(false);
    });

    it('should check intersection', () => {
      const range1 = new MortonCodeRange(100, 200);
      const range2 = new MortonCodeRange(150, 250);
      const range3 = new MortonCodeRange(300, 400);
      
      expect(range1.intersects(range2)).toBe(true);
      expect(range1.intersects(range3)).toBe(false);
    });

    it('should calculate size', () => {
      const range = new MortonCodeRange(100, 200);
      expect(range.size()).toBe(101);
    });
  });
});