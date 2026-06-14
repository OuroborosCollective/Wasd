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

export const CANONICAL_LAYER_SEED_VERSION = 2 as const;
export const DEFAULT_ARELORIA_WORLD_SEED = 'areloria:earth_1_1' as const;

const CANONICAL_LAYER_ORDER = Object.freeze(Object.keys(KAPPA_LAYER_NAMES).sort() as KappaLayerKey[]);
const MIN_LAYER_VALUE = 1;
const MAX_LAYER_VALUE = Number(KAPPA_LAYER_CONSTANTS.LAYER_MAX) - 1;
const TARGET_LAYER_SUM = Number(KAPPA_LAYER_CONSTANTS.LAYER_SUM_MIDPOINT);
const BASE_LAYER_VALUE = Number(KAPPA_LAYER_CONSTANTS.LAYER_MIDPOINT);
const VARIANCE_RADIUS = 135;

export type CanonicalSeedBiomeId = 'forest_village' | 'forest' | 'plains' | 'mountain';

export interface CanonicalLayerSeedSignals {
  readonly signalVersion: 1;
  readonly source: string;
  readonly biomeId: CanonicalSeedBiomeId;
  readonly resourceDensityPerMille: number;
  readonly treeDensityPerMille: number;
  readonly settlementChancePerMille: number;
  readonly heightBaseKappa: number;
  readonly heightVarianceKappa: number;
  readonly terrainGrassPerMille: number;
  readonly terrainForestPerMille: number;
  readonly terrainStonePerMille: number;
  readonly terrainRoadPerMille: number;
  readonly roadCellCount: number;
  readonly roadEdgeCount: number;
  readonly settlementLotCount: number;
  readonly settlementIntentPerMille: number;
  readonly resourcePropCount: number;
  readonly structurePropCount: number;
  readonly collisionCellCount: number;
  readonly npcCount: number;
  readonly dangerPressurePerMille: number;
  readonly dungeonPressurePerMille: number;
  readonly signature: string;
}

export interface CanonicalLayerSeedInput {
  readonly worldSeed?: string | number | null;
  readonly chunkKey: ChunkKey;
  readonly activationTick: TickId;
  readonly signals?: CanonicalLayerSeedSignals | null;
}

export interface CanonicalLayerSeedResult {
  readonly version: typeof CANONICAL_LAYER_SEED_VERSION;
  readonly worldSeed: string;
  readonly chunkKey: ChunkKey;
  readonly activationTick: TickId;
  readonly signals: CanonicalLayerSeedSignals | null;
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

function clampPerMille(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1000, Math.trunc(value)));
}

function signalSignature(signals: CanonicalLayerSeedSignals | null | undefined): string {
  if (!signals) return 'signals:none';
  return [
    `signals:v${signals.signalVersion}`,
    `source:${signals.source}`,
    `biome:${signals.biomeId}`,
    `resource:${clampPerMille(signals.resourceDensityPerMille)}`,
    `tree:${clampPerMille(signals.treeDensityPerMille)}`,
    `settlement:${clampPerMille(signals.settlementIntentPerMille)}`,
    `grass:${clampPerMille(signals.terrainGrassPerMille)}`,
    `forest:${clampPerMille(signals.terrainForestPerMille)}`,
    `stone:${clampPerMille(signals.terrainStonePerMille)}`,
    `road:${clampPerMille(signals.terrainRoadPerMille)}`,
    `roads:${Math.max(0, Math.trunc(signals.roadCellCount))}`,
    `lots:${Math.max(0, Math.trunc(signals.settlementLotCount))}`,
    `resources:${Math.max(0, Math.trunc(signals.resourcePropCount))}`,
    `structures:${Math.max(0, Math.trunc(signals.structurePropCount))}`,
    `collision:${Math.max(0, Math.trunc(signals.collisionCellCount))}`,
    `npcs:${Math.max(0, Math.trunc(signals.npcCount))}`,
    `danger:${clampPerMille(signals.dangerPressurePerMille)}`,
    `dungeon:${clampPerMille(signals.dungeonPressurePerMille)}`,
    `sig:${signals.signature}`,
  ].join('|');
}

function createSeedInput(worldSeed: string, chunkKey: ChunkKey, activationTick: TickId, signals?: CanonicalLayerSeedSignals | null): string {
  return [
    `v:${CANONICAL_LAYER_SEED_VERSION}`,
    `seed:${worldSeed}`,
    `chunk:${String(chunkKey)}`,
    `tick:${Number(activationTick)}`,
    signalSignature(signals),
  ].join('|');
}

function add(values: Record<KappaLayerKey, number>, key: KappaLayerKey, delta: number): void {
  values[key] = clampLayerValue(values[key] + Math.trunc(delta));
}

function perMilleBias(value: number, divisor: number): number {
  return Math.trunc((clampPerMille(value) - 500) / divisor);
}

function applySignalBias(values: Record<KappaLayerKey, number>, signals: CanonicalLayerSeedSignals | null | undefined): void {
  if (!signals) return;

  const resource = signals.resourceDensityPerMille;
  const tree = signals.treeDensityPerMille;
  const settlement = signals.settlementIntentPerMille;
  const grass = signals.terrainGrassPerMille;
  const forest = signals.terrainForestPerMille;
  const stone = signals.terrainStonePerMille;
  const road = signals.terrainRoadPerMille;
  const danger = signals.dangerPressurePerMille;
  const dungeon = signals.dungeonPressurePerMille;

  add(values, 'ecology', perMilleBias(tree, 5) + perMilleBias(forest, 8) + perMilleBias(resource, 12));
  add(values, 'market', perMilleBias(resource, 8) + perMilleBias(settlement, 12));
  add(values, 'physiology', perMilleBias(grass, 14) + perMilleBias(tree, 16) - Math.max(0, perMilleBias(danger, 18)));
  add(values, 'trade', perMilleBias(road, 5) + perMilleBias(settlement, 12) + Math.min(45, signals.roadCellCount));
  add(values, 'memory', perMilleBias(settlement, 10) + signals.npcCount * 3);
  add(values, 'politics', perMilleBias(settlement, 8) + signals.structurePropCount * 4);
  add(values, 'conflict', perMilleBias(danger, 6) + perMilleBias(stone, 10));
  add(values, 'economy', perMilleBias(resource, 9) + perMilleBias(settlement, 15));
  add(values, 'kingdoms', perMilleBias(settlement, 9) + signals.settlementLotCount * 5);
  add(values, 'faith', signals.biomeId === 'forest_village' ? 35 : signals.npcCount * 2);
  add(values, 'dungeon', perMilleBias(dungeon, 5) + perMilleBias(stone, 8));
  add(values, 'fear', perMilleBias(danger, 5) + perMilleBias(forest, 18));
  add(values, 'cycles', perMilleBias(forest, 16) + perMilleBias(resource, 20));
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
    if (cursor > 8192) {
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
  const seedInput = createSeedInput(worldSeed, input.chunkKey, input.activationTick, input.signals);

  const values = {} as Record<KappaLayerKey, number>;
  for (const key of CANONICAL_LAYER_ORDER) {
    const hash = kappa1000Hash(`${seedInput}|layer:${key}`);
    const offset = (hash % (VARIANCE_RADIUS * 2 + 1)) - VARIANCE_RADIUS;
    values[key] = clampLayerValue(BASE_LAYER_VALUE + offset);
  }

  applySignalBias(values, input.signals);
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
    signals: input.signals ?? null,
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
