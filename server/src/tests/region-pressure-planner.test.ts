import { describe, expect, it } from 'vitest';
import { planRegionPressure } from '../world/RegionPressurePlanner';

const supported = (valuePerMille: number, source = 'test-runtime') => ({
  valuePerMille,
  support: 'supported' as const,
  source,
});

describe('RegionPressurePlanner', () => {
  it('creates the same state for the same tick and explicit input', () => {
    const input = {
      tick: 42,
      regionId: 'starter_village',
      observerChunkKey: '0:0',
      chunkKeys: ['0:1', '0:0', '0:1'],
      resourceSignals: {
        resourcePressurePerMille: supported(180, 'resource-runtime'),
      },
      npcSignals: {
        threatPressurePerMille: supported(240, 'npc-runtime'),
      },
    };

    expect(planRegionPressure(input)).toEqual(planRegionPressure(input));
  });

  it('keeps missing governance and economy signals neutral and marked', () => {
    const state = planRegionPressure({
      tick: 5,
      regionId: 'neutral_region',
      chunkKeys: ['2:2'],
    });

    expect(state.tradePressurePerMille).toEqual({
      valuePerMille: 0,
      support: 'not_supported_yet',
      source: 'not_supported_yet:tradePressurePerMille',
    });
    expect(state.warPressurePerMille).toEqual({
      valuePerMille: 0,
      support: 'not_supported_yet',
      source: 'not_supported_yet:warPressurePerMille',
    });
    expect(state.unsupportedFields).toContain('tradePressurePerMille');
    expect(state.unsupportedFields).toContain('warPressurePerMille');
  });

  it('caps pressure jumps from previous real pressure', () => {
    const previousPressure = planRegionPressure({
      tick: 10,
      regionId: 'volatile_region',
      chunkKeys: ['1:1'],
      npcSignals: {
        threatPressurePerMille: supported(100, 'npc-runtime'),
      },
    });

    const next = planRegionPressure({
      tick: 11,
      regionId: 'volatile_region',
      chunkKeys: ['1:1'],
      npcSignals: {
        threatPressurePerMille: supported(950, 'npc-runtime'),
      },
      previousPressure,
    });

    expect(next.threatPressurePerMille.valuePerMille).toBe(225);
  });

  it('classifies observed, near, summary and sleeping regions from chunk bounds', () => {
    expect(planRegionPressure({ tick: 1, regionId: 'r', observerChunkKey: '0:0', chunkKeys: ['0:1'] }).lodTier).toBe('observed_chunk');
    expect(planRegionPressure({ tick: 1, regionId: 'r', observerChunkKey: '0:0', chunkKeys: ['2:0'] }).lodTier).toBe('near_chunk');
    expect(planRegionPressure({ tick: 1, regionId: 'r', observerChunkKey: '0:0', chunkKeys: ['8:0'] }).lodTier).toBe('region_summary');
    expect(planRegionPressure({ tick: 1, regionId: 'r', observerChunkKey: '0:0', chunkKeys: ['9:0'] }).lodTier).toBe('sleeping_region');
  });
});
