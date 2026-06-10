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
export function encodeMorton(x: number, z: number): number {
  let morton = 0;
  for (let i = 0; i < 16; i++) {
    morton |= ((x & (1 << i)) << i) | ((z & (1 << i)) << (i + 1));
  }
  return morton >>> 0; // Ensure unsigned
}

/**
 * Decode a Morton code back to x,z coordinates.
 * 
 * @param morton - Morton code
 * @returns Object with x and z coordinates
 */
export function decodeMorton(morton: number): { x: number; z: number } {
  let x = 0;
  let z = 0;
  for (let i = 0; i < 16; i++) {
    x |= (morton >>> (i * 2)) & (1 << i);
    z |= (morton >>> (i * 2 + 1)) & (1 << i);
  }
  return { x, z };
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