/**
 * ARELORIA CORE: Branded Types
 *
 * Branded types prevent mixing values that semantically differ even if they
 * share the same underlying primitive type.
 *
 * Core invariants:
 * - Kappa: fixed-point integer representation.
 * - 1 world unit = 1000 Kappa.
 * - TickId: monotonic non-negative simulation tick.
 * - StateHash: deterministic 64-char hex state fingerprint.
 * - ChunkCoord: deterministic signed integer chunk coordinate.
 * - ChunkKey: canonical "cx:cz" chunk identifier.
 * - MortonCode: deterministic Z-order spatial key.
 *
 * No Date.now().
 * No Math.random().
 * No floating-point simulation state after boundary conversion.
 */

import { KAPPA } from "./Kappa";

// =============================================================================
// Shared Guards
// =============================================================================

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`[${label}] Expected safe integer, got: ${value}`);
  }
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`[${label}] Expected finite number, got: ${value}`);
  }
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`[${label}] Expected integer, got: ${value}`);
  }
}

function assertNonEmptyString(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`[${label}] Expected non-empty string`);
  }
}

// =============================================================================
// Kappa - Fixed-Point Integer Representation
// =============================================================================

/**
 * Kappa: fixed-point integer representation.
 *
 * Scale:
 * 1 world unit = 1000 Kappa
 *
 * Example:
 * 1.57 world units = 1570 Kappa
 */
export type Kappa = number & { readonly __brand: "Kappa" };

/**
 * KappaInt: raw integer type used in Kappa operations.
 */
export type KappaInt = number & { readonly __brand: "KappaInt" };

/**
 * Create a Kappa value from an already-scaled integer.
 */
export function createKappa(value: number): Kappa {
  assertInteger(value, "Kappa");
  assertSafeInteger(value, "Kappa");

  return value as Kappa;
}

/**
 * Create a KappaInt value from an integer.
 */
export function createKappaInt(value: number): KappaInt {
  assertInteger(value, "KappaInt");
  assertSafeInteger(value, "KappaInt");

  return value as KappaInt;
}

/**
 * Convert external world-unit input into Kappa.
 *
 * Boundary adapter semantics:
 * - fractional world-unit input is rounded to the nearest Kappa
 * - preserves backward-compatible createKappaFromDecimal behavior
 * - internal simulation logic must operate on already-integer Kappa values
 *
 * Examples:
 * - 3.14159 -> 3142
 * - 3.4999  -> 3500
 */
export function createKappaFromWorldUnits(value: number): Kappa {
  assertFiniteNumber(value, "Kappa.fromWorldUnits");

  const scaled = Math.round(value * KAPPA);
  assertSafeInteger(scaled, "Kappa.fromWorldUnits.scaled");

  return scaled as Kappa;
}

/**
 * Backward-compatible alias.
 *
 * Existing behavior is nearest-Kappa rounding.
 */
export function createKappaFromDecimal(value: number): Kappa {
  return createKappaFromWorldUnits(value);
}

/**
 * Convert Kappa back to a display number.
 *
 * Use only for UI/debug/output adapters, never as simulation input.
 */
export function kappaToWorldUnits(value: Kappa | KappaInt): number {
  return Number(value) / KAPPA;
}

// =============================================================================
// TickId - Monotonically Increasing Tick Counter
// =============================================================================

/**
 * TickId: unique identifier for a simulation tick.
 *
 * Must be a non-negative safe integer.
 */
export type TickId = number & { readonly __brand: "TickId" };

export function createTickId(value: number): TickId {
  assertInteger(value, "TickId");
  assertSafeInteger(value, "TickId");

  if (value < 0) {
    throw new Error(`[TickId] Invalid tick ID: ${value}. Must be non-negative.`);
  }

  return value as TickId;
}

export function incrementTickId(tick: TickId): TickId {
  return createTickId(Number(tick) + 1);
}

// =============================================================================
// StateHash - Deterministic State Fingerprint
// =============================================================================

/**
 * StateHash: deterministic 64-character hex state fingerprint.
 */
export type StateHash = string & { readonly __brand: "StateHash" };

const STATE_HASH_PATTERN = /^[0-9a-f]{64}$/i;

export function createStateHash(value: string): StateHash {
  if (!STATE_HASH_PATTERN.test(value)) {
    const preview = value.length > 16 ? `${value.slice(0, 16)}...` : value;
    throw new Error(
      `[StateHash] Invalid hash format: ${preview}. Expected 64 hex chars.`,
    );
  }

  return value.toLowerCase() as StateHash;
}

export function isStateHash(value: unknown): value is StateHash {
  return typeof value === "string" && STATE_HASH_PATTERN.test(value);
}

export const GENESIS_STATE_HASH: StateHash = createStateHash("0".repeat(64));

// =============================================================================
// Chunk Coordinates
// =============================================================================

