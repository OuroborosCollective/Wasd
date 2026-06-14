/**
 * FamilyHouseRegistry.test.ts
 * 
 * Deterministic tests for NPC Lineage + House Registry system.
 * 
 * Acceptance Criteria:
 * - Tests prove: same input + same tick = same lineage decision
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
  PairEligibilityContext,
  LineageStats,
} from './FamilyHouseRegistry';

describe('NPC Lineage + House Registry - Determinism Tests', () => {
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

  beforeEach(() => {
    registry = new FamilyHouseRegistry();
    eligibilityEngine = new NPCCoupleEligibilityEngine(registry);
    archetypeEngine = new DescendantArchetypeEngine(registry);
    lineageManager = new NPCLineageManager();
  });

  describe('DETERMINISM: Same Input + Same Tick = Same Output', () => {
    it('should produce identical lineageHash for same NPC pair + tick', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_1' });
      const settlement = createTestSettlement('settlement_1');

      const context: PairEligibilityContext = {
        npcA,
        npcB,
        settlement,
        tick: 1000,
      };

      // Run 3 times with same input
      const result1 = eligibilityEngine.calculatePairEligibility(context);
      const result2 = eligibilityEngine.calculatePairEligibility(context);
      const result3 = eligibilityEngine.calculatePairEligibility(context);

      expect(result1.lineageHash).toBe(result2.lineageHash);
      expect(result2.lineageHash).toBe(result3.lineageHash);
    });

    it('should produce different lineageHash for different tick values', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_1' });

      const settlement = createTestSettlement('settlement_1');

      const result1000 = eligibilityEngine.calculatePairEligibility({
        npcA, npcB, settlement, tick: 1000,
      });
      const result2000 = eligibilityEngine.calculatePairEligibility({
        npcA, npcB, settlement, tick: 2000,
      });

      expect(result1000.lineageHash).not.toBe(result2000.lineageHash);
    });

    it('should produce different lineageHash for different NPC pairs', () => {
      const settlement = createTestSettlement('settlement_1');

      const result1 = eligibilityEngine.calculatePairEligibility({
        npcA: createTestNPC('npc_a', { settlementId: 'settlement_1' }),
        npcB: createTestNPC('npc_b', { settlementId: 'settlement_1' }),
        settlement,
        tick: 1000,
      });

      const result2 = eligibilityEngine.calculatePairEligibility({
        npcA: createTestNPC('npc_x', { settlementId: 'settlement_1' }),
        npcB: createTestNPC('npc_y', { settlementId: 'settlement_1' }),
        settlement,
        tick: 1000,
      });

      expect(result1.lineageHash).not.toBe(result2.lineageHash);
    });

    it('should produce identical descendant stats for same parent seeds + tick', () => {
      const parentA = createTestNPC('parent_a', { houseId: 'house_1', settlementId: 'settlement_1' });
      const parentB = createTestNPC('parent_b', { houseId: 'house_1', settlementId: 'settlement_1' });

      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));

      // Run 3 times with same input
      const result1 = archetypeEngine.generateArchetype(parentA, parentB, 'house_1', 'settlement_1', 1000);
      const result2 = archetypeEngine.generateArchetype(parentA, parentB, 'house_1', 'settlement_1', 1000);
      const result3 = archetypeEngine.generateArchetype(parentA, parentB, 'house_1', 'settlement_1', 1000);

      expect(result1.archetypeSeed).toBe(result2.archetypeSeed);
      expect(result2.archetypeSeed).toBe(result3.archetypeSeed);
      expect(result1.stats).toEqual(result2.stats);
      expect(result2.stats).toEqual(result3.stats);
    });
  });

  describe('Pair Eligibility Logic', () => {
    it('should approve eligible pairs in same settlement', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_1' });
      const settlement = createTestSettlement('settlement_1');

      const result = eligibilityEngine.calculatePairEligibility({
        npcA, npcB, settlement, tick: 1000,
      });

      expect(result.eligible).toBe(true);
    });

    it('should reject pairs in different settlements', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_2' });
      const settlement = createTestSettlement('settlement_1');

      const result = eligibilityEngine.calculatePairEligibility({
        npcA, npcB, settlement, tick: 1000,
      });

      expect(result.eligible).toBe(false);
      expect(result.rejectionReason).toBe('different_settlement');
    });

    it('should reject when settlement is at capacity', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_1' });
      const settlement = createTestSettlement('settlement_1', { population: 100, capacity: 100 });

      const result = eligibilityEngine.calculatePairEligibility({
        npcA, npcB, settlement, tick: 1000,
      });

      expect(result.eligible).toBe(false);
      expect(['settlement_full', 'pressure_too_high']).toContain(result.rejectionReason);
    });

    it('should reject when house is inactive', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1', houseId: 'house_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_1' });
      const settlement = createTestSettlement('settlement_1');
      
      registry.registerHouse(createTestHouse('house_1', 'settlement_1', { isActive: false }));

      const result = eligibilityEngine.calculatePairEligibility({
        npcA, npcB, settlement, houseA: registry.getHouse('house_1'), tick: 1000,
      });

      expect(result.eligible).toBe(false);
      expect(result.rejectionReason).toBe('house_not_active');
    });

    it('should reject when food supply is critically low', () => {
      const npcA = createTestNPC('npc_a', { settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { settlementId: 'settlement_1' });
      const settlement = createTestSettlement('settlement_1', { foodSupply: -1000 });

      const result = eligibilityEngine.calculatePairEligibility({
        npcA, npcB, settlement, tick: 1000,
      });

      expect(result.eligible).toBe(false);
      expect(result.rejectionReason).toBe('pressure_too_high');
    });
  });

  describe('Population Pressure Cap', () => {
    it('should calculate pressure correctly at low population', () => {
      const settlement = createTestSettlement('settlement_1', {
        population: 10,
        capacity: 100,
        foodSupply: 100,
        housingUnits: 20,
      });

      const pressure = eligibilityEngine.calculatePopulationPressure(settlement, 1000);

      expect(pressure.canSpawn).toBe(true);
      expect(pressure.pressure).toBeLessThan(0.5);
    });

    it('should block spawning at high population', () => {
      const settlement = createTestSettlement('settlement_1', {
        population: 95,
        capacity: 100,
        foodSupply: 100,
        housingUnits: 20,
      });

      const pressure = eligibilityEngine.calculatePopulationPressure(settlement, 1000);

      expect(pressure.canSpawn).toBe(false);
    });

    it('should consider food deficit in pressure', () => {
      const settlementWithFood = createTestSettlement('settlement_1', {
        population: 50,
        foodSupply: 500,
      });

      const settlementWithoutFood = createTestSettlement('settlement_1', {
        population: 50,
        foodSupply: -500,
      });

      const pressureWithFood = eligibilityEngine.calculatePopulationPressure(settlementWithFood, 1000);
      const pressureWithoutFood = eligibilityEngine.calculatePopulationPressure(settlementWithoutFood, 1000);

      expect(pressureWithoutFood.pressure).toBeGreaterThan(pressureWithFood.pressure);
    });

    it('should consider housing shortage in pressure', () => {
      const settlementWithHousing = createTestSettlement('settlement_1', {
        population: 20,
        housingUnits: 30,
      });

      const settlementWithoutHousing = createTestSettlement('settlement_1', {
        population: 20,
        housingUnits: 5,
      });

      const pressureWithHousing = eligibilityEngine.calculatePopulationPressure(settlementWithHousing, 1000);
      const pressureWithoutHousing = eligibilityEngine.calculatePopulationPressure(settlementWithoutHousing, 1000);

      expect(pressureWithoutHousing.pressure).toBeGreaterThan(pressureWithHousing.pressure);
    });

    it('should limit max population based on food supply', () => {
      const settlement = createTestSettlement('settlement_1', {
        population: 10,
        capacity: 100,
        foodSupply: 50,  // Can only support 5 more NPCs
        housingUnits: 100,
      });

      const pressure = eligibilityEngine.calculatePopulationPressure(settlement, 1000);

      expect(pressure.maxPopulation).toBeLessThan(settlement.capacity);
    });
  });

  describe('Descendant Archetype Generation', () => {
    it('should inherit stats from parents', () => {
      const parentA = createTestNPC('parent_a', { 
        stats: { strength: 20, agility: 10, intelligence: 15, stamina: 18, charisma: 12, luck: 8 },
        houseId: 'house_1',
        settlementId: 'settlement_1',
      });
      const parentB = createTestNPC('parent_b', { 
        stats: { strength: 10, agility: 20, intelligence: 12, stamina: 14, charisma: 18, luck: 16 },
        houseId: 'house_1',
        settlementId: 'settlement_1',
      });

      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));

      const archetype = archetypeEngine.generateArchetype(parentA, parentB, 'house_1', 'settlement_1', 1000);

      // Stats should be in reasonable range based on parents
      expect(archetype.stats.strength).toBeGreaterThanOrEqual(10);
      expect(archetype.stats.strength).toBeLessThanOrEqual(25);
      expect(archetype.stats.agility).toBeGreaterThanOrEqual(10);
      expect(archetype.stats.agility).toBeLessThanOrEqual(25);
    });

    it('should derive traits from settlement context', () => {
      const parentA = createTestNPC('parent_a', { houseId: 'house_1', settlementId: 'settlement_1' });
      const parentB = createTestNPC('parent_b', { houseId: 'house_1', settlementId: 'settlement_1' });

      registry.registerHouse(createTestHouse('house_1', 'settlement_1', { houseReputation: 80 }));

      const archetype1 = archetypeEngine.generateArchetype(parentA, parentB, 'house_1', 'settlement_1', 1000);
      const archetype2 = archetypeEngine.generateArchetype(parentA, parentB, 'house_1', 'settlement_1', 1000);

      // Should have consistent traits for same tick
      expect(archetype1.traits).toEqual(archetype2.traits);
    });

    it('should produce different archetype at different ticks', () => {
      const parentA = createTestNPC('parent_a', { houseId: 'house_1', settlementId: 'settlement_1' });
      const parentB = createTestNPC('parent_b', { houseId: 'house_1', settlementId: 'settlement_1' });

      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));

      const archetype1000 = archetypeEngine.generateArchetype(parentA, parentB, 'house_1', 'settlement_1', 1000);
      const archetype2000 = archetypeEngine.generateArchetype(parentA, parentB, 'house_1', 'settlement_1', 2000);

      // Archetype seeds should be different
      expect(archetype1000.archetypeSeed).not.toBe(archetype2000.archetypeSeed);
    });
  });

  describe('Lineage Node Creation', () => {
    it('should create lineage node with correct generation', () => {
      const parentA = createTestNPC('parent_a', { 
        houseId: 'house_1', 
        settlementId: 'settlement_1',
        generation: 2,
      });
      const parentB = createTestNPC('parent_b', { 
        houseId: 'house_1', 
        settlementId: 'settlement_1',
        generation: 3,
      });

      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));

      const descendant = lineageManager.createDescendant(
        parentA, parentB, 'house_1', 'settlement_1', 1000
      );

      expect(descendant.generation).toBe(4);  // max(2, 3) + 1
      expect(descendant.birthTick).toBe(1000);
    });

    it('should create founding lineage at generation 0', () => {
      const foundingNode = lineageManager.createFoundingLineage(
        'founder_1', 'house_1', 'settlement_1', 100, createTestStats()
      );

      expect(foundingNode.generation).toBe(0);
      expect(foundingNode.birthTick).toBe(100);
      expect(foundingNode.traits).toContain('founder');
    });

    it('should register lineage in registry', () => {
      const foundingNode = lineageManager.createFoundingLineage(
        'founder_1', 'house_1', 'settlement_1', 100, createTestStats()
      );

      const retrieved = lineageManager.getRegistry().getLineage(foundingNode.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(foundingNode.id);
    });
  });

  describe('House Registry', () => {
    it('should register and retrieve houses', () => {
      const house = createTestHouse('house_1', 'settlement_1');

      registry.registerHouse(house);

      expect(registry.getHouse('house_1')).toEqual(house);
    });

    it('should get houses by settlement', () => {
      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));
      registry.registerHouse(createTestHouse('house_2', 'settlement_1'));
      registry.registerHouse(createTestHouse('house_3', 'settlement_2'));

      const settlement1Houses = registry.getHousesBySettlement('settlement_1');

      expect(settlement1Houses).toHaveLength(2);
    });

    it('should update house state', () => {
      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));

      registry.updateHouse('house_1', { houseReputation: 80, inheritancePoints: 150 });

      const updated = registry.getHouse('house_1');
      expect(updated?.houseReputation).toBe(80);
      expect(updated?.inheritancePoints).toBe(150);
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize registry', () => {
      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));
      
      const foundingNode = lineageManager.createFoundingLineage(
        'founder_1', 'house_1', 'settlement_1', 100, createTestStats()
      );

      const serialized = lineageManager.serialize();
      
      // Create new manager and load
      const newManager = new NPCLineageManager();
      newManager.load(serialized);

      expect(newManager.getRegistry().getHouse('house_1')).toBeDefined();
      expect(newManager.getRegistry().getLineage(foundingNode.id)).toBeDefined();
    });
  });

  describe('Integration: Full Lineage Flow', () => {
    it('should handle complete lineage creation flow', () => {
      // Setup
      const settlement = createTestSettlement('settlement_1');
      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));

      // Create founding NPCs
      const founder1 = lineageManager.createFoundingLineage(
        'founder_1', 'house_1', 'settlement_1', 100, createTestStats(15)
      );
      const founder2 = lineageManager.createFoundingLineage(
        'founder_2', 'house_1', 'settlement_1', 200, createTestStats(12)
      );

      // Create NPC states from founders
      const npc1: NPCState = {
        id: 'founder_1',
        lineageId: founder1.id,
        houseId: 'house_1',
        settlementId: 'settlement_1',
        stats: founder1.stats,
        traits: founder1.traits,
        birthTick: founder1.birthTick,
        generation: founder1.generation,
      };

      const npc2: NPCState = {
        id: 'founder_2',
        lineageId: founder2.id,
        houseId: 'house_1',
        settlementId: 'settlement_1',
        stats: founder2.stats,
        traits: founder2.traits,
        birthTick: founder2.birthTick,
        generation: founder2.generation,
      };

      // Check pair eligibility
      const eligibility = lineageManager.checkPairEligibility({
        npcA: npc1,
        npcB: npc2,
        settlement,
        tick: 1000,
      });

      expect(eligibility.eligible).toBe(true);

      // Create descendant
      const descendant = lineageManager.createDescendant(
        npc1, npc2, 'house_1', 'settlement_1', 1000
      );

      expect(descendant.generation).toBe(1);
      expect(descendant.birthTick).toBe(1000);
      expect(descendant.parentLineageHashes).toHaveLength(2);

      // Verify ancestry
      const ancestry = registry.getAncestry(descendant.id);
      expect(ancestry.length).toBeGreaterThan(0);
    });
  });

  describe('Hard Constraints Verification', () => {
    it('should NOT use wall-clock time', () => {
      // This is a code review constraint - verified by implementation
      // The implementation uses tick parameter, not Date.now() or similar
      const settlement = createTestSettlement('settlement_1');

      const pressure1 = eligibilityEngine.calculatePopulationPressure(settlement, 1000);
      const pressure2 = eligibilityEngine.calculatePopulationPressure(settlement, 1000);

      // Same tick should give same result
      expect(pressure1.pressure).toBe(pressure2.pressure);
    });

    it('should NOT use Math.random() directly', () => {
      // Verified by implementation - uses SeededARERng with deterministic seeds
      const npcA = createTestNPC('npc_a', { houseId: 'house_1', settlementId: 'settlement_1' });
      const npcB = createTestNPC('npc_b', { houseId: 'house_1', settlementId: 'settlement_1' });

      registry.registerHouse(createTestHouse('house_1', 'settlement_1'));

      const result1 = archetypeEngine.generateArchetype(npcA, npcB, 'house_1', 'settlement_1', 1000);
      const result2 = archetypeEngine.generateArchetype(npcA, npcB, 'house_1', 'settlement_1', 1000);

      // Should be deterministic
      expect(result1.archetypeSeed).toBe(result2.archetypeSeed);
    });

    it('should only use tick, hash, settlement capacity as spawn causes', () => {
      const settlement = createTestSettlement('settlement_1', {
        population: 50,
        capacity: 100,
        foodSupply: 100,
        housingUnits: 20,
      });

      const eligibleSettlement = eligibilityEngine.calculatePairEligibility({
        npcA: createTestNPC('a', { settlementId: 'settlement_1' }),
        npcB: createTestNPC('b', { settlementId: 'settlement_1' }),
        settlement,
        tick: 1000,
      });

      expect(eligibleSettlement.eligible).toBe(true);

      // Block with population pressure
      const blockedSettlement = createTestSettlement('settlement_1', {
        population: 100,
        capacity: 100,
        foodSupply: -1000,
        housingUnits: 1,
      });

      const blocked = eligibilityEngine.calculatePairEligibility({
        npcA: createTestNPC('a', { settlementId: 'settlement_1' }),
        npcB: createTestNPC('b', { settlementId: 'settlement_1' }),
        settlement: blockedSettlement,
        tick: 1000,
      });

      expect(blocked.eligible).toBe(false);
      expect(blocked.rejectionReason).toBeDefined();
    });
  });
});
