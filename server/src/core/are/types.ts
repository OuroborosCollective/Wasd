/**
 * ARELORIA CORE: Branded Types
 * 
 * Branded types prevent mixing values that semantically differ
 * even if they share the same underlying primitive type.
 * 
 * This module establishes type-level guarantees for:
 * - Kappa: Fixed-point integer representation (1 world unit = 1000 Kappa)
 * - TickId: Monotonically increasing tick counter
 * - StateHash: SHA-256 derived hash string (64 hex chars)
 * - ChunkCoord: Integer chunk coordinate
 * - ChunkKey: String chunk key (format: "cx:cz")
 */

import { KAPPA } from './Kappa';

// =============================================================================
// Kappa - Fixed-Point Integer Representation
// =============================================================================

/**
 * Kappa: Fixed-point integer representation for world positions and calculations.
 * 
 * Scale: 1 world unit = 1000 Kappa
 * 
 * This ensures all simulation math uses integers only, preventing floating-point
 * nondeterminism across different platforms.
 */
export type Kappa = number & { readonly __brand: "Kappa" };

/**
 * KappaInt: The raw integer type used in Kappa operations.
 * This is the underlying type that all kappa functions operate on.
 */
export type KappaInt = number & { readonly __brand: "KappaInt" };

/**
 * Create a Kappa value from a number.
 * Ensures the value is a safe integer.
 */
