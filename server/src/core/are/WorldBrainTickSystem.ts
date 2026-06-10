/**
 * WorldBrainTickSystem
 *
 * Deterministic 13-layer ARE world-brain system.
 *
 * Contract:
 * - Does not schedule ticks.
 * - Does not perform I/O.
 * - Reads canonical chunk layer state through a port.
 * - Computes deterministic layer transfers with integer/Kappa arithmetic.
 * - Emits deterministic deltas.
 * - Feeds SnapshotComposer through a sink.
 * - Feeds replay through a sink.
 */

import {
  TickSystemPriority,
  type TickSystem,
  type TickSystemContext,
  type TickSystemDescriptor,
} from "./TickSystem.js";
import {
  tickSystemRegistry,
  type TickSystemRegistry,
} from "./TickSystemRegistry.js";
import type {
  ChunkKey,
  KappaInt,
  StateHash,
  TickId,
} from "./types.js";
import { createStateHash } from "./StateHash.js";
import { ATTRACTOR_TYPES } from "./ChunkLayerState.js";
import {
  LAYER_CONSTANTS,
  createEmptyIARELogicLayers,
  getLayerValues,
  type IARELogicLayers,
} from "./IARELogicLayers.js";
import {
  DeterminismViolation,
  SnapshotComposer,
} from "./SnapshotComposer.js";

export const WORLD_BRAIN_TICK_SYSTEM_NAME = "world-brain" as const;

/**
 * Numeric priority between GAMEPLAY(20) and BROADCAST(30).
 *
 * This places WorldBrain after economy/NPC/memory/gameplay mutation
 * and before snapshot composition.
 */
export const WORLD_BRAIN_TICK_PRIORITY = 25 as TickSystemPriority;

export type WorldBrainLayerKey = keyof IARELogicLayers;

export type WorldBrainAttractorType =
  | typeof ATTRACTOR_TYPES.STABLE
  | typeof ATTRACTOR_TYPES.EMERGING
  | typeof ATTRACTOR_TYPES.VILLAGE_TO_CITY
  | typeof ATTRACTOR_TYPES.AGGRESSION_SPIKE
  | typeof ATTRACTOR_TYPES.MARKET_COLLAPSE
  | typeof ATTRACTOR_TYPES.CULT_FORMATION
  | typeof ATTRACTOR_TYPES.DUNGEON_EMERGENCE;

export interface WorldBrainAttractor {
  readonly type: WorldBrainAttractorType;
  readonly primaryLayer: WorldBrainLayerKey;
  readonly strength: KappaInt;
  readonly convergence: KappaInt;
}

export interface WorldBrainDelta {
  readonly tick: TickId;
  readonly chunkKey: ChunkKey;
  readonly previousHash: StateHash;
  readonly nextHash: StateHash;
  readonly checksumBefore: KappaInt;
  readonly checksumAfter: KappaInt;
  readonly previousLayers: IARELogicLayers;
  readonly nextLayers: IARELogicLayers;
  readonly attractor: WorldBrainAttractor;
}

export interface WorldBrainCanonicalStatePort {
  listActiveChunkKeys(): readonly ChunkKey[];
  readChunkLayers(chunkKey: ChunkKey): IARELogicLayers | null;
  commitWorldBrainDelta(delta: WorldBrainDelta): void;
}

export interface WorldBrainSnapshotSink {
  includeWorldBrainChunk(
    tick: TickId,
    chunkKey: ChunkKey,
    layers: IARELogicLayers,
    stateHash: StateHash,
  ): void;
}

export interface WorldBrainReplaySink {
  recordWorldBrainDelta(delta: WorldBrainDelta): void;
}

export interface WorldBrainTickSystemOptions {
  readonly state: WorldBrainCanonicalStatePort;
  readonly snapshot: WorldBrainSnapshotSink;
  readonly replay: WorldBrainReplaySink;
  readonly enabled?: boolean;
}

const ZERO_KAPPA_INT = 0 as KappaInt;
const ONE_KAPPA_INT = 1 as KappaInt;
const MAX_LAYER_VALUE = LAYER_CONSTANTS.LAYER_MAX;
const HALF_LAYER_VALUE = 500 as KappaInt;
const TRANSFER_SMALL = 25 as KappaInt;
const TRANSFER_MEDIUM = 50 as KappaInt;
const TRANSFER_LARGE = 100 as KappaInt;

