import { describe, expect, it } from 'vitest';
import type { HouseState, LineageStats, NPCState, SettlementState } from './FamilyHouseRegistry';
import { createNpcLineageRuntime } from './createNpcLineageRuntime';
import type { NpcLineageStorageProvider } from './LineageGameDataWriter';
import { runLineageBirthForSnapshot, type LineageRuntimeStateProvider } from './LineageBirthSnapshotBridge';

class MemoryStorageProvider implements NpcLineageStorageProvider {
  private readonly data = new Map<string, string>();
  readonly writes: string[] = [];

  read(target: string): string | null {
    return this.data.get(target) ?? null;
  }

  write(target: string, content: string): void {
    this.data.set(target, content);
    this.writes.push(content);
  }
}

function stats(seed = 10): LineageStats {
  return { strength: seed, agility: seed + 1, intelligence: seed + 2, stamina: seed + 3, charisma: seed + 4, luck: seed + 5 };
}

function house(): HouseState {
  return {
    id: 'house_1',
    houseName: 'House One',
    houseReputation: 50,
    inheritancePoints: 25,
    settlementId: 'settlement_1',
    foundingTick: 0,
    territorySize: 3,
    resourceStored: 100,
    housingCapacity: 10,
    currentPopulation: 2,
    isActive: true,
  };
}

function settlement(tick: number): SettlementState {
  return {
    id: 'settlement_1',
    capacity: 100,
    population: 10,
    foodSupply: 100,
    housingUnits: 20,
    settlementType: 'village',
    tick,
  };
}

function npc(id: string): NPCState {
  return {
    id,
    houseId: 'house_1',
    settlementId: 'settlement_1',
    stats: stats(id.charCodeAt(0)),
    traits: ['runtime'],
    generation: 0,
    birthTick: 0,
  };
}

function provider(tick: number): LineageRuntimeStateProvider {
  return {
    getLineageRuntimeState: () => ({
      tick,
      settlements: [settlement(tick)],
      houses: [house()],
      npcs: [npc('npc_a'), npc('npc_b')],
      maxSelectionsPerSettlement: 1,
    }),
  };
}

describe('LineageBirthSnapshotBridge', () => {
  it('does not create fake births without a runtime provider', async () => {
    const result = await runLineageBirthForSnapshot({ playerId: 'player_1', logicalIndex: 100 });

    expect(result.triggered).toBe(false);
    expect(result.reason).toBe('no_runtime_provider');
    expect(result.birthsCreated).toBe(0);
  });

  it('runs lineage birth from injected runtime state before snapshot composition', async () => {
    const storage = new MemoryStorageProvider();
    const runtime = createNpcLineageRuntime({ storageProvider: storage, replay: false });

    const result = await runLineageBirthForSnapshot({
      playerId: 'player_1',
      logicalIndex: 100,
      provider: provider(100),
      runtime,
    });

    expect(result.triggered).toBe(true);
    expect(result.reason).toBe('ran');
    expect(result.birthsCreated).toBe(1);
    expect(storage.writes).toHaveLength(1);
    expect(result.result?.surface.points).toHaveLength(1);
    expect(result.result?.surface.groups).toHaveLength(1);
  });

  it('is retry-safe for the same tick and parent lineage identities', async () => {
    const storage = new MemoryStorageProvider();
    const runtime = createNpcLineageRuntime({ storageProvider: storage, replay: false });

    const first = await runLineageBirthForSnapshot({ playerId: 'player_1', logicalIndex: 100, provider: provider(100), runtime });
    const second = await runLineageBirthForSnapshot({ playerId: 'player_1', logicalIndex: 100, provider: provider(100), runtime });

    expect(first.birthsCreated).toBe(1);
    expect(second.birthsCreated).toBe(0);
    expect(second.birthsSkipped).toBe(1);
    expect(storage.writes).toHaveLength(1);
  });
});
