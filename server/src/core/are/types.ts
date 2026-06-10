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
 * - ChunkCoord: deterministic signed 32-bit chunk coordinate.
 * - ChunkKey: canonical "cx:cz" chunk identifier.
 * - MortonCode: BigInt-backed Z-order spatial key.
 *
 * No Date.now().
 * No Math.random().
 * No floating-point simulation state.
 */

import { KAPPA } from "./Kappa.js";

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

function assertSignedInt32(value: number, label: string): void {
  assertSafeInteger(value, label);

  if (value < -2_147_483_648 || value > 2_147_483_647) {
    throw new Error(`[${label}] Expected signed 32-bit integer, got: ${value}`);
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
  assertSafeInteger(value, "Kappa");
  return value as Kappa;
}

/**
 * Create a KappaInt value from an integer.
 */
export function createKappaInt(value: number): KappaInt {
  assertSafeInteger(value, "KappaInt");
  return value as KappaInt;
}

/**
 * Convert external world-unit input into Kappa.
 *
 * This is a boundary adapter. Do not use decimal world-unit values inside
 * simulation logic. Internal simulation code should already use Kappa integers.
 */
export function createKappaFromWorldUnits(value: number): Kappa {
  assertFiniteNumber(value, "Kappa.fromWorldUnits");

  const scaled = Math.trunc(value * KAPPA);
  assertSafeInteger(scaled, "Kappa.fromWorldUnits.scaled");

  return scaled as Kappa;
}

/**
 * Backward-compatible alias.
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
 * ChunkCoord: signed 32-bit integer chunk coordinate.
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
  assertSignedInt32(value, "ChunkCoord");
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

  return (
    Number.isSafeInteger(cx) &&
    Number.isSafeInteger(cz) &&
    cx >= -2_147_483_648 &&
    cx <= 2_147_483_647 &&
    cz >= -2_147_483_648 &&
    cz <= 2_147_483_647
  );
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
 * MortonCode: BigInt-backed Z-order curve key.
 *
 * Why BigInt?
 * JavaScript bitwise operators are signed 32-bit. Interleaving two 32-bit
 * coordinates into a 64-bit Morton code cannot be represented safely as a
 * normal number.
 */
export type MortonCode = bigint & { readonly __brand: "MortonCode" };

const UINT32_MASK = 0xffffffffn;

export function createMortonCode(cx: number, cz: number): MortonCode {
  const x = zigZagEncode32(createChunkCoord(cx));
  const z = zigZagEncode32(createChunkCoord(cz));

  return encodeMortonUnsigned32(x, z);
}

export function createMortonCodeFromChunkKey(chunkKey: ChunkKey): MortonCode {
  const parsed = parseChunkKey(chunkKey);
  return createMortonCode(parsed.cx, parsed.cz);
}

export function decodeMorton(morton: MortonCode): { readonly x: number; readonly z: number } {
  const decoded = decodeMortonUnsigned32(morton);

  return Object.freeze({
    x: zigZagDecode32(decoded.x),
    z: zigZagDecode32(decoded.z),
  });
}

function encodeMortonUnsigned32(x: bigint, z: bigint): MortonCode {
  let morton = 0n;

  for (let bit = 0n; bit < 32n; bit += 1n) {
    const xBit = (x >> bit) & 1n;
    const zBit = (z >> bit) & 1n;

    morton |= xBit << (bit * 2n);
    morton |= zBit << (bit * 2n + 1n);
  }

  return morton as MortonCode;
}

function decodeMortonUnsigned32(
  morton: MortonCode,
): { readonly x: bigint; readonly z: bigint } {
  let x = 0n;
  let z = 0n;

  for (let bit = 0n; bit < 32n; bit += 1n) {
    x |= ((morton >> (bit * 2n)) & 1n) << bit;
    z |= ((morton >> (bit * 2n + 1n)) & 1n) << bit;
  }

  return Object.freeze({
    x: x & UINT32_MASK,
    z: z & UINT32_MASK,
  });
}

/**
 * Deterministic signed int32 -> unsigned int32 mapping.
 */
function zigZagEncode32(value: ChunkCoord): bigint {
  const n = BigInt(Number(value));
  return n >= 0n ? n * 2n : (-n * 2n) - 1n;
}

/**
 * Deterministic unsigned int32 -> signed int32 mapping.
 */
function zigZagDecode32(value: bigint): number {
  const decoded = (value & 1n) === 0n
    ? value / 2n
    : -((value + 1n) / 2n);

  const asNumber = Number(decoded);
  assertSignedInt32(asNumber, "MortonCode.decode");

  return asNumber;
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
export const CHUNK_KAPPA_CELL_COUNT = BigInt(CHUNK_SIZE_KAPPA) * BigInt(CHUNK_SIZE_KAPPA);