const WORLD_BRAIN_LAYER_KEYS = [
  "ecology",
  "market",
  "physiology",
  "trade",
  "memory",
  "politics",
  "conflict",
  "economy",
  "kingdoms",
  "faith",
  "dungeon",
  "fear",
  "cycles",
] as const satisfies readonly WorldBrainLayerKey[];

export class WorldBrainTickSystem implements TickSystem {
  readonly name = WORLD_BRAIN_TICK_SYSTEM_NAME;
  readonly priority = WORLD_BRAIN_TICK_PRIORITY;
  enabled: boolean;

  private readonly state: WorldBrainCanonicalStatePort;
  private readonly snapshot: WorldBrainSnapshotSink;
  private readonly replay: WorldBrainReplaySink;

  constructor(options: WorldBrainTickSystemOptions) {
    this.state = options.state;
    this.snapshot = options.snapshot;
    this.replay = options.replay;
    this.enabled = options.enabled ?? true;
  }

  tick(context: TickSystemContext): void {
    const tick = context.tickCount;
    const activeChunkKeys = sortChunkKeys(this.state.listActiveChunkKeys());

    for (const chunkKey of activeChunkKeys) {
      const previousLayers = cloneLayers(
        this.state.readChunkLayers(chunkKey) ?? createEmptyIARELogicLayers(),
      );

      const previousHash = hashLayers(chunkKey, previousLayers);
      const checksumBefore = checksumLayers(previousLayers);
      const attractor = selectAttractor(previousLayers);
      const nextLayers = applyAttractor(previousLayers, attractor);
      const checksumAfter = checksumLayers(nextLayers);

      assertConservation(checksumBefore, checksumAfter, chunkKey);

      const nextHash = hashLayers(chunkKey, nextLayers);

      const delta: WorldBrainDelta = Object.freeze({
        tick,
        chunkKey,
        previousHash,
        nextHash,
        checksumBefore,
        checksumAfter,
        previousLayers,
        nextLayers,
        attractor,
      });

      this.state.commitWorldBrainDelta(delta);
      this.replay.recordWorldBrainDelta(delta);
      this.snapshot.includeWorldBrainChunk(tick, chunkKey, nextLayers, nextHash);
    }
  }
}

/**
 * Adapter for the existing SnapshotComposer.
 *
 * This keeps SnapshotComposer as the only server snapshot truth.
 */
export class SnapshotComposerWorldBrainSink implements WorldBrainSnapshotSink {
  constructor(private readonly composer: SnapshotComposer) {}

  includeWorldBrainChunk(
    tick: TickId,
    chunkKey: ChunkKey,
    layers: IARELogicLayers,
    _stateHash: StateHash,
  ): void {
    this.composer.addChunk(chunkKey, tick, [], layers);
  }
}

/**
 * Deterministic in-memory replay sink for tests and staged integration.
 *
 * Production can replace this with an AREReplayBuffer adapter without changing
 * WorldBrainTickSystem.
 */
export class InMemoryWorldBrainReplaySink implements WorldBrainReplaySink {
  private readonly deltas: WorldBrainDelta[] = [];

  recordWorldBrainDelta(delta: WorldBrainDelta): void {
    this.deltas.push(delta);
  }

  snapshot(): readonly WorldBrainDelta[] {
    return Object.freeze([...this.deltas]);
  }

  latest(): WorldBrainDelta | null {
    return this.deltas.length === 0
      ? null
      : this.deltas[this.deltas.length - 1];
  }
}

export function createWorldBrainTickSystemDescriptor(
  system: WorldBrainTickSystem,
): TickSystemDescriptor {
  return {
    system,
    dependencies: [
      "input",
      "spatial-interest",
      "resource-economy",
      "npc-memory-rumor",
    ],
    tags: [
      "world-brain",
      "are",
      "emergence",
      "snapshot-source",
    ],
  };
}

export function registerWorldBrainTickSystem(
  options: WorldBrainTickSystemOptions,
  registry: TickSystemRegistry = tickSystemRegistry,
): WorldBrainTickSystem {
  const system = new WorldBrainTickSystem(options);
  registry.register(createWorldBrainTickSystemDescriptor(system));
  return system;
}

