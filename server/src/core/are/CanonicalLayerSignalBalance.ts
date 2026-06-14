import type { CanonicalLayerSeedSignals, CanonicalSeedBiomeId } from './CanonicalLayerSeed.js';
import {
  KAPPA_LAYER_CONSTANTS,
  KAPPA_LAYER_NAMES,
  type KappaLayerKey,
} from './KappaLayers.js';

export const CANONICAL_SIGNAL_BALANCE_VERSION = 1 as const;

export type CanonicalNumericSignalKey = Extract<{
  [K in keyof CanonicalLayerSeedSignals]: CanonicalLayerSeedSignals[K] extends number ? K : never;
}[keyof CanonicalLayerSeedSignals], string>;

export type CanonicalSignalBalanceRule =
  | Readonly<{ kind: 'perMille'; signal: CanonicalNumericSignalKey; divisor: number }>
  | Readonly<{ kind: 'count'; signal: CanonicalNumericSignalKey; multiplier: number; cap?: number }>
  | Readonly<{ kind: 'biomeEqualsOrCount'; biomeId: CanonicalSeedBiomeId; delta: number; fallbackSignal: CanonicalNumericSignalKey; fallbackMultiplier: number }>;

export type CanonicalSignalBalanceMatrix = Readonly<Record<KappaLayerKey, readonly CanonicalSignalBalanceRule[]>>;

const CANONICAL_LAYER_ORDER = Object.freeze(Object.keys(KAPPA_LAYER_NAMES).sort() as KappaLayerKey[]);
const MIN_LAYER_VALUE = 1;
const MAX_LAYER_VALUE = Number(KAPPA_LAYER_CONSTANTS.LAYER_MAX) - 1;
const BASE_LAYER_VALUE = Number(KAPPA_LAYER_CONSTANTS.LAYER_MIDPOINT);

export const CANONICAL_SIGNAL_BALANCE_MATRIX: CanonicalSignalBalanceMatrix = Object.freeze({
  ecology: Object.freeze([
    { kind: 'perMille', signal: 'treeDensityPerMille', divisor: 5 },
    { kind: 'perMille', signal: 'terrainForestPerMille', divisor: 8 },
    { kind: 'perMille', signal: 'resourceDensityPerMille', divisor: 12 },
  ]),
  market: Object.freeze([
    { kind: 'perMille', signal: 'resourceDensityPerMille', divisor: 8 },
    { kind: 'perMille', signal: 'settlementIntentPerMille', divisor: 12 },
  ]),
  physiology: Object.freeze([
    { kind: 'perMille', signal: 'terrainGrassPerMille', divisor: 14 },
    { kind: 'perMille', signal: 'treeDensityPerMille', divisor: 16 },
    { kind: 'perMille', signal: 'dangerPressurePerMille', divisor: -18 },
  ]),
  trade: Object.freeze([
    { kind: 'perMille', signal: 'terrainRoadPerMille', divisor: 5 },
    { kind: 'perMille', signal: 'settlementIntentPerMille', divisor: 12 },
    { kind: 'count', signal: 'roadCellCount', multiplier: 1, cap: 45 },
  ]),
  memory: Object.freeze([
    { kind: 'perMille', signal: 'settlementIntentPerMille', divisor: 10 },
    { kind: 'count', signal: 'npcCount', multiplier: 3 },
  ]),
  politics: Object.freeze([
    { kind: 'perMille', signal: 'settlementIntentPerMille', divisor: 8 },
    { kind: 'count', signal: 'structurePropCount', multiplier: 4 },
  ]),
  conflict: Object.freeze([
    { kind: 'perMille', signal: 'dangerPressurePerMille', divisor: 6 },
    { kind: 'perMille', signal: 'terrainStonePerMille', divisor: 10 },
  ]),
  economy: Object.freeze([
    { kind: 'perMille', signal: 'resourceDensityPerMille', divisor: 9 },
    { kind: 'perMille', signal: 'settlementIntentPerMille', divisor: 15 },
  ]),
  kingdoms: Object.freeze([
    { kind: 'perMille', signal: 'settlementIntentPerMille', divisor: 9 },
    { kind: 'count', signal: 'settlementLotCount', multiplier: 5 },
  ]),
  faith: Object.freeze([
    { kind: 'biomeEqualsOrCount', biomeId: 'forest_village', delta: 35, fallbackSignal: 'npcCount', fallbackMultiplier: 2 },
  ]),
  dungeon: Object.freeze([
    { kind: 'perMille', signal: 'dungeonPressurePerMille', divisor: 5 },
    { kind: 'perMille', signal: 'terrainStonePerMille', divisor: 8 },
  ]),
  fear: Object.freeze([
    { kind: 'perMille', signal: 'dangerPressurePerMille', divisor: 5 },
    { kind: 'perMille', signal: 'terrainForestPerMille', divisor: 18 },
  ]),
  cycles: Object.freeze([
    { kind: 'perMille', signal: 'terrainForestPerMille', divisor: 16 },
    { kind: 'perMille', signal: 'resourceDensityPerMille', divisor: 20 },
  ]),
});

