import type { CanonicalLayerSeedSignals, CanonicalSeedBiomeId } from './CanonicalLayerSeed.js';
import { KAPPA_LAYER_CONSTANTS, KAPPA_LAYER_NAMES, type KappaLayerKey } from './KappaLayers.js';

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

function perMille(signal: CanonicalNumericSignalKey, divisor: number): CanonicalSignalBalanceRule {
  return Object.freeze({ kind: 'perMille' as const, signal, divisor });
}

function count(signal: CanonicalNumericSignalKey, multiplier: number, cap?: number): CanonicalSignalBalanceRule {
  return Object.freeze(typeof cap === 'number'
    ? { kind: 'count' as const, signal, multiplier, cap }
    : { kind: 'count' as const, signal, multiplier });
}

function biomeEqualsOrCount(
  biomeId: CanonicalSeedBiomeId,
  delta: number,
  fallbackSignal: CanonicalNumericSignalKey,
  fallbackMultiplier: number,
): CanonicalSignalBalanceRule {
  return Object.freeze({ kind: 'biomeEqualsOrCount' as const, biomeId, delta, fallbackSignal, fallbackMultiplier });
}

export const CANONICAL_SIGNAL_BALANCE_MATRIX: CanonicalSignalBalanceMatrix = Object.freeze({
  ecology: Object.freeze([
    perMille('treeDensityPerMille', 5),
    perMille('terrainForestPerMille', 8),
    perMille('resourceDensityPerMille', 12),
  ]),
  market: Object.freeze([
    perMille('resourceDensityPerMille', 8),
    perMille('settlementIntentPerMille', 12),
  ]),
  physiology: Object.freeze([
    perMille('terrainGrassPerMille', 14),
    perMille('treeDensityPerMille', 16),
    perMille('dangerPressurePerMille', -18),
  ]),
  trade: Object.freeze([
    perMille('terrainRoadPerMille', 5),
    perMille('settlementIntentPerMille', 12),
    count('roadCellCount', 1, 45),
  ]),
  memory: Object.freeze([
    perMille('settlementIntentPerMille', 10),
    count('npcCount', 3),
  ]),
  politics: Object.freeze([
    perMille('settlementIntentPerMille', 8),
    count('structurePropCount', 4),
  ]),
  conflict: Object.freeze([
    perMille('dangerPressurePerMille', 6),
    perMille('terrainStonePerMille', 10),
  ]),
  economy: Object.freeze([
    perMille('resourceDensityPerMille', 9),
    perMille('settlementIntentPerMille', 15),
  ]),
  kingdoms: Object.freeze([
    perMille('settlementIntentPerMille', 9),
    count('settlementLotCount', 5),
  ]),
  faith: Object.freeze([
    biomeEqualsOrCount('forest_village', 35, 'npcCount', 2),
  ]),
  dungeon: Object.freeze([
    perMille('dungeonPressurePerMille', 5),
    perMille('terrainStonePerMille', 8),
  ]),
  fear: Object.freeze([
    perMille('dangerPressurePerMille', 5),
    perMille('terrainForestPerMille', 18),
  ]),
  cycles: Object.freeze([
    perMille('terrainForestPerMille', 16),
    perMille('resourceDensityPerMille', 20),
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

function cloneSignalBalanceRule(rule: CanonicalSignalBalanceRule): CanonicalSignalBalanceRule {
  return Object.freeze({ ...rule }) as CanonicalSignalBalanceRule;
}

export function calculateCanonicalSignalLayerDeltas(
  signals: CanonicalLayerSeedSignals | null | undefined,
  matrix: CanonicalSignalBalanceMatrix = CANONICAL_SIGNAL_BALANCE_MATRIX,
): Readonly<Record<KappaLayerKey, number>> {
  const deltas = {} as Record<KappaLayerKey, number>;
  for (const key of CANONICAL_LAYER_ORDER) {
    deltas[key] = 0;
  }
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
    rules: Object.freeze((CANONICAL_SIGNAL_BALANCE_MATRIX[layer] ?? []).map(cloneSignalBalanceRule)),
  })));
}