function cloneLayers(layers: IARELogicLayers): IARELogicLayers {
  return Object.freeze({
    ecology: assertKappaInt(layers.ecology, "ecology"),
    market: assertKappaInt(layers.market, "market"),
    physiology: assertKappaInt(layers.physiology, "physiology"),
    trade: assertKappaInt(layers.trade, "trade"),
    memory: assertKappaInt(layers.memory, "memory"),
    politics: assertKappaInt(layers.politics, "politics"),
    conflict: assertKappaInt(layers.conflict, "conflict"),
    economy: assertKappaInt(layers.economy, "economy"),
    kingdoms: assertKappaInt(layers.kingdoms, "kingdoms"),
    faith: assertKappaInt(layers.faith, "faith"),
    dungeon: assertKappaInt(layers.dungeon, "dungeon"),
    fear: assertKappaInt(layers.fear, "fear"),
    cycles: assertKappaInt(layers.cycles, "cycles"),
  });
}

function selectAttractor(layers: IARELogicLayers): WorldBrainAttractor {
  let primaryLayer: WorldBrainLayerKey = "ecology";
  let strength = layers.ecology;

  for (const layer of WORLD_BRAIN_LAYER_KEYS) {
    const value = layers[layer];
    if (value > strength) {
      strength = value;
      primaryLayer = layer;
    }
  }

  const convergence = computeConvergence(layers);

  if (primaryLayer === "trade" && strength >= 800) {
    return makeAttractor(ATTRACTOR_TYPES.VILLAGE_TO_CITY, primaryLayer, strength, convergence);
  }

  if (primaryLayer === "conflict" && strength >= 750) {
    return makeAttractor(ATTRACTOR_TYPES.AGGRESSION_SPIKE, primaryLayer, strength, convergence);
  }

  if (primaryLayer === "market" && strength <= 200) {
    return makeAttractor(ATTRACTOR_TYPES.MARKET_COLLAPSE, primaryLayer, strength, convergence);
  }

  if (primaryLayer === "faith" && strength >= 700) {
    return makeAttractor(ATTRACTOR_TYPES.CULT_FORMATION, primaryLayer, strength, convergence);
  }

  if (primaryLayer === "dungeon" && strength >= 800) {
    return makeAttractor(ATTRACTOR_TYPES.DUNGEON_EMERGENCE, primaryLayer, strength, convergence);
  }

  if (convergence < 950) {
    return makeAttractor(ATTRACTOR_TYPES.EMERGING, primaryLayer, strength, convergence);
  }

  return makeAttractor(ATTRACTOR_TYPES.STABLE, primaryLayer, strength, convergence);
}

function makeAttractor(
  type: WorldBrainAttractorType,
  primaryLayer: WorldBrainLayerKey,
  strength: KappaInt,
  convergence: KappaInt,
): WorldBrainAttractor {
  return Object.freeze({
    type,
    primaryLayer,
    strength,
    convergence,
  });
}

function applyAttractor(
  previous: IARELogicLayers,
  attractor: WorldBrainAttractor,
): IARELogicLayers {
  let next = cloneLayers(previous);

  switch (attractor.type) {
    case ATTRACTOR_TYPES.VILLAGE_TO_CITY:
      next = transfer(next, "ecology", "trade", TRANSFER_MEDIUM);
      next = transfer(next, "market", "kingdoms", TRANSFER_SMALL);
      break;

    case ATTRACTOR_TYPES.AGGRESSION_SPIKE:
      next = transfer(next, "trade", "conflict", TRANSFER_MEDIUM);
      next = transfer(next, "memory", "fear", TRANSFER_SMALL);
      break;

    case ATTRACTOR_TYPES.MARKET_COLLAPSE:
      next = transfer(next, "kingdoms", "fear", TRANSFER_SMALL);
      next = transfer(next, "trade", "market", TRANSFER_MEDIUM);
      break;

    case ATTRACTOR_TYPES.CULT_FORMATION:
      next = transfer(next, "politics", "faith", TRANSFER_MEDIUM);
      next = transfer(next, "memory", "faith", TRANSFER_SMALL);
      break;

    case ATTRACTOR_TYPES.DUNGEON_EMERGENCE:
      next = transfer(next, "ecology", "dungeon", TRANSFER_LARGE);
      next = transfer(next, "physiology", "fear", TRANSFER_SMALL);
      break;

    case ATTRACTOR_TYPES.EMERGING:
      next = transfer(next, "fear", "memory", TRANSFER_SMALL);
      break;

    case ATTRACTOR_TYPES.STABLE:
      next = transfer(next, "fear", "ecology", ONE_KAPPA_INT);
      break;
  }

  return Object.freeze(next);
}