/**
 * ChunkCoord: integer chunk coordinate.
 */
export type ChunkCoord = number & { readonly __brand: "ChunkCoord" };

/**
 * ChunkKey: canonical string key for chunk lookup.
 *
 * Format:
 * "cx:cz"
 */
export type ChunkKey = string & { readonly __brand: "ChunkKey" };

export interface ParsedChunkKey {
  readonly cx: ChunkCoord;
  readonly cz: ChunkCoord;
}

export function createChunkCoord(value: number): ChunkCoord {
  assertInteger(value, "ChunkCoord");
  assertSafeInteger(value, "ChunkCoord");

  return value as ChunkCoord;
}

export function createChunkKey(cx: number, cz: number): ChunkKey {
  const safeCx = createChunkCoord(cx);
  const safeCz = createChunkCoord(cz);

  return `${safeCx}:${safeCz}` as ChunkKey;
}

export function isChunkKey(value: unknown): value is ChunkKey {
  if (typeof value !== "string") return false;

  const parts = value.split(":");
  if (parts.length !== 2) return false;

  const cx = Number(parts[0]);
  const cz = Number(parts[1]);

  return Number.isSafeInteger(cx) && Number.isSafeInteger(cz);
}

export function parseChunkKey(key: ChunkKey): ParsedChunkKey {
  const parts = String(key).split(":");

  if (parts.length !== 2) {
    throw new Error(`[ChunkKey] Invalid chunk key format: ${String(key)}`);
  }

  const cx = Number(parts[0]);
  const cz = Number(parts[1]);

  return Object.freeze({
    cx: createChunkCoord(cx),
    cz: createChunkCoord(cz),
  });
}

// =============================================================================
// Morton Code - Z-Order Curve Encoding
// =============================================================================

/**
 * MortonCode: Z-order curve encoding for spatial indexing.
 *
 * Kept as number for compatibility with existing callers.
 *
 * Note:
 * JavaScript bitwise operations are signed 32-bit. This implementation is safe
 * for coordinates in the 16-bit range. For full signed 32-bit coordinates, use
 * the dedicated spatial/MortonCode module if present.
 */
export type MortonCode = number & { readonly __brand: "MortonCode" };

/**
 * Create a MortonCode from chunk coordinates.
 */
export function createMortonCode(cx: number, cz: number): MortonCode {
  const x = encodeMortonInput(cx, "MortonCode.cx");
  const z = encodeMortonInput(cz, "MortonCode.cz");
  const code = encodeMorton16(x, z);

  return code as MortonCode;
}

/**
 * Decode a Morton code back to x,z coordinates.
 */
export function decodeMorton(morton: number): { readonly x: number; readonly z: number } {
  assertInteger(morton, "MortonCode.decode.input");
  assertSafeInteger(morton, "MortonCode.decode.input");

  let x = 0;
  let z = 0;

  for (let bit = 0; bit < 16; bit += 1) {
    x |= ((morton >>> (bit * 2)) & 1) << bit;
    z |= ((morton >>> (bit * 2 + 1)) & 1) << bit;
  }

  return Object.freeze({ x, z });
}

function encodeMortonInput(value: number, label: string): number {
  assertInteger(value, label);
  assertSafeInteger(value, label);

  if (value < 0 || value > 0xffff) {
    throw new Error(
      `[${label}] MortonCode number compatibility mode expects 0..65535, got: ${value}`,
    );
  }

  return value;
}

function encodeMorton16(x: number, z: number): number {
  let morton = 0;

  for (let bit = 0; bit < 16; bit += 1) {
    morton |= ((x >>> bit) & 1) << (bit * 2);
    morton |= ((z >>> bit) & 1) << (bit * 2 + 1);
  }

  return morton;
}

// =============================================================================
// Entity ID Types
// =============================================================================

export type EntityId = string & { readonly __brand: "EntityId" };

export function createEntityId(value: string): EntityId {
  assertNonEmptyString(value, "EntityId");

  return value as EntityId;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Each chunk is 64 × 64 logical tiles.
 */
export const CHUNK_SIZE = 64 as const;

/**
 * Each chunk has 4,096 logical tiles.
 */
export const CHUNK_TILE_COUNT = CHUNK_SIZE * CHUNK_SIZE;

/**
 * Chunk side length in Kappa units.
 *
 * 64 world units × 1000 Kappa = 64,000 Kappa.
 */
export const CHUNK_SIZE_KAPPA: KappaInt = createKappaInt(CHUNK_SIZE * KAPPA);

/**
 * Full Kappa-cell count per chunk plane.
 *
 * 64,000 × 64,000 = 4,096,000,000 Kappa cells.
 */
export const CHUNK_KAPPA_CELL_COUNT =
  BigInt(Number(CHUNK_SIZE_KAPPA)) * BigInt(Number(CHUNK_SIZE_KAPPA));
