/**
 * FamilyHouseRegistry.test.ts
 *
 * Deterministic tests for NPC Lineage + House Registry system.
 * The tests intentionally exercise the public manager path, not a parallel fake registry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FamilyHouseRegistry,
  NPCCoupleEligibilityEngine,
  DescendantArchetypeEngine,
  NPCLineageManager,
  NPCState,
  HouseState,
  SettlementState,
  LineageStats,
} from './FamilyHouseRegistry';

describe('NPC Lineage + House Registry - ARE Truth Path', () => {
  let registry: FamilyHouseRegistry;
  let eligibilityEngine: NPCCoupleEligibilityEngine;
  let archetypeEngine: DescendantArchetypeEngine;
  let lineageManager: NPCLineageManager;

  const createTestStats = (seed = 10): LineageStats => ({
    strength: seed,
    agility: seed + 1,
    intelligence: seed + 2,
    stamina: seed + 3,
    charisma: seed + 4,
    luck: seed + 5,
  });

  const createTestNPC = (id: string, overrides: Partial<NPCState> = {}): NPCState => ({
    id,
    stats: createTestStats(id.charCodeAt(0)),
    traits: ['tester'],
    lineageId: undefined,
    houseId: undefined,
    settlementId: undefined,
    birthTick: 0,
    generation: 0,
    ...overrides,
  });

  const createTestHouse = (id: string, settlementId: string, overrides: Partial<HouseState> = {}): HouseState => ({
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
    ...overrides,
  });

  const createTestSettlement = (id: string, overrides: Partial<SettlementState> = {}): SettlementState => ({
    id,
    capacity: 100,
    population: 10,
    foodSupply: 100,
    housingUnits: 20,
    settlementType: 'village',
    tick: 0,
    ...overrides,
  });

  const npcFromLineage = (id: string, lineageId: string): NPCState => {
    const node = registry.getLineage(lineageId);
    if (!node) throw new Error(`missing lineage ${lineageId}`);
    return {
      id,
      lineageId: node.id,
      houseId: node.houseId,
      settlementId: node.settlementId,
      stats: node.stats,
      traits: node.traits,
      birthTick: node.birthTick,
      generation: node.generation,
    };
  };

  beforeEach(() => {
    registry = new FamilyHouseRegistry();
    eligibilityEngine = new NPCCoupleEligibilityEngine(registry);
    archetypeEngine = new DescendantArchetypeEngine(registry);
    lineageManager = new NPCLineageManager(registry);
  });

  describe('Determinism', () => {
    it('same input + same tick produces identical lineageHash', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_1' });
      const settlement = createTestSettlement('settlement_1');

      const result1 = eligibilityEngine.calculatePairEligibility({ npcA, npcB, settlement, tick: 1000 });
      const result2 = eligibilityEngine.calculatePairEligibility({ npcA, npcB, settlement, tick: 1000 });
      const result3 = eligibilityEngine.calculatePairEligibility({ npcA, npcB, settlement, tick: 1000 });

      expect(result1.lineageHash).toBe(result2.lineageHash);
      expect(result2.lineageHash).toBe(result3.lineageHash);
    });

    it('different ticks produce different lineageHash values', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_1' });
      const settlement = createTestSettlement('settlement_1');

      const result1000 = eligibilityEngine.calculatePairEligibility({ npcA, npcB, settlement, tick: 1000 });
      const result2000 = eligibilityEngine.calculatePairEligibility({ npcA, npcB, settlement, tick: 2000 });

      expect(result1000.lineageHash).not.toBe(result2000.lineageHash);
    });

    it('descendant archetype is stable for same parents and tick', () => {
      const parentA = createTestNPC('parent_a', { houseId: 'house_1', settlementId: 'settlement_1' });
      const parentB = createTestNPC('parent_b', { houseId: 'house_1', settlementId: 'settlement_1' });
      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));

      const result1 = archetypeEngine.generateArchetype(parentA, parentB, 'house_1', 'settlement_1', 1000);
      const result2 = archetypeEngine.generateArchetype(parentA, parentB, 'house_1', 'settlement_1', 1000);

      expect(result1.archetypeSeed).toBe(result2.archetypeSeed);
      expect(result1.stats).toEqual(result2.stats);
      expect(result1.traits).toEqual(result2.traits);
    });
  });

  describe('Pair eligibility', () => {
    it('approves eligible pairs in the same real settlement', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_1' });
      const settlement = createTestSettlement('settlement_1');

      const result = eligibilityEngine.calculatePairEligibility({ npcA, npcB, settlement, tick: 1000 });

      expect(result.eligible).toBe(true);
    });

    it('rejects pairs when either NPC is outside the supplied runtime settlement', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_2' });
      const settlement = createTestSettlement('settlement_1');

      const result = eligibilityEngine.calculatePairEligibility({ npcA, npcB, settlement, tick: 1000 });

      expect(result.eligible).toBe(false);
      expect(result.rejectionReason).toBe('different_settlement');
    });

    it('rejects when settlement is at capacity', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_1' });
      const settlement = createTestSettlement('settlement_1', { population: 100, capacity: 100 });

      const result = eligibilityEngine.calculatePairEligibility({ npcA, npcB, settlement, tick: 1000 });

      expect(result.eligible).toBe(false);
      expect(result.rejectionReason).toBe('settlement_full');
    });

    it('rejects when house is inactive', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1', houseId: 'house_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_1' });
      const settlement = createTestSettlement('settlement_1');
      registry.registerHouse(createTestHouse('house_1', 'settlement_1', { isActive: false }));

      const result = eligibilityEngine.calculatePairEligibility({
        npcA,
        npcB,
        settlement,
        houseA: registry.getHouse('house_1'),
        tick: 1000,
      });

      expect(result.eligible).toBe(false);
      expect(result.rejectionReason).toBe('house_not_active');
    });
  });

  describe('Population pressure cap', () => {
    it('allows low-pressure settlements', () => {
      const settlement = createTestSettlement('settlement_1', { population: 10, capacity: 100, foodSupply: 100, housingUnits: 20 });
      const pressure = eligibilityEngine.calculatePopulationPressure(settlement, 1000);

      expect(pressure.canSpawn).toBe(true);
      expect(pressure.pressure).toBeLessThan(0.5);
    });

    it('blocks when food cannot support another NPC', () => {
      const settlement = createTestSettlement('settlement_1', { population: 10, foodSupply: -1000, housingUnits: 20 });
      const pressure = eligibilityEngine.calculatePopulationPressure(settlement, 1000);

      expect(pressure.canSpawn).toBe(false);
      expect(pressure.limitingFactor).toBe('food');
    });

    it('blocks when housing cannot support another NPC', () => {
      const settlement = createTestSettlement('settlement_1', { population: 20, foodSupply: 1000, housingUnits: 5 });
      const pressure = eligibilityEngine.calculatePopulationPressure(settlement, 1000);

      expect(pressure.canSpawn).toBe(false);
      expect(pressure.limitingFactor).toBe('housing');
    });
  });

  describe('Lineage node creation', () => {
    it('creates descendant only after real eligibility passes', () => {
      const settlement = createTestSettlement('settlement_1');
      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));
      const parentA = createTestNPC('parent_a', { houseId: 'house_1', settlementId: 'settlement_1', generation: 2 });
      const parentB = createTestNPC('parent_b', { houseId: 'house_1', settlementId: 'settlement_1', generation: 3 });

      const descendant = lineageManager.createDescendant(parentA, parentB, 'house_1', settlement, 1000);

      expect(descendant.generation).toBe(4);
      expect(descendant.birthTick).toBe(1000);
      expect(descendant.settlementId).toBe('settlement_1');
      expect(registry.getLineage(descendant.id)).toBeDefined();
    });

    it('does not register a descendant when real settlement pressure rejects birth', () => {
      const settlement = createTestSettlement('settlement_1', { population: 100, capacity: 100 });
      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));
      const parentA = createTestNPC('parent_a', { houseId: 'house_1', settlementId: 'settlement_1' });
      const parentB = createTestNPC('parent_b', { houseId: 'house_1', settlementId: 'settlement_1' });

      expect(() => lineageManager.createDescendant(parentA, parentB, 'house_1', settlement, 1000))
        .toThrow('npc_pair_not_eligible:settlement_full');
      expect(registry.getLineagesBySettlement('settlement_1')).toHaveLength(0);
      expect(registry.getBirthEvents()).toHaveLength(0);
    });

    it('creates founding lineage and canonical birth event', () => {
      const foundingNode = lineageManager.createFoundingLineage('founder_1', 'house_1', 'settlement_1', 100, createTestStats());
      const birthEvents = registry.getBirthEvents();

      expect(foundingNode.generation).toBe(0);
      expect(foundingNode.traits).toContain('founder');
      expect(birthEvents).toHaveLength(1);
      expect(birthEvents[0].lineageId).toBe(foundingNode.id);
      expect(birthEvents[0].cause).toBe('founder');
    });

    it('records descendant births in the canonical birth journal for game-data persistence', () => {
      const settlement = createTestSettlement('settlement_1');
      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));
      const parentA = createTestNPC('parent_a', { houseId: 'house_1', settlementId: 'settlement_1' });
      const parentB = createTestNPC('parent_b', { houseId: 'house_1', settlementId: 'settlement_1' });

      const descendant = lineageManager.createDescendant(parentA, parentB, 'house_1', settlement, 1000);
      const birthEvents = registry.getBirthEvents();

      expect(birthEvents).toHaveLength(1);
      expect(birthEvents[0]).toMatchObject({
        lineageId: descendant.id,
        lineageHash: descendant.lineageHash,
        settlementId: 'settlement_1',
        birthTick: 1000,
        cause: 'eligible_pair',
      });
      expect(birthEvents[0].pressureAtDecision.canSpawn).toBe(true);
    });
  });

  describe('Family graph traversal', () => {
    it('traverses both parents when checking close relatedness', () => {
      const settlement = createTestSettlement('settlement_1');
      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));

      const father = lineageManager.createFoundingLineage('father', 'house_1', 'settlement_1', 100, createTestStats(10));
      const mother = lineageManager.createFoundingLineage('mother', 'house_1', 'settlement_1', 101, createTestStats(20));
      const fatherNpc = npcFromLineage('father', father.id);
      const motherNpc = npcFromLineage('mother', mother.id);

      const childA = lineageManager.createDescendant(fatherNpc, motherNpc, 'house_1', settlement, 1000);
      const childB = lineageManager.createDescendant(motherNpc, fatherNpc, 'house_1', settlement, 1001);
      const childANpc = npcFromLineage('child_a', childA.id);
      const childBNpc = npcFromLineage('child_b', childB.id);

      const result = lineageManager.checkPairEligibility({ npcA: childANpc, npcB: childBNpc, settlement, tick: 2000 });

      expect(registry.getAncestry(childA.id).map((node) => node.id)).toContain(mother.id);
      expect(registry.getAncestry(childA.id).map((node) => node.id)).toContain(father.id);
      expect(result.eligible).toBe(false);
      expect(result.rejectionReason).toBe('too_closely_related');
    });
  });

  describe('Serialization', () => {
    it('serializes and deserializes registry, lineages, and birth journal through the manager registry', () => {
      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));
      const foundingNode = lineageManager.createFoundingLineage('founder_1', 'house_1', 'settlement_1', 100, createTestStats());
      const serialized = lineageManager.serialize();

      const newManager = new NPCLineageManager();
      newManager.load(serialized);

      expect(newManager.getRegistry().getHouse('house_1')).toBeDefined();
      expect(newManager.getRegistry().getLineage(foundingNode.id)).toBeDefined();
      expect(newManager.getRegistry().getBirthEvents()).toHaveLength(1);
    });
  });

  describe('Hard constraints', () => {
    it('uses tick input rather than wall-clock time', () => {
      const settlement = createTestSettlement('settlement_1');
      const pressure1 = eligibilityEngine.calculatePopulationPressure(settlement, 1000);
      const pressure2 = eligibilityEngine.calculatePopulationPressure(settlement, 1000);

      expect(pressure1).toEqual(pressure2);
    });

    it('uses seeded ARE RNG rather than Math.random in archetype flow', () => {
      const npcA = createTestNPC('npc_a', { houseId: 'house_1', settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { houseId: 'house_1', settlementId: 'settlement_1' });
      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));

      const result1 = archetypeEngine.generateArchetype(npcA, npcB, 'house_1', 'settlement_1', 1000);
      const result2 = archetypeEngine.generateArchetype(npcA, npcB, 'house_1', 'settlement_1', 1000);

      expect(result1).toEqual(result2);
    });
  });
});
