import { describe, expect, it } from 'vitest';
import { getStarterVillagePois } from '../../world/WorldPoiGenerator';
import { createPoiLineageRuntimeState, LineagePoiRuntimeStateProvider, POI_LINEAGE_HOUSE_ID, POI_LINEAGE_SETTLEMENT_ID } from './LineagePoiRuntimeStateProvider';
import type { WorldPoiSnapshot } from '../../world/WorldPoiTypes';

function camp(id: string, type: 'logging_camp' | 'mining_camp' | 'fishing_camp'): WorldPoiSnapshot {
  return {
    id,
    type,
    title: id,
    position: { x: 1000, y: 2000 },
    chunk: { x: 0, z: 0 },
    interactionRadius: 32,
    tags: [],
  };
}

describe('LineagePoiRuntimeStateProvider', () => {
  it('returns null without real visible poi context', () => {
    const provider = new LineagePoiRuntimeStateProvider();

    expect(provider.getLineageRuntimeState('player_1', 10)).toBeNull();
  });

  it('projects visible vendor and camp NPC sources into lineage runtime state', () => {
    const state = createPoiLineageRuntimeState(100, [
      ...getStarterVillagePois(),
      camp('poi:1:0:logging_camp:0', 'logging_camp'),
    ]);

    expect(state).not.toBeNull();
    expect(state?.settlements[0].id).toBe(POI_LINEAGE_SETTLEMENT_ID);
    expect(state?.houses[0].id).toBe(POI_LINEAGE_HOUSE_ID);
    expect(state?.npcs.map((npc) => npc.id).sort()).toContain('village_trader_001');
    expect(state?.npcs.some((npc) => npc.traits.includes('camp_worker'))).toBe(true);
  });

  it('is deterministic for the same tick and poi set regardless of order', () => {
    const pois = [
      camp('poi:2:0:mining_camp:0', 'mining_camp'),
      ...getStarterVillagePois(),
      camp('poi:1:0:logging_camp:0', 'logging_camp'),
    ];

    const first = createPoiLineageRuntimeState(100, pois);
    const second = createPoiLineageRuntimeState(100, [...pois].reverse());

    expect(first).toEqual(second);
  });
});
