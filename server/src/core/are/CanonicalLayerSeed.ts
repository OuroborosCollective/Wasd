import type { ChunkKey, KappaInt, StateHash, TickId } from './types.js';
import { createStateHash } from './types.js';
import {
  KAPPA_LAYER_CONSTANTS,
  KAPPA_LAYER_NAMES,
  checksumKappaLayers,
  hashChunkKappa1000,
  kappa1000Hash,
  type KappaLayerKey,
  type KappaLayers,
} from './KappaLayers.js';

export const CANONICAL_LAYER_SEED_VERSION = 1 as const;
export const DEFAULT_ARELORIA_WORLD_SEED = 'areloria:earth_1_1' as const;

const CANONICAL_LAYER_ORDER = Object.freeze(Object.keys(KAPPA_LAYER_NAMES).sort() as KappaLayerKey[]);
const MIN_LAYER_VALUE = 1;
const MAX_LAYER_VALUE = Number(KAPPA_LAYER_CONSTANTS.LAYER_MAX) - 1;
const TARGET_LAYER_SUM = Number(KAPPA_LAYER_CONSTANTS.LAYER_SUM_MIDPOINT);
const BASE_LAYER_VALUE = Number(KAPPA_LAYER_CONSTANTS.LAYER_MIDPOINT);
const VARIANCE_RADIUS = 175;

export interface CanonicalLayerSeedInput {
  readonly worldSeed?: string | number | null;
  readonly chunkKey: ChunkKey;
  readonly activationTick: TickId;
}

export interface CanonicalLayerSeedResult {
  readonly version: typeof CANONICAL_LAYER_SEED_VERSION;
  readonly worldSeed: string;
  readonly chunkKey: ChunkKey;
  readonly activationTick: TickId;
  readonly layers: KappaLayers;
  readonly checksum: KappaInt;
  readonly seedHash: StateHash;
}

function cleanWorldSeed(value: string | number | null | undefined): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveCanonicalWorldSeed(value?: string | number | null): string {
  return cleanWorldSeed(value)
    ?? cleanWorldSeed(process.env.WASD_WORLD_SEED)
    ?? cleanWorldSeed(process.env.ARELORIA_WORLD_SEED)
    ?? cleanWorldSeed(process.env.WORLD_SEED)
    ?? DEFAULT_ARELORIA_WORLD_SEED;
}

function clampLayerValue(value: number): number {
  if (!Number.isFinite(value)) return BASE_LAYER_VALUE;
  return Math.max(MIN_LAYER_VALUE, Math.min(MAX_LAYER_VALUE, Math.trunc(value)));
}

function createSeedInput(worldSeed: string, chunkKey: ChunkKey, activationTick: TickId): string {
  return [
    `v:${CANONICAL_LAYER_SEED_VERSION}`,
    `seed:${worldSeed}`,
    `chunk:${String(chunkKey)}`,
    `tick:${Number(activationTick)}`,
  ].join('|');
}

function distributeConservationDelta(values: Record<KappaLayerKey, number>, seedInput: string): void {
  let delta = TARGET_LAYER_SUM - CANONICAL_LAYER_ORDER.reduce((sum, key) => sum + values[key], 0);
  if (delta === 0) return;

  const adjustmentOrder = [...CANONICAL_LAYER_ORDER].sort((a, b) => {
    const hashA = kappa1000Hash(`${seedInput}|adjust:${a}`);
    const hashB = kappa1000Hash(`${seedInput}|adjust:${b}`);
    if (hashA !== hashB) return hashA - hashB;
    return a.localeCompare(b);
  });

  let cursor = 0;
  while (delta !== 0) {
    const key = adjustmentOrder[cursor % adjustmentOrder.length];
    const step = delta > 0 ? 1 : -1;
    const next = values[key] + step;

    if (next >= MIN_LAYER_VALUE && next <= MAX_LAYER_VALUE) {
      values[key] = next;
      delta -= step;
    }

    cursor += 1;
    if (cursor > 4096) {
      throw new Error('Canonical layer seed conservation adjustment exceeded safety bound');
    }
  }
}

function createLayers(values: Record<KappaLayerKey, number>): KappaLayers {
  return Object.freeze({
    ecology: values.ecology as KappaInt,
    market: values.market as KappaInt,
    physiology: values.physiology as KappaInt,
    trade: values.trade as KappaInt,
    memory: values.memory as KappaInt,
    politics: values.politics as KappaInt,
    conflict: values.conflict as KappaInt,
    economy: values.economy as KappaInt,
    kingdoms: values.kingdoms as KappaInt,
    faith: values.faith as KappaInt,
    dungeon: values.dungeon as KappaInt,
    fear: values.fear as KappaInt,
    cycles: values.cycles as KappaInt,
  });
}

export function deriveCanonicalLayerSeed(input: CanonicalLayerSeedInput): CanonicalLayerSeedResult {
  const worldSeed = resolveCanonicalWorldSeed(input.worldSeed);
  const seedInput = createSeedInput(worldSeed, input.chunkKey, input.activationTick);

  const values = {} as Record<KappaLayerKey, number>;
  for (const key of CANONICAL_LAYER_ORDER) {
    const hash = kappa1000Hash(`${seedInput}|layer:${key}`);
    const offset = (hash % (VARIANCE_RADIUS * 2 + 1)) - VARIANCE_RADIUS;
    values[key] = clampLayerValue(BASE_LAYER_VALUE + offset);
  }

  distributeConservationDelta(values, seedInput);

  const layers = createLayers(values);
  const checksum = checksumKappaLayers(layers);
  if (Number(checksum) !== TARGET_LAYER_SUM) {
    throw new Error(`Canonical layer seed checksum violation: ${Number(checksum)} !== ${TARGET_LAYER_SUM}`);
  }

  const seedHash = hashChunkKappa1000(input.chunkKey, layers, input.activationTick);
  return Object.freeze({
    version: CANONICAL_LAYER_SEED_VERSION,
    worldSeed,
    chunkKey: input.chunkKey,
    activationTick: input.activationTick,
    layers,
    checksum,
    seedHash,
  });
}

export function canonicalLayerSeedHash(input: CanonicalLayerSeedInput): StateHash {
  return deriveCanonicalLayerSeed(input).seedHash;
}

export function zeroStateHash(): StateHash {
  return createStateHash('0'.repeat(64));
}