function clampLayerValue(value: number): number {
  if (!Number.isFinite(value)) return BASE_LAYER_VALUE;
  return Math.max(MIN_LAYER_VALUE, Math.min(MAX_LAYER_VALUE, Math.trunc(value)));
}

function clampPerMille(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1000, Math.trunc(value)));
}

function numericSignal(signals: CanonicalLayerSeedSignals, key: CanonicalNumericSignalKey): number {
  return Number(signals[key]);
}

function perMilleBias(value: number, divisor: number): number {
  const safeDivisor = Math.trunc(divisor);
  if (safeDivisor === 0) return 0;

  const raw = Math.trunc((clampPerMille(value) - 500) / Math.abs(safeDivisor));
  return safeDivisor < 0 ? -Math.max(0, raw) : raw;
}

function evaluateRule(rule: CanonicalSignalBalanceRule, signals: CanonicalLayerSeedSignals): number {
  switch (rule.kind) {
    case 'perMille':
      return perMilleBias(numericSignal(signals, rule.signal), rule.divisor);
    case 'count': {
      const raw = Math.max(0, Math.trunc(numericSignal(signals, rule.signal))) * rule.multiplier;
      return typeof rule.cap === 'number' ? Math.min(rule.cap, raw) : raw;
    }
    case 'biomeEqualsOrCount':
      return signals.biomeId === rule.biomeId
        ? rule.delta
        : Math.max(0, Math.trunc(numericSignal(signals, rule.fallbackSignal))) * rule.fallbackMultiplier;
  }
}

export function calculateCanonicalSignalLayerDeltas(
  signals: CanonicalLayerSeedSignals | null | undefined,
  matrix: CanonicalSignalBalanceMatrix = CANONICAL_SIGNAL_BALANCE_MATRIX,
): Readonly<Record<KappaLayerKey, number>> {
  const deltas = {} as Record<KappaLayerKey, number>;
  for (const key of CANONICAL_LAYER_ORDER) deltas[key] = 0;

  if (!signals) return Object.freeze(deltas);

  for (const layer of CANONICAL_LAYER_ORDER) {
    const rules = matrix[layer] ?? [];
    deltas[layer] = rules.reduce((sum, rule) => sum + evaluateRule(rule, signals), 0);
  }

  return Object.freeze(deltas);
}

export function applyCanonicalSignalBalance(
  values: Record<KappaLayerKey, number>,
  signals: CanonicalLayerSeedSignals | null | undefined,
  matrix: CanonicalSignalBalanceMatrix = CANONICAL_SIGNAL_BALANCE_MATRIX,
): void {
  const deltas = calculateCanonicalSignalLayerDeltas(signals, matrix);
  for (const layer of CANONICAL_LAYER_ORDER) {
    values[layer] = clampLayerValue(values[layer] + deltas[layer]);
  }
}

export function getCanonicalSignalBalanceSnapshot(): readonly Readonly<{
  layer: KappaLayerKey;
  rules: readonly CanonicalSignalBalanceRule[];
}>[] {
  return Object.freeze(CANONICAL_LAYER_ORDER.map((layer) => Object.freeze({
    layer,
    rules: Object.freeze([...(CANONICAL_SIGNAL_BALANCE_MATRIX[layer] ?? [])]),
  })));
}
