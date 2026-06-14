import { describe, expect, it } from 'vitest';
import {
  FamilyHouseRegistry,
  type HouseState,
  type LineageStats,
  type NPCState,
  type SettlementState,
} from './FamilyHouseRegistry';
import { NPC_LINEAGE_GAME_DATA_PATH, type NpcLineageStorageProvider } from './LineageGameDataWriter';
import { LineageTickRunner } from './LineageTickRunner';
import { createNpcLineageRuntime } from './createNpcLineageRuntime';

class MemoryProvider implements NpcLineageStorageProvider {
  writes: Array<{ target: string; content: string }> = [];
  private dataByTarget = new Map<string, string>();

  read(target: string): string | null {
    return this.dataByTarget.get(target) ?? null;
  }

  write(target: string, content: string): void {
    this.dataByTarget.set(target, content);
    this.writes.push({ target, content });
  }
}

function stats(seed = 10): LineageStats {
  return {
    strength: seed,
    agility: seed + 1,
    intelligence: seed + 2,
    stamina: seed + 3,
    charisma: seed + 4,
    luck: seed + 5,
  };
}

function house(id = 'house_1', settlementId = 'settlement_1'): HouseState {
  return {
    id,
    houseName: `House ${id}`,
    houseReputation: 50,
    inheritancePoints: 50,
    settlementId,
    foundingTick: 0,
    territorySize: 5,
    resourceStored: 100,
    housingCapacity: 10,
    currentPopulation: 1,
    isActive: true,
  };
}

function settlement(overrides: Partial<SettlementState> = {}): SettlementState {
  return {
    id: 'settlement_1',
    capacity: 100,
    population: 10,
    foodSupply: 100,
    housingUnits: 20,
    settlementType: 'village',
    tick: 1000,
    ...overrides,
  };
}

function npc(id: string): NPCState {
  return {
    id,
    houseId: 'house_1',
    settlementId: 'settlement_1',
    stats: stats(id.charCodeAt(0)),
    traits: ['tester'],
    generation: 0,
    birthTick: 0,
  };
}

describe('lineage runtime replay', () => {
  it('replays persisted lineage events into a fresh registry projection', () => {
    const provider = new MemoryProvider();
    const first = createNpcLineageRuntime({ storageProvider: provider, replay: false });
    const created = first.manager.createFoundingLineage('founder_1', 'house_1', 'settlement_1', 100, stats());

    const second = createNpcLineageRuntime({ storageProvider: provider });

    expect(provider.writes).toHaveLength(1);
    expect(provider.writes[0].target).toBe(NPC_LINEAGE_GAME_DATA_PATH);
    expect(second.replayResult.eventsRead).toBe(1);
    expect(second.replayResult.lineagesReplayed).toBe(1);
    expect(second.registry.getLineage(created.id)).toEqual(created);
  });

  it('runs eligible lineage tick candidates once and skips full settlements without writes', () => {
    const provider = new MemoryProvider();
    const registry = new FamilyHouseRegistry();
    registry.registerHouse(house());
    const runtime = createNpcLineageRuntime({ registry, storageProvider: provider, replay: false });
    const runner = new LineageTickRunner(runtime.manager);

    const result = runner.run(2000, [
      { parentA: npc('parent_full_a'), parentB: npc('parent_full_b'), houseId: 'house_1', settlement: settlement({ population: 100, capacity: 100 }) },
      { parentA: npc('parent_ok_a'), parentB: npc('parent_ok_b'), houseId: 'house_1', settlement: settlement() },
    ]);

    expect(result.created).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('npc_pair_not_eligible:settlement_full');
    expect(provider.writes).toHaveLength(1);
  });
});
