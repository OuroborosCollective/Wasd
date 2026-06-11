import { KAPPA } from "./Kappa";

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) throw new Error(`[${label}] Expected safe integer, got: ${value}`);
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`[${label}] Expected finite number, got: ${value}`);
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) throw new Error(`[${label}] Expected integer, got: ${value}`);
}

function assertNonEmptyString(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`[${label}] Expected non-empty string`);
}

export type Kappa = number & { readonly __brand: "Kappa" };
export type KappaInt = number & { readonly __brand: "KappaInt" };

export function createKappa(value: number): Kappa {
  assertInteger(value, "Kappa");
  assertSafeInteger(value, "Kappa");
  return value as Kappa;
}

export function createKappaInt(value: number): KappaInt {
  assertInteger(value, "KappaInt");
  assertSafeInteger(value, "KappaInt");
  return value as KappaInt;
}

export function createKappaFromWorldUnits(value: number): Kappa {
  assertFiniteNumber(value, "Kappa.fromWorldUnits");
  const scaled = Math.round(value * KAPPA);
  assertSafeInteger(scaled, "Kappa.fromWorldUnits.scaled");
  return scaled as Kappa;
}

export function createKappaFromDecimal(value: number): Kappa {
  return createKappaFromWorldUnits(value);
}

export function kappaToWorldUnits(value: Kappa | KappaInt): number {
  return Number(value) / KAPPA;
}

export type TickId = number & { readonly __brand: "TickId" };

export function createTickId(value: number): TickId {
  assertInteger(value, "TickId");
  assertSafeInteger(value, "TickId");
  if (value < 0) throw new Error(`[TickId] Invalid tick ID: ${value}. Must be non-negative.`);
  return value as TickId;
}

export function incrementTickId(tick: TickId): TickId {
  return createTickId(Number(tick) + 1);
}

export type StateHash = string & { readonly __brand: "StateHash" };
const STATE_HASH_PATTERN = /^[0-9a-f]{64}$/i;

export function createStateHash(value: string): StateHash {
  if (!STATE_HASH_PATTERN.test(value)) {
    const preview = value.length > 16 ? `${value.slice(0, 16)}...` : value;
    throw new Error(`[StateHash] Invalid hash format: ${preview}. Expected 64 hex chars.`);
  }
  return value.toLowerCase() as StateHash;
}

export function isStateHash(value: unknown): value is StateHash {
  return typeof value === "string" && STATE_HASH_PATTERN.test(value);
}

export const GENESIS_STATE_HASH: StateHash = createStateHash("0".repeat(64));

export type ChunkCoord = number & { readonly __brand: "ChunkCoord" };
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
  return `${createChunkCoord(cx)}:${createChunkCoord(cz)}` as ChunkKey;
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
  if (parts.length !== 2) throw new Error(`[ChunkKey] Invalid chunk key format: ${String(key)}`);
  return Object.freeze({ cx: createChunkCoord(Number(parts[0])), cz: createChunkCoord(Number(parts[1])) });
}

export type MortonCode = number & { readonly __brand: "MortonCode" };

