/**
 * ARELORIA CORE: Morton Code (Z-Order Curve)
 * 
 * Morton codes provide a way to map 2D coordinates to a 1D index
 * that preserves spatial locality. This is useful for:
 * 
 * - Cache-efficient spatial data structures
 * - Range queries on spatial data
 * - Deterministic ordering of spatial entities
 * 
 * The Z-order curve visits points in a way that keeps nearby points
 * close together in the 1D ordering.
 */

import type { ChunkCoord, ChunkKey } from '../are/types';

/**
 * Encode two integer coordinates into a Morton code using bit interleaving.
 * 
 * The bit interleaving works as follows:
 * - Take the binary representation of x and z
 * - Interleave the bits: x0, z0, x1, z1, x2, z2, ...
 * - This creates a Z-pattern through the 2D space
 * 
 * @param x - X coordinate (e.g., chunk X)
 * @param z - Z coordinate (e.g., chunk Z)
 * @returns Morton code (32-bit integer)
 */
// Bolt: Fast bit-wise dilation/spreading for lower 16 bits to 32 bits (interleaving with 0)
// Uses binary magic splits: spreads x to even bits (0, 2, 4, ..., 30)
function dilate16(x: number): number {
  x &= 0xffff;
  x = (x | (x << 8)) & 0x00ff00ff;
  x = (x | (x << 4)) & 0x0f0f0f0f;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;
  return x;
}

// Bolt: Fast bit-wise undilation/compaction for interleaved bits back to 16 bits
function undilate16(x: number): number {
  x &= 0x55555555;
  x = (x | (x >>> 1)) & 0x33333333;
  x = (x | (x >>> 2)) & 0x0f0f0f0f;
  x = (x | (x >>> 4)) & 0x00ff00ff;
  x = (x | (x >>> 8)) & 0x0000ffff;
  return x;
}

export function encodeMorton(x: number, z: number): number {
  // Bolt: O(1) loop-free interleaving. Spreads x to even bits, z to odd bits.
  return ((dilate16(x) | (dilate16(z) << 1)) >>> 0);
}

/**
 * Decode a Morton code back to x,z coordinates.
 * 
 * @param morton - Morton code
 * @returns Object with x and z coordinates
 */
export function decodeMorton(morton: number): { x: number; z: number } {
  // Bolt: O(1) loop-free bit undilation. Compacts even and odd bits back to 16-bit coordinates.
  const x = undilate16(morton);
  const z = undilate16(morton >>> 1);
  // Bolt: Sign-extend from 16-bit to 32-bit signed integer to support negative coordinates
  return {
    x: (x << 16) >> 16,
    z: (z << 16) >> 16
  };
}

/**
 * MortonCode class for more complex Morton code operations.
 */
export class MortonCode {
  private readonly code: number;

  constructor(code: number) {
    this.code = code >>> 0;
  }

  /**
   * Get the raw Morton code value.
   */
  value(): number {
    return this.code;
  }

  /**
   * Get the decoded x coordinate.
   */
  x(): number {
    return decodeMorton(this.code).x;
  }

  /**
   * Get the decoded z coordinate.
   */
  z(): number {
    return decodeMorton(this.code).z;
  }

  /**
   * Get both coordinates.
   */
  coords(): { x: number; z: number } {
    return decodeMorton(this.code);
  }

  /**
   * Clone this MortonCode.
   */
  clone(): MortonCode {
    return new MortonCode(this.code);
  }

  /**
   * Create a MortonCode from x,z coordinates.
   */
  static fromCoords(x: number, z: number): MortonCode {
    return new MortonCode(encodeMorton(x, z));
  }

  /**
   * Create a MortonCode from a chunk key.
   */
  static fromChunkKey(key: ChunkKey): MortonCode {
    const parts = key.split(':');
    const cx = parseInt(parts[0], 10);
    const cz = parseInt(parts[1], 10);
    return MortonCode.fromCoords(cx, cz);
  }

  /**
   * Convert back to a chunk key.
   */
  toChunkKey(): ChunkKey {
    const { x, z } = decodeMorton(this.code);
    return `${x}:${z}` as ChunkKey;
  }

  /**
   * Compare two Morton codes for ordering.
   * Returns negative if this < other, positive if this > other, 0 if equal.
   */
  compare(other: MortonCode): number {
    return this.code - other.code;
  }

  /**
   * Check equality with another MortonCode.
   */
  equals(other: MortonCode): boolean {
    return this.code === other.code;
  }
}

/**
 * Encode a chunk key to a Morton code.
 */
export function chunkKeyToMorton(key: ChunkKey): number {
  const parts = key.split(':');
  const cx = parseInt(parts[0], 10);
  const cz = parseInt(parts[1], 10);
  return encodeMorton(cx, cz);
}

/**
 * Decode a Morton code to a chunk key.
 */
export function mortonToChunkKey(code: number): ChunkKey {
  const { x, z } = decodeMorton(code);
  return `${x}:${z}` as ChunkKey;
}

/**
 * Calculate the Morton code distance between two codes.
 * This is NOT the same as Euclidean distance - it's the Z-order distance.
 */
export function mortonDistance(code1: number, code2: number): number {
  return Math.abs(code1 - code2);
}

/**
 * Find the Morton code that is the midpoint between two codes.
 * Useful for spatial partitioning.
 */
export function mortonMidpoint(code1: number, code2: number): number {
  return ((code1 >>> 0) + (code2 >>> 0)) / 2;
}

/**
 * Check if a Morton code falls within a range [min, max].
 */
export function isMortonInRange(code: number, min: number, max: number): boolean {
  return code >= min && code <= max;
}

/**
 * Get the bounding Morton codes for a rectangular region.
 * Returns [minCode, maxCode] that bounds all chunks in the region.
 */
export function getMortonBounds(
  minCx: number, minCz: number,
  maxCx: number, maxCz: number
): [number, number] {
  const minCode = encodeMorton(minCx, minCz);
  const maxCode = encodeMorton(maxCx, maxCz);
  return [minCode, maxCode];
}

/**
 * MortonCodeRange: Represents a range of Morton codes for efficient range queries.
 */
export class MortonCodeRange {
  constructor(
    public readonly minCode: number,
    public readonly maxCode: number
  ) {
    if (minCode > maxCode) {
      throw new Error(`[MortonCodeRange] Invalid range: min(${minCode}) > max(${maxCode})`);
    }
  }

  /**
   * Check if a code falls within this range.
   */
  contains(code: number): boolean {
    return code >= this.minCode && code <= this.maxCode;
  }

  /**
   * Get the count of codes in this range (approximate).
   */
  size(): number {
    return this.maxCode - this.minCode + 1;
  }

  /**
   * Check if this range intersects with another range.
   */
  intersects(other: MortonCodeRange): boolean {
    return this.minCode <= other.maxCode && this.maxCode >= other.minCode;
  }
}