function transfer(
  layers: IARELogicLayers,
  from: WorldBrainLayerKey,
  to: WorldBrainLayerKey,
  requestedAmount: KappaInt,
): IARELogicLayers {
  if (from === to) return layers;

  const source = layers[from];
  if (source <= ZERO_KAPPA_INT) return layers;

  const amount = minKappaInt(source, requestedAmount);
  if (amount <= ZERO_KAPPA_INT) return layers;

  return Object.freeze({
    ...layers,
    [from]: assertKappaInt(source - amount, from),
    [to]: assertKappaInt(layers[to] + amount, to),
  });
}

function computeConvergence(layers: IARELogicLayers): KappaInt {
  let distance = 0;

  for (const value of getLayerValues(layers)) {
    distance += absInt(Number(value) - Number(HALF_LAYER_VALUE));
  }

  const averageDistance = divTrunc(distance, LAYER_CONSTANTS.LAYER_COUNT);
  const convergence = Number(MAX_LAYER_VALUE) - averageDistance;

  return assertKappaInt(clampInt(convergence, 0, Number(MAX_LAYER_VALUE)), "convergence");
}

function checksumLayers(layers: IARELogicLayers): KappaInt {
  let sum = 0 as KappaInt;

  for (const value of getLayerValues(layers)) {
    sum = assertKappaInt(sum + value, "layer-value");
  }

  return sum;
}

function assertConservation(
  before: KappaInt,
  after: KappaInt,
  chunkKey: ChunkKey,
): void {
  if (before !== after) {
    throw new DeterminismViolation(
      `ARE conservation failed for chunk ${String(chunkKey)}: before=${before}, after=${after}`,
    );
  }
}

function hashLayers(chunkKey: ChunkKey, layers: IARELogicLayers): StateHash {
  const input = [
    String(chunkKey),
    ...WORLD_BRAIN_LAYER_KEYS.map((key) => `${key}:${layers[key]}`),
  ].join("|");

  return fnv1aStateHash(input);
}

function fnv1aStateHash(input: string): StateHash {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  const hex = hash.toString(16).padStart(8, "0");
  return createStateHash(`${hex}${hex}${hex}${hex}${hex}${hex}${hex}${hex}`);
}

function sortChunkKeys(chunkKeys: readonly ChunkKey[]): readonly ChunkKey[] {
  return Object.freeze([...chunkKeys].sort(compareChunkKeys));
}

function compareChunkKeys(a: ChunkKey, b: ChunkKey): number {
  const parsedA = parseChunkKeyParts(a);
  const parsedB = parseChunkKeyParts(b);

  if (parsedA.cx !== parsedB.cx) return parsedA.cx - parsedB.cx;
  return parsedA.cz - parsedB.cz;
}

function parseChunkKeyParts(chunkKey: ChunkKey): { readonly cx: number; readonly cz: number } {
  const parts = String(chunkKey).split(":");
  if (parts.length !== 2) {
    throw new DeterminismViolation(`Invalid chunk key: ${String(chunkKey)}`);
  }

  const cx = Number(parts[0]);
  const cz = Number(parts[1]);

  if (!Number.isInteger(cx) || !Number.isInteger(cz)) {
    throw new DeterminismViolation(`Non-integer chunk key: ${String(chunkKey)}`);
  }

  return Object.freeze({ cx, cz });
}

function assertKappaInt(value: number, label: string): KappaInt {
  if (!Number.isSafeInteger(value)) {
    throw new DeterminismViolation(`Unsafe KappaInt at ${label}: ${value}`);
  }

  return value as KappaInt;
}

function minKappaInt(a: KappaInt, b: KappaInt): KappaInt {
  return assertKappaInt(a < b ? a : b, "minKappaInt");
}

function absInt(value: number): number {
  return value < 0 ? -value : value;
}

function divTrunc(numerator: number, denominator: number): number {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    throw new DeterminismViolation(
      `Integer division received non-integer values: ${numerator}/${denominator}`,
    );
  }

  if (denominator === 0) {
    throw new DeterminismViolation("Integer division by zero");
  }

  return numerator < 0
    ? -Math.trunc((-numerator) / denominator)
    : Math.trunc(numerator / denominator);
}

function clampInt(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
