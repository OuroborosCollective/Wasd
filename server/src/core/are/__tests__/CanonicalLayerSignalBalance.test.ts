import { describe, expect, it } from 'vitest';

import { AREShadowAdapter } from '../AREShadowAdapter.js';
import type { CanonicalLayerSeedSignals } from '../CanonicalLayerSeed.js';
import {
  CANONICAL_SIGNAL_BALANCE_MATRIX,
  CANONICAL_SIGNAL_BALANCE_VERSION,
  applyCanonicalSignalBalance,
  calculateCanonicalSignalLayerDeltas,
  getCanonicalSignalBalanceSnapshot,
} from '../CanonicalLayerSignalBalance.js';
import { KAPPA_LAYER_NAMES, type KappaLayerKey } from '../KappaLayers.js';

function createSignals(overrides: Partial<CanonicalLayerSeedSignals> = {}): CanonicalLayerSeedSignals {
  return {
    signalVersion: 1,
    source: 'OuroborosWorldDirectorV1',
    biomeId: 'forest',
    resourceDensityPerMille: 700,
    treeDensityPerMille: 800,
    settlementChancePerMille: 650,
    heightBaseKappa: 500,
    heightVarianceKappa: 120,
    terrainGrassPerMille: 600,
    terrainForestPerMille: 650,
    terrainStonePerMille: 700,
    terrainRoadPerMille: 600,
    roadCellCount: 60,
    roadEdgeCount: 3,
    settlementLotCount: 5,
    settlementIntentPerMille: 750,
    resourcePropCount: 4,
    structurePropCount: 2,
    collisionCellCount: 11,
    npcCount: 13,
    dangerPressurePerMille: 800,
    dungeonPressurePerMille: 900,
    signature: 'test-signal-signature',
    ...overrides,
  };
}

function matrixSnapshotFingerprint(): string {
  return getCanonicalSignalBalanceSnapshot()
    .map((entry) => `${entry.layer}:${entry.rules.map((rule) => JSON.stringify(rule)).join(',')}`)
    .join('|');
}

describe('CanonicalLayerSignalBalance', () => {
  it('exposes a deterministic matrix snapshot covering every Kappa layer', () => {
    const snapshot = getCanonicalSignalBalanceSnapshot();
    const expectedLayers = Object.keys(KAPPA_LAYER_NAMES).sort();

    expect(CANONICAL_SIGNAL_BALANCE_VERSION).toBe(1);
    expect(snapshot.map((entry) => entry.layer)).toEqual(expectedLayers);
    expect(snapshot.every((entry) => entry.rules.length > 0)).toBe(true);
  });

  it('returns detached frozen rules from the diagnostic snapshot', () => {
    const firstSnapshot = getCanonicalSignalBalanceSnapshot();
    const secondSnapshot = getCanonicalSignalBalanceSnapshot();
    const firstRule = firstSnapshot.find((entry) => entry.layer === 'ecology')!.rules[0];
    const secondRule = secondSnapshot.find((entry) => entry.layer === 'ecology')!.rules[0];
    const matrixRule = CANONICAL_SIGNAL_BALANCE_MATRIX.ecology[0];

    expect(firstRule).toEqual(matrixRule);
    expect(secondRule).toEqual(matrixRule);
    expect(firstRule).not.toBe(matrixRule);
    expect(secondRule).not.toBe(matrixRule);
    expect(firstRule).not.toBe(secondRule);
    expect(Object.isFrozen(firstRule)).toBe(true);
    expect(Object.isFrozen(secondRule)).toBe(true);
  });

  it('records the matrix as an ARE shadow probe without becoming runtime truth', () => {
    const fingerprint = matrixSnapshotFingerprint();
    const first = AREShadowAdapter.recordShadowProbe({
      source: 'test',
      testFile: 'server/src/core/are/__tests__/CanonicalLayerSignalBalance.test.ts',
      caseName: 'canonical signal balance matrix snapshot',
      tick: 2014,
      status: 'pass',
      inputHash: CANONICAL_SIGNAL_BALANCE_VERSION,
      outputHash: fingerprint,
      expectedHash: fingerprint,
      recommendation: 'keep matrix changes explicit and versioned',
      metadata: {
        truthPath: 'shadow_only',
        layerCount: Object.keys(KAPPA_LAYER_NAMES).length,
      },
    });
    const repeat = AREShadowAdapter.recordShadowProbe({
      source: 'test',
      testFile: 'server/src/core/are/__tests__/CanonicalLayerSignalBalance.test.ts',
      caseName: 'canonical signal balance matrix snapshot',
      tick: 2014,
      status: 'pass',
      inputHash: CANONICAL_SIGNAL_BALANCE_VERSION,
      outputHash: fingerprint,
      expectedHash: fingerprint,
      recommendation: 'keep matrix changes explicit and versioned',
      metadata: {
        layerCount: Object.keys(KAPPA_LAYER_NAMES).length,
        truthPath: 'shadow_only',
      },
    });

    expect(first.recorded).toBe(true);
    expect(first.probeHash).toBe(repeat.probeHash);
  });

  it('calculates stable signal deltas from biome terrain pressure', () => {
    const deltas = calculateCanonicalSignalLayerDeltas(createSignals());

    expect(deltas.ecology).toBe(94);
    expect(deltas.trade).toBe(85);
    expect(deltas.conflict).toBe(70);
    expect(deltas.dungeon).toBe(105);
    expect(deltas.fear).toBe(68);
    expect(deltas.faith).toBe(26);
  });

  it('uses the forest village faith bias instead of NPC fallback', () => {
    const deltas = calculateCanonicalSignalLayerDeltas(createSignals({ biomeId: 'forest_village' }));
    expect(deltas.faith).toBe(35);
  });

  it('applies matrix deltas without changing unrelated layer keys', () => {
    const values = Object.fromEntries(
      Object.keys(KAPPA_LAYER_NAMES).map((layer) => [layer, 500]),
    ) as Record<KappaLayerKey, number>;

    applyCanonicalSignalBalance(values, createSignals());

    expect(values.ecology).toBe(594);
    expect(values.trade).toBe(585);
    expect(values.dungeon).toBe(605);
    expect(Object.keys(values).sort()).toEqual(Object.keys(KAPPA_LAYER_NAMES).sort());
  });
});