export function createKappa(value: number): Kappa {
  if (!Number.isInteger(value)) {
    throw new Error(`[Kappa] Cannot create Kappa from non-integer: ${value}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new Error(`[Kappa] Unsafe integer: ${value}`);
  }
  return value as Kappa;
}

/**
 * Create a Kappa value from a decimal input.
 * Rounds to the nearest Kappa.
 */
export function createKappaFromDecimal(value: number): Kappa {
  const scaled = Math.round(value * KAPPA);
  if (!Number.isSafeInteger(scaled)) {
    throw new Error(`[Kappa] Decimal conversion resulted in unsafe integer: ${value}`);
  }
  return scaled as Kappa;
}

// =============================================================================
// TickId - Monotonically Increasing Tick Counter
// =============================================================================

/**
 * TickId: Unique identifier for a simulation tick.
 * 
 * Must be a non-negative integer.
 * Used to ensure ordered, deterministic tick processing.
 */
export type TickId = number & { readonly __brand: "TickId" };

/**
 * Create a TickId from a number.
 * Validates that it's a non-negative integer.
 */
export function createTickId(value: number): TickId {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`[TickId] Invalid tick ID: ${value} (must be non-negative integer)`);
  }
  return value as TickId;
}

/**
 * Increment a TickId by 1.
 */
export function incrementTickId(tick: TickId): TickId {
  return createTickId(tick + 1);
}

// =============================================================================
// StateHash - Deterministic State Fingerprint
// =============================================================================

/**
 * StateHash: SHA-256 derived hash string.
 * 
 * Format: 64 hexadecimal characters.
 * Used for:
 * - Replay verification
 * - Divergence detection
 * - State comparison
 */
export type StateHash = string & { readonly __brand: "StateHash" };

/**
 * Create a StateHash from a 64-character hex string.
 * Validates format before branding.
 */
export function createStateHash(value: string): StateHash {
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error(`[StateHash] Invalid hash format: ${value.substring(0, 16)}... (expected 64 hex chars)`);
  }
  return value as StateHash;
}

/**
 * Verify a value is a valid StateHash.
 */
export function isStateHash(value: unknown): value is StateHash {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

/**
 * GENESIS_STATE_HASH - Initial state before any ticks
 */
export const GENESIS_STATE_HASH: StateHash = '0'.repeat(64) as StateHash;

// =============================================================================
// Chunk Coordinates
// =============================================================================

/**
 * ChunkCoord: Integer chunk coordinate.
 * 
 * Chunks are grid cells used for spatial partitioning.
 * Each chunk covers SPATIAL_CHUNK_SIZE tiles.
 */
export type ChunkCoord = number & { readonly __brand: "ChunkCoord" };

/**
 * ChunkKey: String key for chunk lookup.
 * 
 * Format: "cx:cz" where cx and cz are chunk coordinates.
 * This is the canonical format for chunk identification.
 */
export type ChunkKey = string & { readonly __brand: "ChunkKey" };

/**
 * Create a ChunkCoord from a number.
 */
export function createChunkCoord(value: number): ChunkCoord {
  if (!Number.isInteger(value)) {
    throw new Error(`[ChunkCoord] Cannot create from non-integer: ${value}`);
  }
  return value as ChunkCoord;
}

/**
 * Create a ChunkKey from chunk coordinates.
 */
export function createChunkKey(cx: number, cz: number): ChunkKey {
  if (!Number.isInteger(cx) || !Number.isInteger(cz)) {
    throw new Error(`[ChunkKey] Cannot create from non-integers: ${cx}, ${cz}`);
  }
  return `${cx}:${cz}` as ChunkKey;
}

/**
 * Parse a ChunkKey back to coordinates.
 */
export function parseChunkKey(key: ChunkKey): { cx: ChunkCoord; cz: ChunkCoord } {
  const parts = key.split(':');
  if (parts.length !== 2) {
    throw new Error(`[ChunkKey] Invalid chunk key format: ${key}`);
  }
  const cx = parseInt(parts[0], 10);
  const cz = parseInt(parts[1], 10);
  if (isNaN(cx) || isNaN(cz)) {
    throw new Error(`[ChunkKey] Invalid chunk key coordinates: ${key}`);
  }
  return {
    cx: createChunkCoord(cx),
    cz: createChunkCoord(cz)
  };
}

// =============================================================================
// Morton Code - Z-Order Curve Encoding
// =============================================================================

/**
 * MortonCode: Z-order curve encoding for spatial indexing.
 * 
 * Used for efficient spatial queries and cache-friendly data access.
 * A Morton code interleaves the bits of x and z coordinates.
 */
export type MortonCode = number & { readonly __brand: "MortonCode" };

/**
 * Create a MortonCode from chunk coordinates.
 */
export function createMortonCode(cx: number, cz: number): MortonCode {
  const code = encodeMorton(cx, cz);
  return code as MortonCode;
}

// =============================================================================
// Entity ID Types
// =============================================================================

/**
 * EntityId: Unique identifier for a game entity.
 */
export type EntityId = string & { readonly __brand: "EntityId" };

/**
 * Create an EntityId from a string.
 */
export function createEntityId(value: string): EntityId {
  if (!value || value.length === 0) {
    throw new Error(`[EntityId] Cannot create from empty string`);
  }
  return value as EntityId;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Encode x,z coordinates into a Morton code (Z-order curve).
 * Interleaves the bits of x and z for cache-friendly spatial access.
 */
function encodeMorton(x: number, z: number): number {
  // Based on "Numerical Recipes" method for bit interleaving
  let morton = 0;
  for (let i = 0; i < 32; i++) {
    morton |= ((x & (1 << i)) << i) | ((z & (1 << i)) << (i + 1));
  }
  return morton;
}

/**
 * Decode a Morton code back to x,z coordinates.
 */
export function decodeMorton(morton: number): { x: number; z: number } {
  let x = 0;
  let z = 0;
  for (let i = 0; i < 32; i++) {
    x |= (morton >>> i) & (1 << i);
    z |= (morton >>> (i + 1)) & (1 << i);
  }
  return { x, z };
}

// =============================================================================
// Constants
// =============================================================================

/**
 * CHUNK_SIZE: Each chunk is 64 tiles × 64 tiles (4,096 tiles per chunk).
 * Used for Spatial Plexity (Axiom 4) - spatial filtering for broadcasts.
 */
export const CHUNK_SIZE = 64 as const;

/**
 * CHUNK_SIZE_KAPPA: Chunk size in Kappa units per side (64,000).
 * A chunk contains 64,000 × 64,000 = 4,096,000,000 discrete Kappa cells.
 */
export const CHUNK_SIZE_KAPPA = CHUNK_SIZE * KAPPA;