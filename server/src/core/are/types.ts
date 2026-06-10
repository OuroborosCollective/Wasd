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

export function parseChunkKey(key: string | ChunkKey): ParsedChunkKey {
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

// =============================================================================
// ChunkKey Compatibility Functions
// =============================================================================

/**
 * Compatibility alias for createChunkKey.
 */
export function getChunkKey(cx: number | ChunkCoord, cz: number | ChunkCoord): ChunkKey {
  return createChunkKey(Number(cx), Number(cz));
}

/**
 * Convert a raw string into a validated branded ChunkKey.
 *
 * Useful for tests, persistence adapters and network payloads.
 */
export function createChunkKeyFromString(value: string): ChunkKey {
  if (value.trim().length === 0) {
    throw new Error('[ChunkKey] Expected non-empty string');
  }

  const parts = value.split(':');
  if (parts.length !== 2) {
    throw new Error(`[ChunkKey] Invalid chunk key format: ${value}`);
  }

  const cx = Number(parts[0]);
  const cz = Number(parts[1]);

  if (!Number.isInteger(cx) || !Number.isSafeInteger(cx)) {
    throw new Error(`[ChunkKey.cx] Expected integer, got: ${parts[0]}`);
  }
  if (!Number.isInteger(cz) || !Number.isSafeInteger(cz)) {
    throw new Error(`[ChunkKey.cz] Expected integer, got: ${parts[1]}`);
  }

  return createChunkKey(cx, cz);
}

/**
 * Compatibility alias for raw persisted/network string keys.
 */
export function coerceChunkKey(value: ChunkKey | string): ChunkKey {
  if (isChunkKey(value)) return value;
  return createChunkKeyFromString(String(value));
}

/**
 * Convert ChunkKey to string.
 */
export function chunkKeyToString(key: ChunkKey): string {
  return String(key);
}

/**
 * Compare two ChunkKeys (accepts raw strings for test compatibility).
 */
export function sameChunkKey(a: ChunkKey | string, b: ChunkKey | string): boolean {
  return String(coerceChunkKey(a)) === String(coerceChunkKey(b));
}

/**
 * Get all 8 neighbor chunk keys.
 */
export function getNeighborChunkKeys(key: ChunkKey | string): readonly ChunkKey[] {
  const { cx, cz } = parseChunkKey(key);
  const x = Number(cx);
  const z = Number(cz);

  return Object.freeze([
    createChunkKey(x - 1, z - 1),
    createChunkKey(x, z - 1),
    createChunkKey(x + 1, z - 1),
    createChunkKey(x - 1, z),
    createChunkKey(x + 1, z),
    createChunkKey(x - 1, z + 1),
    createChunkKey(x, z + 1),
    createChunkKey(x + 1, z + 1),
  ]);
}

/**
 * Get 4 cardinal neighbor chunk keys.
 */
export function getCardinalNeighborChunkKeys(key: ChunkKey | string): readonly ChunkKey[] {
  const { cx, cz } = parseChunkKey(key);
  const x = Number(cx);
  const z = Number(cz);

  return Object.freeze([
    createChunkKey(x, z - 1),
    createChunkKey(x + 1, z),
    createChunkKey(x, z + 1),
    createChunkKey(x - 1, z),
  ]);
}

/**
 * Get Chebyshev distance between two chunks.
 */
export function getChunkChebyshevDistance(a: ChunkKey | string, b: ChunkKey | string): number {
  const pa = parseChunkKey(a);
  const pb = parseChunkKey(b);
  return Math.max(
    Math.abs(Number(pa.cx) - Number(pb.cx)),
    Math.abs(Number(pa.cz) - Number(pb.cz)),
  );
}

/**
 * Get Manhattan distance between two chunks.
 */
export function getChunkManhattanDistance(a: ChunkKey | string, b: ChunkKey | string): number {
  const pa = parseChunkKey(a);
  const pb = parseChunkKey(b);
  return (
    Math.abs(Number(pa.cx) - Number(pb.cx)) +
    Math.abs(Number(pa.cz) - Number(pb.cz))
  );
}

// =============================================================================
// Entity ID Types
// =============================================================================

export type PlayerId = string & { readonly __brand: 'PlayerId' };
export type NpcId = string & { readonly __brand: 'NpcId' };
export type GuildId = string & { readonly __brand: 'GuildId' };
export type QuestId = string & { readonly __brand: 'QuestId' };
export type TickSystemId = string & { readonly __brand: 'TickSystemId' };

export function createPlayerId(value: string): PlayerId {
  if (value.trim().length === 0) {
    throw new Error('[PlayerId] Expected non-empty string');
  }
  return value as PlayerId;
}

export function createNpcId(value: string): NpcId {
  if (value.trim().length === 0) {
    throw new Error('[NpcId] Expected non-empty string');
  }
  return value as NpcId;
}

export function createGuildId(value: string): GuildId {
  if (value.trim().length === 0) {
    throw new Error('[GuildId] Expected non-empty string');
  }
  return value as GuildId;
}

export function createQuestId(value: string): QuestId {
  if (value.trim().length === 0) {
    throw new Error('[QuestId] Expected non-empty string');
  }
  return value as QuestId;
}

export function createTickSystemId(value: string): TickSystemId {
  if (value.trim().length === 0) {
    throw new Error('[TickSystemId] Expected non-empty string');
  }
  return value as TickSystemId;
}

// =============================================================================
// Tick System Contracts
// =============================================================================

export enum TickSystemPriority {
  CRITICAL = 0,
  INFRASTRUCTURE = 50,
  HIGH = 100,
  WORLD = 200,
  COMBAT = 300,
  NPC = 400,
  ECONOMY = 500,
  NORMAL = 500,
  QUEST = 600,
  GUILD = 700,
  BROADCAST = 800,
  BACKGROUND = 900,
  LOW = 1000,
}

export enum TickSystemCategory {
  CORE = 'core',
  WORLD = 'world',
  SPATIAL = 'spatial',
  COMBAT = 'combat',
  NPC = 'npc',
  ECONOMY = 'economy',
  QUEST = 'quest',
  GUILD = 'guild',
  WARFRONT = 'warfront',
  PLAYER = 'player',
  BROADCAST = 'broadcast',
  AUTONOMOUS = 'autonomous',
  UNKNOWN = 'unknown',
}

export interface TickTraceEvent {
  readonly tickId?: TickId;
  readonly systemId: string;
  readonly category?: TickSystemCategory | string;
  readonly message: string;
  readonly severity?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface TickSystemContext<
  TWorld = unknown,
  TEvent = unknown,
  TCommand = unknown,
> {
  readonly tickId?: TickId;
  readonly tick?: TickId | number;
  readonly logicalIndex?: TickId | number;
  readonly fixedDeltaMs?: number;
  readonly deltaTicks?: number;
  readonly world?: TWorld;
  readonly previousStateHash?: StateHash;
  readonly stateHash?: StateHash;
  readonly seedHash?: StateHash;
  readonly events?: readonly TEvent[];
  readonly commands?: readonly TCommand[];
  readonly emitEvent?: (event: TEvent) => void;
  readonly enqueueCommand?: (command: TCommand) => void;
  readonly trace?: (event: TickTraceEvent) => void;
}

export interface TickSystem<
  TContext extends TickSystemContext = TickSystemContext,
> {
  readonly id: string;
  readonly name?: string;
  readonly category?: TickSystemCategory | string;
  readonly priority?: TickSystemPriority;
  tick?(context: TContext): void | Promise<void>;
  update?(context: TContext): void | Promise<void>;
  init?(context?: TContext): void | Promise<void>;
  shutdown?(context?: TContext): void | Promise<void>;
}

export function getTickSystemPriority(system: TickSystem): TickSystemPriority {
  return system.priority ?? TickSystemPriority.NORMAL;
}

export function getTickSystemCategory(system: TickSystem): TickSystemCategory | string {
  return system.category ?? TickSystemCategory.UNKNOWN;
}

export function compareTickSystems(a: TickSystem, b: TickSystem): number {
  const priorityDiff = getTickSystemPriority(a) - getTickSystemPriority(b);
  if (priorityDiff !== 0) return priorityDiff;
  return a.id.localeCompare(b.id);
}

// =============================================================================
// Constants
// =============================================================================

export const TICK_RATE_HZ = 10 as const;
export const TICK_INTERVAL_MS = 100 as const;
