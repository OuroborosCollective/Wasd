import { describe, expect, it } from 'vitest';
import { FamilyHouseRegistry, NPCLineageManager, type HouseState, type LineageStats } from './FamilyHouseRegistry';
import { createLineageSurfaceModel } from './LineageSurfaceModel';

function stats(seed = 10): LineageStats {
  return { strength: seed, agility: seed + 1, intelligence: seed + 2, stamina: seed + 3, charisma: seed + 4, luck: seed + 5 };
}

function house(): HouseState {
  return {
    id: 'h1',
    houseName: 'House One',
    houseReputation: 10,
    inheritancePoints: 0,
    settlementId: 's1',
    foundingTick: 0,
    territorySize: 1,
    resourceStored: 0,
    housingCapacity: 2,
    currentPopulation: 1,
    isActive: true,
  };
}

describe('LineageSurfaceModel', () => {
  it('projects registered lineage state into renderable surface points', () => {
    const registry = new FamilyHouseRegistry();
    registry.registerHouse(house());
    const manager = new NPCLineageManager(registry);
    const node = manager.createFoundingLineage('founder', 'h1', 's1', 100, stats());

    const model = createLineageSurfaceModel(registry, 1000);

    expect(model.schemaVersion).toBe('lineage-surface-model.v1');
    expect(model.houses).toHaveLength(1);
    expect(model.nodes).toHaveLength(1);
    expect(model.nodes[0].id).toBe(node.id);
    expect(Number.isFinite(model.nodes[0].x)).toBe(true);
    expect(Number.isFinite(model.nodes[0].y)).toBe(true);
    expect(Number.isFinite(model.nodes[0].z)).toBe(true);
  });

  it('derives visible house groups from replayed lineage nodes without house snapshots', () => {
    const registry = new FamilyHouseRegistry();
    const manager = new NPCLineageManager(registry);
    manager.createFoundingLineage('founder', 'h_missing', 's1', 100, stats());

    const model = createLineageSurfaceModel(registry, 1000);

    expect(model.nodes).toHaveLength(1);
    expect(model.houses).toHaveLength(1);
    expect(model.houses[0]).toMatchObject({ id: 'h_missing', settlementId: 's1', population: 1, active: true });
  });
});
