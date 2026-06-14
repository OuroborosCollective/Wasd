import { describe, expect, it } from 'vitest';
import {
  FamilyHouseRegistry,
  NPCLineageManager,
  type HouseState,
  type LineageBirthEvent,
  type LineageStats,
  type NPCState,
  type SettlementState,
} from './FamilyHouseRegistry';
import { LineageTickRunner } from './LineageTickRunner';
import { readLineageJournalRecords, type NpcLineageStorageProvider } from './LineageGameDataWriter';

class MemoryProvider implements NpcLineageStorageProvider {
  constructor(private readonly raw: string | null) {}
  read(_target: string): string | null { return this.raw; }
  write(_target: string, _content: string): void { return; }
}

function stats(seed = 10): LineageStats {
  return { strength: seed, agility: seed + 1, intelligence: seed + 2, stamina: seed + 3, charisma: seed + 4, luck: seed + 5 };
}

function house(): HouseState {
  return {
    id: 'house_1',
    houseName: 'House One',
    houseReputation: 50,
    inheritancePoints: 50,
    settlementId: 'settlement_1',
    foundingTick: 0,
    territorySize: 5,
    resourceStored: 100,
    housingCapacity: 10,
    currentPopulation: 1,
    isActive: true,
  };
}

function settlement(overrides: Partial<SettlementState> = {}): SettlementState {
  return { id: 'settlement_1', capacity: 100, population: 10, foodSupply: 100, housingUnits: 20, settlementType: 'village', tick: 1000, ...overrides };
}

function npc(id: string): NPCState {
  return { id, houseId: 'house_1', settlementId: 'settlement_1', stats: stats(id.charCodeAt(0)), traits: ['tester'], generation: 0, birthTick: 0 };
}

describe('lineage hotfixes', () => {
  it('backfills legacy journal records without node snapshots', () => {
    const legacy = JSON.stringify([{ eventHash: 'e1', lineageId: 'l1', lineageHash: 'h1', parentLineageHashes: [], houseId: 'house_1', settlementId: 'settlement_1', birthTick: 1, pairEligibilityHash: 'h1', pressureAtDecision: { pressure: 0, canSpawn: true, limitingFactor: null, maxPopulation: 10 }, cause: 'founder' }]);
    const records = readLineageJournalRecords(new MemoryProvider(legacy));
    expect(records).toHaveLength(1);
    expect(records[0].nodeSnapshot.id).toBe('l1');
  });

  it('carries settlement population forward inside one tick', () => {
    const registry = new FamilyHouseRegistry();
    registry.registerHouse(house());
    const runner = new LineageTickRunner(new NPCLineageManager(registry));
    const nearFull = settlement({ population: 99, capacity: 100, housingUnits: 100 });
    const result = runner.run(1000, [
      { parentA: npc('a1'), parentB: npc('b1'), houseId: 'house_1', settlement: nearFull, tick: 1000 },
      { parentA: npc('a2'), parentB: npc('b2'), houseId: 'house_1', settlement: nearFull, tick: 1000 },
    ]);
    expect(result.created).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('npc_pair_not_eligible:settlement_full');
  });

  it('propagates non-eligibility persistence failures', () => {
    const registry = new FamilyHouseRegistry();
    registry.registerHouse(house());
    const failingSink = { record(_event: LineageBirthEvent): void { throw new Error('journal_failed'); } };
    const runner = new LineageTickRunner(new NPCLineageManager(registry, failingSink));
    expect(() => runner.run(1000, [{ parentA: npc('a1'), parentB: npc('b1'), houseId: 'house_1', settlement: settlement(), tick: 1000 }])).toThrow('journal_failed');
  });
});
