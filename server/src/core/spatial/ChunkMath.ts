/**
 * ARELORIA CORE: Chunk Math
 * 
 * Centralized chunk coordinate calculations with integer-only math.
 * All functions use integer arithmetic for deterministic behavior.
 * 
 * Key concepts:
 * - CHUNK_SIZE = 64 tiles per chunk
 * - Chunk coordinates are integer grid indices
 * - Tile coordinates are integer positions within the world
 */

import type { Kappa, ChunkCoord, ChunkKey } from '../are/types';
import { KAPPA } from '../are/Kappa';

export const CHUNK_SIZE_TILES = 64;
export const CHUNK_SIZE_KAPPA = CHUNK_SIZE_TILES * KAPPA; // 64000

// Backwards compatibility alias
export const CHUNK_SIZE = CHUNK_SIZE_TILES;

/**
 * Convert world-unit Kappa position to tile coordinate.
 */
export function kappaToTile(kappa: Kappa): number {
  return Math.trunc(Number(kappa) / KAPPA);
}

/**
 * Convert tile coordinate to Kappa.
 */
export function tileToKappa(tile: number): Kappa {
  return (tile * KAPPA) as Kappa;
}

/**
 * Convert tile coordinate to chunk coordinate.
 */
export function tileToChunkCoord(tile: number): ChunkCoord {
  return Math.trunc(tile / CHUNK_SIZE_TILES) as ChunkCoord;
}

/**
 * Convert Kappa to chunk coordinate.
 */
export function kappaToChunkCoord(kappa: Kappa): ChunkCoord {
  return tileToChunkCoord(kappaToTile(kappa));
}

/**
 * Get chunk key string from chunk coordinates.
 */
export function getChunkKey(cx: ChunkCoord, cz: ChunkCoord): string {
  return `${cx}:${cz}`;
}

/**
 * Parse chunk key to coordinates.
 */
export function parseChunkKey(key: string): { cx: ChunkCoord; cz: ChunkCoord } {
  const [cx, cz] = key.split(':').map(Number);
  return {
    cx: cx as ChunkCoord,
    cz: cz as ChunkCoord,
  };
}

/**
 * Get all chunk keys within a radius.
 * @param centerCx Center chunk X
 * @param centerCz Center chunk Z  
 * @param radiusChunks Radius in chunks (e.g., 1 = 3×3, 2 = 5×5)
 */
export function getChunkKeysInRadius(
  centerCx: ChunkCoord,
  centerCz: ChunkCoord,
  radiusChunks: number
): string[] {
  const keys: string[] = [];
  for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
    for (let dz = -radiusChunks; dz <= radiusChunks; dz++) {
      const cx = (Number(centerCx) + dx) as ChunkCoord;
      const cz = (Number(centerCz) + dz) as ChunkCoord;
      keys.push(getChunkKey(cx, cz));
    }
  }
  return keys;
}

/**
 * Compute chunk key from tile coordinates.
 * Uses integer division for deterministic behavior.
 * 
 * @param tileX - Tile X coordinate
 * @param tileZ - Tile Z coordinate
 * @param chunkSize - Size of each chunk (default: 64)
 * @returns Chunk key in format "cx:cz"
 */
export function computeChunkKey(tileX: number, tileZ: number, chunkSize: number = CHUNK_SIZE_TILES): ChunkKey {
  const cx = Math.floor(tileX / chunkSize);
  const cz = Math.floor(tileZ / chunkSize);
  return `${cx}:${cz}` as ChunkKey;
}

/**
 * Compute chunk coordinates from tile coordinates.
 * 
 * @param tileX - Tile X coordinate
 * @param tileZ - Tile Z coordinate
 * @param chunkSize - Size of each chunk (default: 64)
 * @returns Chunk coordinates
 */
export function computeChunkCoords(tileX: number, tileZ: number, chunkSize: number = CHUNK_SIZE): { cx: ChunkCoord; cz: ChunkCoord } {
  const cx = Math.floor(tileX / chunkSize);
  const cz = Math.floor(tileZ / chunkSize);
  return { cx: cx as ChunkCoord, cz: cz as ChunkCoord };
}

/**
 * Get the center tile coordinates of a chunk.
 * 
 * @param cx - Chunk X coordinate
 * @param cz - Chunk Z coordinate
 * @param chunkSize - Size of each chunk (default: 64)
 * @returns Center tile coordinates
 */
export function getChunkCenterTile(cx: number, cz: number, chunkSize: number = CHUNK_SIZE): { tileX: number; tileZ: number } {
  return {
    tileX: cx * chunkSize + Math.floor(chunkSize / 2),
    tileZ: cz * chunkSize + Math.floor(chunkSize / 2)
  };
}

/**
 * Get all chunk keys for an NxN grid centered on a chunk.
 * 
 * @param centerKey - Center chunk key
 * @param radius - Radius in chunks (e.g., radius=1 gives 3x3, radius=2 gives 5x5)
 * @returns Array of chunk keys in the grid
 */
