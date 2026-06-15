/**
 * LineageBirthTickIntegration.test.ts
 *
 * Comprehensive tests for the lineage birth tick integration pipeline.
 * Tests cover:
 * - Pure selection from runtime state
 * - Selection-to-tick candidate adaptation
 * - Idempotency checks
 * - Journal write verification
 * - Surface model reconstruction
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  FamilyHouseRegistry,
  NPCLineageManager,
  type HouseState,
  type LineageStats,
  type LineageBirthEvent,
  type NPCState,
  type SettlementState,
} from './FamilyHouseRegistry';
import { NpcLineageGameDataWriter, type NpcLineageStorageProvider, NPC_LINEAGE_GAME_DATA_PATH } from './LineageGameDataWriter';
import { createNpcLineageRuntime } from './createNpcLineageRuntime';
import { selectFromRuntime, createNpcLookup, createSettlementLookup, createHouseLookup, type RuntimeLineageState } from './LineageRuntimeSelection';
import { adaptSelectionsToCandidates, candidateKey } from './LineageRuntimeTickAdapter';
import {
  runLineageBirthTick,
  getCurrentWorldSurface,
  surfaceContainsNode,
  surfaceContainsHouse,
} from './LineageBirthTickIntegration';

/**
 * In-memory storage provider for testing.
 */
class MemoryStorageProvider implements NpcLineageStorageProvider {
  private dataByTarget = new Map<string, string>();
  writes: Array<{ target: string; content: string }> = [];

  read(target: string): string | null {
    return this.dataByTarget.get(target) ?? null;
  }

  write(target: string, content: string): void {
    this.dataByTarget.set(target, content);
    this.writes.push({ target, content });
  }

  clear(): void {
    this.dataByTarget.clear();
    this.writes = [];
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

function house(id = 'house_1', settlementId = 'settlement_1', isActive = true): HouseState {
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
    isActive,
  };
}

function settlement(id = 'settlement_1', overrides: Partial<SettlementState> = {}): SettlementState {
  return {
    id,
    capacity: 100,
    population: 10,
    foodSupply: 100,
    housingUnits: 20,
    settlementType: 'village',
    tick: 1000,
    ...overrides,
  };
}

function npc(id: string, settlementId = 'settlement_1', houseId = 'house_1'): NPCState {
  return {
    id,
    houseId,
    settlementId,
    stats: stats(id.charCodeAt(0)),
    traits: ['tester'],
    generation: 0,
    birthTick: 0,
  };
}

function runtimeState(
  tick: number,
  settlements: SettlementState[],
  houses: HouseState[],
  npcs: NPCState[],
  maxSelectionsPerSettlement?: number
): RuntimeLineageState {
  return Object.freeze({
    tick,
    settlements: Object.freeze(settlements),
    houses: Object.freeze(houses),
    npcs: Object.freeze(npcs),
    maxSelectionsPerSettlement,
  });
}

describe('LineageRuntimeSelection', () => {
  describe('selectFromRuntime', () => {
    it('returns no selection for full settlements', () => {
      const state = runtimeState(
        100,
        [settlement('s1', { population: 100, capacity: 100 })],
        [house('h1', 's1')],
        [npc('a1', 's1', 'h1'), npc('a2', 's1', 'h1')]
      );
      const result = selectFromRuntime(state);
      expect(result).toHaveLength(0);
    });

    it('returns no selection for inactive houses', () => {
      const state = runtimeState(
        100,
        [settlement('s1')],
        [house('h1', 's1', false)],
        [npc('a1', 's1', 'h1'), npc('a2', 's1', 'h1')]
      );
      const result = selectFromRuntime(state);
      expect(result).toHaveLength(0);
    });

    it('returns no selection when fewer than 2 NPCs in house', () => {
      const state = runtimeState(
        100,
        [settlement('s1')],
        [house('h1', 's1')],
        [npc('a1', 's1', 'h1')]
      );
      const result = selectFromRuntime(state);
      expect(result).toHaveLength(0);
    });

    it('returns selection for eligible pair in active house with space', () => {
      const state = runtimeState(
        100,
        [settlement('s1')],
        [house('h1', 's1')],
        [npc('a1', 's1', 'h1'), npc('a2', 's1', 'h1')]
      );
      const result = selectFromRuntime(state);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        firstActorId: 'a1',
        secondActorId: 'a2',
        houseId: 'h1',
        settlementId: 's1',
        tick: 100,
      });
    });

    it('produces deterministic results regardless of input order', () => {
      const state1 = runtimeState(
        100,
        [settlement('s1')],
        [house('h1', 's1')],
        [npc('b', 's1', 'h1'), npc('a', 's1', 'h1')]
      );

      const state2 = runtimeState(
        100,
        [settlement('s1')],
        [house('h1', 's1')],
        [npc('a', 's1', 'h1'), npc('b', 's1', 'h1')]
      );

      const result1 = selectFromRuntime(state1);
      const result2 = selectFromRuntime(state2);

      expect(result1).toEqual(result2);
      expect(result1[0].firstActorId).toBe('a');
      expect(result1[0].secondActorId).toBe('b');
    });

    it('respects maxSelectionsPerSettlement limit', () => {
      const state = runtimeState(
        100,
        [settlement('s1')],
        [
          house('h1', 's1'),
          house('h2', 's1'),
          house('h3', 's1'),
        ],
        [
          npc('a1', 's1', 'h1'), npc('a2', 's1', 'h1'),
          npc('b1', 's1', 'h2'), npc('b2', 's1', 'h2'),
          npc('c1', 's1', 'h3'), npc('c2', 's1', 'h3'),
        ],
        1 // Only 1 selection per settlement
      );
      const result = selectFromRuntime(state);
      expect(result).toHaveLength(1);
    });
  });
});