function encodeMortonInput(value: number, label: string): number {
  assertInteger(value, label);
  assertSafeInteger(value, label);
  if (value < 0 || value > 0xffff) throw new Error(`[${label}] MortonCode number compatibility mode expects 0..65535, got: ${value}`);
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

export function createMortonCode(cx: number, cz: number): MortonCode {
  return encodeMorton16(encodeMortonInput(cx, "MortonCode.cx"), encodeMortonInput(cz, "MortonCode.cz")) as MortonCode;
}

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

export type EntityId = string & { readonly __brand: "EntityId" };
export function createEntityId(value: string): EntityId {
  assertNonEmptyString(value, "EntityId");
  return value as EntityId;
}

export const CHUNK_SIZE = 64 as const;
export const CHUNK_TILE_COUNT = CHUNK_SIZE * CHUNK_SIZE;
export const CHUNK_SIZE_KAPPA: KappaInt = createKappaInt(CHUNK_SIZE * KAPPA);
export const CHUNK_KAPPA_CELL_COUNT = BigInt(Number(CHUNK_SIZE_KAPPA)) * BigInt(Number(CHUNK_SIZE_KAPPA));

export function getChunkKey(cx: number | ChunkCoord, cz: number | ChunkCoord): ChunkKey {
  return createChunkKey(Number(cx), Number(cz));
}

export function createChunkKeyFromString(value: string): ChunkKey {
  if (value.trim().length === 0) throw new Error("[ChunkKey] Expected non-empty string");
  return parseChunkKey(value) && createChunkKey(Number(value.split(":")[0]), Number(value.split(":")[1]));
}

export function coerceChunkKey(value: ChunkKey | string): ChunkKey {
  if (isChunkKey(value)) return value;
  return createChunkKeyFromString(String(value));
}

export function chunkKeyToString(key: ChunkKey): string {
  return String(key);
}

export function sameChunkKey(a: ChunkKey | string, b: ChunkKey | string): boolean {
  return String(coerceChunkKey(a)) === String(coerceChunkKey(b));
}

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

export function getChunkChebyshevDistance(a: ChunkKey | string, b: ChunkKey | string): number {
  const pa = parseChunkKey(a);
  const pb = parseChunkKey(b);
  return Math.max(Math.abs(Number(pa.cx) - Number(pb.cx)), Math.abs(Number(pa.cz) - Number(pb.cz)));
}

export function getChunkManhattanDistance(a: ChunkKey | string, b: ChunkKey | string): number {
  const pa = parseChunkKey(a);
  const pb = parseChunkKey(b);
  return Math.abs(Number(pa.cx) - Number(pb.cx)) + Math.abs(Number(pa.cz) - Number(pb.cz));
}

export type PlayerId = string & { readonly __brand: "PlayerId" };
export type NpcId = string & { readonly __brand: "NpcId" };
export type GuildId = string & { readonly __brand: "GuildId" };
export type QuestId = string & { readonly __brand: "QuestId" };
export type TickSystemId = string & { readonly __brand: "TickSystemId" };

export function createPlayerId(value: string): PlayerId { assertNonEmptyString(value, "PlayerId"); return value as PlayerId; }
export function createNpcId(value: string): NpcId { assertNonEmptyString(value, "NpcId"); return value as NpcId; }
export function createGuildId(value: string): GuildId { assertNonEmptyString(value, "GuildId"); return value as GuildId; }
export function createQuestId(value: string): QuestId { assertNonEmptyString(value, "QuestId"); return value as QuestId; }
export function createTickSystemId(value: string): TickSystemId { assertNonEmptyString(value, "TickSystemId"); return value as TickSystemId; }

export enum TickSystemPriority {
  CRITICAL = 0,
  INFRASTRUCTURE = 50,
  FOUNDATION = 100,
  HIGH = 100,
  WORLD = 200,
  GAMEPLAY = 250,
  COMBAT = 300,
  NPC = 400,
  ECONOMY = 500,
  NORMAL = 500,
  QUEST = 600,
  GUILD = 700,
  BROADCAST = 800,
  PERSISTENCE = 850,
  BACKGROUND = 900,
  LOW = 1000,
}

export enum TickSystemCategory {
  CORE = "core",
  WORLD = "world",
  SPATIAL = "spatial",
  COMBAT = "combat",
  NPC = "npc",
  ECONOMY = "economy",
  QUEST = "quest",
  GUILD = "guild",
  WARFRONT = "warfront",
  PLAYER = "player",
  BROADCAST = "broadcast",
  AUTONOMOUS = "autonomous",
  UNKNOWN = "unknown",
}

export interface TickTraceEvent {
  readonly tickId?: TickId;
  readonly systemId: string;
  readonly category?: TickSystemCategory | string;
  readonly message: string;
  readonly severity?: "debug" | "info" | "warn" | "error" | "critical";
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface TickSystemContext<TWorld = unknown, TEvent = unknown, TCommand = unknown> {
  readonly tickId?: TickId;
  readonly tick?: TickId | number;
  readonly logicalIndex?: TickId | number;
  readonly tickCount?: TickId;
  readonly isHighFrequencyTick?: boolean;
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

export interface TickSystem<TContext extends TickSystemContext = TickSystemContext> {
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

export const TICK_RATE_HZ = 10 as const;
export const TICK_INTERVAL_MS = 100 as const;