export function getChunkGrid(centerKey: ChunkKey, radius: number): ChunkKey[] {
  const parts = centerKey.split(':');
  if (parts.length !== 2) {
    throw new Error(`[ChunkMath] Invalid chunk key format: ${centerKey}`);
  }
  
  const cx = parseInt(parts[0], 10);
  const cz = parseInt(parts[1], 10);
  
  const keys: ChunkKey[] = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      keys.push(`${cx + dx}:${cz + dz}` as ChunkKey);
    }
  }
  return keys;
}

/**
 * Get all 9 chunk keys for a 3x3 grid centered on the given chunk.
 * Returns keys in order: [NW, N, NE, W, C, E, SW, S, SE]
 * 
 * @param centerKey - Center chunk key
 * @returns Array of 9 chunk keys
 */
export function get3x3ChunkKeys(centerKey: ChunkKey): ChunkKey[] {
  return getChunkGrid(centerKey, 1);
}

/**
 * Get all 25 chunk keys for a 5x5 grid centered on the given chunk.
 * 
 * @param centerKey - Center chunk key
 * @returns Array of 25 chunk keys
 */
export function get5x5ChunkKeys(centerKey: ChunkKey): ChunkKey[] {
  return getChunkGrid(centerKey, 2);
}

/**
 * Check if two chunks are the same.
 * 
 * @param key1 - First chunk key
 * @param key2 - Second chunk key
 * @returns True if both keys refer to the same chunk
 */
export function isSameChunk(key1: ChunkKey, key2: ChunkKey): boolean {
  return key1 === key2;
}

/**
 * Check if two tile positions are in the same chunk.
 * 
 * @param tileX1 - First tile X
 * @param tileZ1 - First tile Z
 * @param tileX2 - Second tile X
 * @param tileZ2 - Second tile Z
 * @param chunkSize - Size of each chunk (default: 64)
 * @returns True if both positions are in the same chunk
 */
export function areInSameChunk(
  tileX1: number, tileZ1: number,
  tileX2: number, tileZ2: number,
  chunkSize: number = CHUNK_SIZE
): boolean {
  return computeChunkKey(tileX1, tileZ1, chunkSize) === computeChunkKey(tileX2, tileZ2, chunkSize);
}

/**
 * Calculate Manhattan distance between two chunks.
 * 
 * @param key1 - First chunk key
 * @param key2 - Second chunk key
 * @returns Manhattan distance in chunks
 */
export function chunkManhattanDistance(key1: ChunkKey, key2: ChunkKey): number {
  const parts1 = key1.split(':');
  const parts2 = key2.split(':');
  
  const cx1 = parseInt(parts1[0], 10);
  const cz1 = parseInt(parts1[1], 10);
  const cx2 = parseInt(parts2[0], 10);
  const cz2 = parseInt(parts2[1], 10);
  
  return Math.abs(cx1 - cx2) + Math.abs(cz1 - cz2);
}

/**
 * Calculate Euclidean distance between two chunk centers.
 * 
 * @param key1 - First chunk key
 * @param key2 - Second chunk key
 * @param chunkSize - Size of each chunk (default: 64)
 * @returns Euclidean distance in tiles
 */
export function chunkEuclideanDistance(
  key1: ChunkKey,
  key2: ChunkKey,
  chunkSize: number = CHUNK_SIZE
): number {
  const parts1 = key1.split(':');
  const parts2 = key2.split(':');
  
  const cx1 = parseInt(parts1[0], 10);
  const cz1 = parseInt(parts1[1], 10);
  const cx2 = parseInt(parts2[0], 10);
  const cz2 = parseInt(parts2[1], 10);
  
  const dx = (cx1 - cx2) * chunkSize;
  const dz = (cz1 - cz2) * chunkSize;
  
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Validate that a chunk key has the correct format.
 * 
 * @param key - Chunk key to validate
 * @returns True if valid
 */
export function isValidChunkKey(key: string): key is ChunkKey {
  if (typeof key !== 'string') return false;
  const parts = key.split(':');
  if (parts.length !== 2) return false;
  const cx = parseInt(parts[0], 10);
  const cz = parseInt(parts[1], 10);
  return !isNaN(cx) && !isNaN(cz) && Number.isInteger(cx) && Number.isInteger(cz);
}

/**
 * Get the bounding box of a set of chunk keys.
 * 
 * @param keys - Array of chunk keys
 * @returns Bounding box with min/max coordinates
 */
export function getChunkBoundingBox(keys: ChunkKey[]): {
  minCx: number;
  minCz: number;
  maxCx: number;
  maxCz: number;
  width: number;
  height: number;
} {
  if (keys.length === 0) {
    return { minCx: 0, minCz: 0, maxCx: 0, maxCz: 0, width: 0, height: 0 };
  }

  let minCx = Infinity;
  let minCz = Infinity;
  let maxCx = -Infinity;
  let maxCz = -Infinity;

  for (const key of keys) {
    const parts = key.split(':');
    const cx = parseInt(parts[0], 10);
    const cz = parseInt(parts[1], 10);
    minCx = Math.min(minCx, cx);
    minCz = Math.min(minCz, cz);
    maxCx = Math.max(maxCx, cx);
    maxCz = Math.max(maxCz, cz);
  }

  return {
    minCx,
    minCz,
    maxCx,
    maxCz,
    width: maxCx - minCx + 1,
    height: maxCz - minCz + 1
  };
}