describe('LineageRuntimeTickAdapter', () => {
  describe('adaptSelectionsToCandidates', () => {
    it('maps valid selection to candidate', () => {
      const npcs = [npc('a1', 's1', 'h1'), npc('a2', 's1', 'h1')];
      const settlements = [settlement('s1')];
      const houses = [house('h1', 's1')];

      const state = runtimeState(100, settlements, houses, npcs);
      const selections = selectFromRuntime(state);

      expect(selections).toHaveLength(1);

      const result = adaptSelectionsToCandidates({
        selections,
        npcsById: createNpcLookup(npcs),
        settlementsById: createSettlementLookup(settlements),
        housesById: createHouseLookup(houses),
        tick: 100,
      });

      expect(result.candidates).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
      expect(result.candidates[0].parentA.id).toBe('a1');
      expect(result.candidates[0].parentB.id).toBe('a2');
    });

    it('skips selection with missing NPC', () => {
      const npcs = [npc('a1', 's1', 'h1')]; // Missing second NPC
      const settlements = [settlement('s1')];
      const houses = [house('h1', 's1')];

      const state = runtimeState(100, settlements, houses, npcs);
      const selections = selectFromRuntime(state);

      expect(selections).toHaveLength(0); // No selection because < 2 NPCs

      // Now test with explicit selection that references missing NPC
      const mockSelection = Object.freeze({
        firstActorId: 'a1',
        secondActorId: 'missing',
        houseId: 'h1',
        settlementId: 's1',
        tick: 100,
      });

      const result = adaptSelectionsToCandidates({
        selections: [mockSelection],
        npcsById: createNpcLookup(npcs),
        settlementsById: createSettlementLookup(settlements),
        housesById: createHouseLookup(houses),
        tick: 100,
      });

      expect(result.candidates).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('second_actor_not_found');
    });

    it('skips selection with missing settlement', () => {
      const npcs = [npc('a1', 's1', 'h1'), npc('a2', 's1', 'h1')];
      const settlements: SettlementState[] = [];
      const houses = [house('h1', 's1')];

      const mockSelection = Object.freeze({
        firstActorId: 'a1',
        secondActorId: 'a2',
        houseId: 'h1',
        settlementId: 's1',
        tick: 100,
      });

      const result = adaptSelectionsToCandidates({
        selections: [mockSelection],
        npcsById: createNpcLookup(npcs),
        settlementsById: createSettlementLookup(settlements),
        housesById: createHouseLookup(houses),
        tick: 100,
      });

      expect(result.candidates).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('settlement_not_found');
    });

    it('skips selection with inactive house', () => {
      const npcs = [npc('a1', 's1', 'h1'), npc('a2', 's1', 'h1')];
      const settlements = [settlement('s1')];
      const houses = [house('h1', 's1', false)];

      const state = runtimeState(100, settlements, houses, npcs);
      const selections = selectFromRuntime(state);

      expect(selections).toHaveLength(0); // Pure selection filters inactive houses

      const mockSelection = Object.freeze({
        firstActorId: 'a1',
        secondActorId: 'a2',
        houseId: 'h1',
        settlementId: 's1',
        tick: 100,
      });

      const result = adaptSelectionsToCandidates({
        selections: [mockSelection],
        npcsById: createNpcLookup(npcs),
        settlementsById: createSettlementLookup(settlements),
        housesById: createHouseLookup(houses),
        tick: 100,
      });

      expect(result.candidates).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('house_inactive');
    });

    it('skips selection for full settlement', () => {
      const npcs = [npc('a1', 's1', 'h1'), npc('a2', 's1', 'h1')];
      const settlements = [settlement('s1', { population: 100, capacity: 100 })];
      const houses = [house('h1', 's1')];

      const state = runtimeState(100, settlements, houses, npcs);
      const selections = selectFromRuntime(state);

      expect(selections).toHaveLength(0); // Pure selection filters full settlements

      const mockSelection = Object.freeze({
        firstActorId: 'a1',
        secondActorId: 'a2',
        houseId: 'h1',
        settlementId: 's1',
        tick: 100,
      });

      const result = adaptSelectionsToCandidates({
        selections: [mockSelection],
        npcsById: createNpcLookup(npcs),
        settlementsById: createSettlementLookup(settlements),
        housesById: createHouseLookup(houses),
        tick: 100,
      });

      expect(result.candidates).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('settlement_full');
    });
  });

  describe('candidateKey', () => {
    it('produces consistent keys regardless of actor order', () => {
      const key1 = candidateKey(100, 's1', 'h1', 'a1', 'a2');
      const key2 = candidateKey(100, 's1', 'h1', 'a2', 'a1');
      expect(key1).toBe(key2);
    });

    it('produces different keys for different ticks', () => {
      const key1 = candidateKey(100, 's1', 'h1', 'a1', 'a2');
      const key2 = candidateKey(200, 's1', 'h1', 'a1', 'a2');
      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different houses', () => {
      const key1 = candidateKey(100, 's1', 'h1', 'a1', 'a2');
      const key2 = candidateKey(100, 's1', 'h2', 'a1', 'a2');
      expect(key1).not.toBe(key2);
    });
  });
});

describe('LineageBirthTickIntegration', () => {
  let storage: MemoryStorageProvider;
  let lineageManager: NPCLineageManager;

  beforeEach(() => {
    storage = new MemoryStorageProvider();
    const runtime = createNpcLineageRuntime({ storageProvider: storage, replay: false });
    lineageManager = runtime.manager;
  });

  describe('runLineageBirthTick', () => {
    it('creates birth event when eligible pair exists', () => {
      // Register house first
      lineageManager.updateHouseSnapshot('house_1', house());

      const result = runLineageBirthTick({
        tick: 100,
        settlements: [settlement()],
        houses: [house()],
        npcs: [npc('parent_a'), npc('parent_b')],
        lineageManager,
      });

      expect(result.lineageResult.created).toHaveLength(1);
      expect(result.lineageResult.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('writes to journal on birth', () => {
      lineageManager.updateHouseSnapshot('house_1', house());

      runLineageBirthTick({
        tick: 100,
        settlements: [settlement()],
        houses: [house()],
        npcs: [npc('parent_a'), npc('parent_b')],
        lineageManager,
      });

      // Check that journal was written
      const journalContent = storage.read(NPC_LINEAGE_GAME_DATA_PATH);
      expect(journalContent).not.toBeNull();
      const records = JSON.parse(journalContent!);
      expect(records).toHaveLength(1);
      expect(records[0].birthTick).toBe(100);
    });

    it('no birth for full settlement', () => {
      const result = runLineageBirthTick({
        tick: 100,
        settlements: [settlement('s1', { population: 100, capacity: 100 })],
        houses: [house('h1', 's1')],
        npcs: [npc('a1', 's1', 'h1'), npc('a2', 's1', 'h1')],
        lineageManager,
      });

      expect(result.lineageResult.created).toHaveLength(0);
      expect(result.surface.points).toHaveLength(0);
    });

    it('no birth for inactive house', () => {
      const result = runLineageBirthTick({
        tick: 100,
        settlements: [settlement('s1')],
        houses: [house('h1', 's1', false)],
        npcs: [npc('a1', 's1', 'h1'), npc('a2', 's1', 'h1')],
        lineageManager,
      });

      expect(result.lineageResult.created).toHaveLength(0);
    });

    it('surface contains new lineage node after birth', () => {
      lineageManager.updateHouseSnapshot('house_1', house());

      const result = runLineageBirthTick({
        tick: 100,
        settlements: [settlement()],
        houses: [house()],
        npcs: [npc('parent_a'), npc('parent_b')],
        lineageManager,
      });

      expect(result.lineageResult.created).toHaveLength(1);
      const createdNode = result.lineageResult.created[0];
      expect(surfaceContainsNode(result.surface, createdNode.id)).toBe(true);
    });

    it('surface contains house group', () => {
      lineageManager.updateHouseSnapshot('house_1', house());

      const result = runLineageBirthTick({
        tick: 100,
        settlements: [settlement()],
        houses: [house()],
        npcs: [npc('parent_a'), npc('parent_b')],
        lineageManager,
      });

      expect(surfaceContainsHouse(result.surface, 'house_1')).toBe(true);
    });

    it('idempotent: same tick with same parents creates no duplicate', () => {
      lineageManager.updateHouseSnapshot('house_1', house());

      // First tick
      const result1 = runLineageBirthTick({
        tick: 100,
        settlements: [settlement()],
        houses: [house()],
        npcs: [npc('parent_a'), npc('parent_b')],
        lineageManager,
      });

      expect(result1.lineageResult.created).toHaveLength(1);
      const createdNode = result1.lineageResult.created[0];

      const initialJournal = storage.read(NPC_LINEAGE_GAME_DATA_PATH);
      const initialRecords = JSON.parse(initialJournal!);

      // Second tick with same state - should skip due to existingBirthKeys
      const result2 = runLineageBirthTick({
        tick: 100,
        settlements: [settlement()],
        houses: [house()],
        npcs: [npc('parent_a'), npc('parent_b')],
        lineageManager,
      });

      // Should skip due to idempotency from existingBirthKeys
      expect(result2.lineageResult.created).toHaveLength(0);
      expect(result2.lineageResult.skipped.length).toBeGreaterThan(0);

      // Journal should not have duplicate
      const finalJournal = storage.read(NPC_LINEAGE_GAME_DATA_PATH);
      const finalRecords = JSON.parse(finalJournal!);
      expect(finalRecords).toHaveLength(initialRecords.length);
      
      // Surface should still have the original node
      expect(surfaceContainsNode(result2.surface, createdNode.id)).toBe(true);
    });
  });

  describe('getCurrentWorldSurface', () => {
    it('returns surface from lineage registry', () => {
      lineageManager.updateHouseSnapshot('house_1', house());

      // Create a birth first
      runLineageBirthTick({
        tick: 100,
        settlements: [settlement()],
        houses: [house()],
        npcs: [npc('parent_a'), npc('parent_b')],
        lineageManager,
      });

      const surface = getCurrentWorldSurface(lineageManager, 100);

      expect(surface.schemaVersion).toBe('world-surface-model.v1');
      expect(surface.tick).toBe(100);
      expect(surface.points.length).toBeGreaterThan(0);
    });
  });

  describe('Journal Replay', () => {
    it('replays journal to reconstruct lineage', () => {
      lineageManager.updateHouseSnapshot('house_1', house());

      // Create birth
      runLineageBirthTick({
        tick: 100,
        settlements: [settlement()],
        houses: [house()],
        npcs: [npc('parent_a'), npc('parent_b')],
        lineageManager,
      });

      // Create new runtime from same storage
      const newRuntime = createNpcLineageRuntime({ storageProvider: storage });
      const newSurface = getCurrentWorldSurface(newRuntime.manager, 100);

      expect(newSurface.points.length).toBe(1);
    });
  });
});
