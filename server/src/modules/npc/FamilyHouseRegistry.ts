/**
 * FamilyHouseRegistry.ts
 * 
 * Deterministic Family/House Registry for NPC Lineage System.
 * Implements the ARE Truth Path: npc_pair_eligibility → family/house registry → lineageHash
 * → descendant archetype from parent seeds → birth tick → population pressure cap
 * 
 * HARD CONSTRAINTS:
 * - No random NPC spawns
 * - No wall-clock timers
 * - No UI-only genealogy
 * - No fake family history without runtime source
 * - Only Tick, Hash, Settlement capacity, Food/Housing, House-State as causes
 * - Lineage-History must be deterministically reproducible
 */

import { createARESeed, stableHash32, SeededARERng } from '../../core/determinism/AREDeterminism';
import { AREHash } from '../../core/are/AREHash';

// ─────────────────────────────────────────────────────────────────────────────
// CORE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface HouseState {
  id: string;
  houseName: string;
  houseReputation: number;           // Snapshot field (not client truth)
  inheritancePoints: number;          // Snapshot/delta field (not client truth)
  settlementId: string;
  foundingTick: number;
  territorySize: number;
  resourceStored: number;
  housingCapacity: number;
  currentPopulation: number;
  isActive: boolean;
}

export interface LineageNode {
  id: string;
  lineageHash: string;               // Stable hash for this lineage decision
  generation: number;
  birthTick: number;                 // Sim-tick based, not wall-clock
  deathTick?: number;
  parentLineageHashes: [string, string] | [string];  // Two parents for descendants
  houseId: string;
  settlementId: string;
  archetypeSeed: number;             // For deterministic archetype generation
  stats: LineageStats;
  traits: string[];
}

export interface LineageStats {
  strength: number;
  agility: number;
  intelligence: number;
  stamina: number;
  charisma: number;
  luck: number;
}

export interface SettlementState {
  id: string;
  capacity: number;                  // Max population for settlement
  population: number;                // Current population
  foodSupply: number;                // Food surplus/deficit
  housingUnits: number;              // Available housing
  settlementType: 'village' | 'city' | 'kingdom' | 'nation';
  tick: number;                     // Current sim-tick for context
}

export interface NPCState {
  id: string;
  lineageId?: string;               // Reference to lineage node
  houseId?: string;
  settlementId?: string;
  stats: LineageStats;
  traits: string[];
  birthTick?: number;
  generation?: number;
}

export interface PopulationPressure {
  pressure: number;                 // 0-1 scale
  canSpawn: boolean;
  limitingFactor: 'capacity' | 'food' | 'housing' | 'house_state' | null;
  maxPopulation: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAIR ELIGIBILITY
// ─────────────────────────────────────────────────────────────────────────────

export interface PairEligibilityContext {
  npcA: NPCState;
  npcB: NPCState;
  houseA?: HouseState;
  houseB?: HouseState;
  settlement: SettlementState;
  tick: number;
}

export interface PairEligibilityResult {
  eligible: boolean;
  lineageHash: string;
  rejectionReason?: 'same_house' | 'different_settlement' | 'pressure_too_high' | 
                   'too_closely_related' | 'house_not_active' | 'settlement_full';
  pressureAtDecision: PopulationPressure;
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY/HOUSE REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export class FamilyHouseRegistry {
  private houses: Map<string, HouseState> = new Map();
  private lineages: Map<string, LineageNode> = new Map();
  private lineageByHouse: Map<string, string[]> = new Map();  // houseId -> lineageIds
  private lineageBySettlement: Map<string, string[]> = new Map();  // settlementId -> lineageIds

  /**
   * Register a new house in the registry.
   * Houses are created deterministically from houseId and founding context.
   */
  registerHouse(house: HouseState): void {
    this.houses.set(house.id, { ...house });
  }

  /**
   * Get house by ID.
   */
  getHouse(id: string): HouseState | undefined {
    return this.houses.get(id);
  }

  /**
   * Get all houses for a settlement.
   */
  getHousesBySettlement(settlementId: string): HouseState[] {
    return Array.from(this.houses.values()).filter(h => h.settlementId === settlementId);
  }

  /**
   * Register a new lineage node.
   */
  registerLineage(node: LineageNode): void {
    this.lineages.set(node.id, { ...node });

    // Index by house
    const houseLineages = this.lineageByHouse.get(node.houseId) ?? [];
    houseLineages.push(node.id);
    this.lineageByHouse.set(node.houseId, houseLineages);

    // Index by settlement
    const settlementLineages = this.lineageBySettlement.get(node.settlementId) ?? [];
    settlementLineages.push(node.id);
    this.lineageBySettlement.set(node.settlementId, settlementLineages);
  }

  /**
   * Get lineage by ID.
   */
  getLineage(id: string): LineageNode | undefined {
    return this.lineages.get(id);
  }

  /**
   * Get lineages for a house.
   */
  getLineagesByHouse(houseId: string): LineageNode[] {
    const ids = this.lineageByHouse.get(houseId) ?? [];
    return ids.map(id => this.lineages.get(id)).filter((l): l is LineageNode => l !== undefined);
  }

  /**
   * Get lineages for a settlement.
   */
  getLineagesBySettlement(settlementId: string): LineageNode[] {
    const ids = this.lineageBySettlement.get(settlementId) ?? [];
    return ids.map(id => this.lineages.get(id)).filter((l): l is LineageNode => l !== undefined);
  }

  /**
   * Get family tree depth for a lineage.
   */
  getGeneration(lineageId: string): number {
    return this.lineages.get(lineageId)?.generation ?? 0;
  }

  /**
   * Get ancestry chain (parents, grandparents, etc.).
   */
  getAncestry(lineageId: string, maxDepth = 10): LineageNode[] {
    const ancestors: LineageNode[] = [];
    const visited = new Set<string>();
    let currentId: string | undefined = lineageId;
    let depth = 0;

    while (currentId && depth < maxDepth) {
      if (visited.has(currentId)) break;  // Prevent cycles
      visited.add(currentId);

      const node = this.lineages.get(currentId);
      if (!node) break;

      ancestors.push(node);
      currentId = node.parentLineageHashes[0];  // Follow primary parent
      depth++;
    }

    return ancestors;
  }

  /**
   * Update house state (for snapshot/delta fields).
   */
  updateHouse(houseId: string, updates: Partial<HouseState>): void {
    const house = this.houses.get(houseId);
    if (house) {
      Object.assign(house, updates);
    }
  }

  /**
   * Serialize registry state for persistence.
   */
  serialize(): { houses: HouseState[]; lineages: LineageNode[] } {
    return {
      houses: Array.from(this.houses.values()),
      lineages: Array.from(this.lineages.values()),
    };
  }

  /**
   * Load registry state from persistence.
   */
  load(data: { houses: HouseState[]; lineages: LineageNode[] }): void {
    this.houses.clear();
    this.lineages.clear();
    this.lineageByHouse.clear();
    this.lineageBySettlement.clear();

    for (const house of data.houses) {
      this.houses.set(house.id, house);
    }
    for (const lineage of data.lineages) {
      this.registerLineage(lineage);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LINEAGE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class NPCCoupleEligibilityEngine {
  private registry: FamilyHouseRegistry;

  constructor(registry: FamilyHouseRegistry) {
    this.registry = registry;
  }

  /**
   * Determine pair eligibility deterministically.
   * 
   * This is the core npc_pair_eligibility function that:
   * - Takes NPC state, House state, Settlement state, and tick context
   * - Returns deterministic eligibility decision
   * - Creates stable lineageHash for new lineage decisions
   * 
   * HARDCODED CONSTRAINTS:
   * - No random spawns
   * - No wall-clock timers
   * - Settlement capacity is the primary limiter
   */
  calculatePairEligibility(context: PairEligibilityContext): PairEligibilityResult {
    const { npcA, npcB, houseA, houseB, settlement, tick } = context;

    // 1. Check settlement constraints first (population pressure cap)
    const pressure = this.calculatePopulationPressure(settlement, tick);
    if (!pressure.canSpawn) {
      return {
        eligible: false,
        lineageHash: this.generateLineageHash(npcA.id, npcB.id, tick, 'rejected'),
        rejectionReason: pressure.limitingFactor === 'capacity' || pressure.limitingFactor === 'settlement_full' 
          ? 'settlement_full' : 'pressure_too_high',
        pressureAtDecision: pressure,
      };
    }

    // 2. Check if both NPCs are in the same settlement
    if (npcA.settlementId !== npcB.settlementId) {
      return {
        eligible: false,
        lineageHash: this.generateLineageHash(npcA.id, npcB.id, tick, 'rejected'),
        rejectionReason: 'different_settlement',
        pressureAtDecision: pressure,
      };
    }

    // 3. Check house states (if they belong to houses)
    if (houseA && !houseA.isActive) {
      return {
        eligible: false,
        lineageHash: this.generateLineageHash(npcA.id, npcB.id, tick, 'rejected'),
        rejectionReason: 'house_not_active',
        pressureAtDecision: pressure,
      };
    }
    if (houseB && !houseB.isActive) {
      return {
        eligible: false,
        lineageHash: this.generateLineageHash(npcA.id, npcB.id, tick, 'rejected'),
        rejectionReason: 'house_not_active',
        pressureAtDecision: pressure,
      };
    }

    // 4. Check relatedness (deterministic - no random)
    const relatedness = this.calculateDeterministicRelatedness(npcA, npcB);
    if (relatedness > 0.5) {  // Too closely related threshold
      return {
        eligible: false,
        lineageHash: this.generateLineageHash(npcA.id, npcB.id, tick, 'rejected'),
        rejectionReason: 'too_closely_related',
        pressureAtDecision: pressure,
      };
    }

    // 5. All checks passed - eligible with stable lineageHash
    const lineageHash = this.generateLineageHash(npcA.id, npcB.id, tick, 'eligible');

    return {
      eligible: true,
      lineageHash,
      pressureAtDecision: pressure,
    };
  }

  /**
   * Calculate population pressure deterministically.
   * Only factors: Settlement capacity, food, housing, house state.
   */
  calculatePopulationPressure(settlement: SettlementState, tick: number): PopulationPressure {
    // Deterministic RNG from settlement state + tick
    const rng = new SeededARERng(createARESeed(['population-pressure', settlement.id, tick]));
    
    const capacityRatio = settlement.population / Math.max(1, settlement.capacity);
    
    // Food pressure: 0 if surplus, up to 0.5 if deficit
    const foodPressure = settlement.foodSupply < 0 
      ? Math.min(0.5, Math.abs(settlement.foodSupply) / Math.max(1, settlement.population * 10))
      : 0;
    
    // Housing pressure: 0 if available, up to 0.3 if overcrowded
    const housingPressure = settlement.housingUnits > 0 
      ? Math.max(0, 1 - (settlement.housingUnits / Math.max(1, settlement.population))) * 0.3
      : 0.3;  // No housing available

    // Combined pressure
    const totalPressure = Math.min(1, capacityRatio * 0.4 + foodPressure + housingPressure);

    // Calculate max population based on constraints
    const maxFromFood = settlement.foodSupply > 0 
      ? Math.floor(settlement.foodSupply / 10) + settlement.population 
      : settlement.population;
    const maxFromHousing = settlement.housingUnits * 2;  // 2 NPCs per housing unit
    const maxPopulation = Math.min(settlement.capacity, maxFromFood, maxFromHousing);

    let limitingFactor: PopulationPressure['limitingFactor'] = null;
    if (totalPressure >= 0.9) {
      if (capacityRatio >= 0.95) limitingFactor = 'capacity';
      else if (foodPressure > housingPressure) limitingFactor = 'food';
      else limitingFactor = 'housing';
    }

    return {
      pressure: totalPressure,
      canSpawn: totalPressure < 0.9 && settlement.population < maxPopulation,
      limitingFactor,
      maxPopulation,
    };
  }

  /**
   * Calculate relatedness deterministically using lineage hashes.
   */
  private calculateDeterministicRelatedness(npcA: NPCState, npcB: NPCState): number {
    if (!npcA.lineageId || !npcB.lineageId) {
      // New NPCs without lineage - check same house as proxy
      if (npcA.houseId && npcA.houseId === npcB.houseId) {
        return 0.3;  // Same house, low relatedness
      }
      return 0;  // No shared lineage
    }

    // Trace ancestry to find common ancestors
    const ancestryA = new Set(this.registry.getAncestry(npcA.lineageId).map(n => n.id));
    const ancestryB = this.registry.getAncestry(npcB.lineageId);

    for (const ancestor of ancestryB) {
      if (ancestryA.has(ancestor.id)) {
        // Common ancestor found - calculate generational distance
        const nodeA = this.registry.getLineage(npcA.lineageId);
        const nodeB = this.registry.getLineage(npcB.lineageId);
        if (nodeA && nodeB) {
          const distance = Math.abs(nodeA.generation - nodeB.generation);
          return Math.min(1, 1 - (distance / 20));  // Closer generations = higher relatedness
        }
      }
    }

    return 0;
  }

  /**
   * Generate stable lineageHash deterministically.
   * Same inputs + same tick = same hash.
   */
  private generateLineageHash(
    npcAId: string, 
    npcBId: string, 
    tick: number, 
    status: 'eligible' | 'rejected'
  ): string {
    const seed = createARESeed(['lineage-hash', npcAId, npcBId, tick, status]);
    const hash = stableHash32(seed);
    return hash.toString(16).padStart(8, '0');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DESCENDANT ARCHETYPE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class DescendantArchetypeEngine {
  private registry: FamilyHouseRegistry;

  constructor(registry: FamilyHouseRegistry) {
    this.registry = registry;
  }

  /**
   * Generate descendant archetype deterministically from parent seeds and context.
   * 
   * Uses:
   * - Parent archetype seeds
   * - House context (name, reputation, inheritance)
   * - Settlement context (type, population pressure)
   * - Current tick
   */
  generateArchetype(
    parentA: NPCState,
    parentB: NPCState,
    houseId: string,
    settlementId: string,
    tick: number
  ): { archetypeSeed: number; stats: LineageStats; traits: string[] } {
    const house = this.registry.getHouse(houseId);
    const settlementLineages = this.registry.getLineagesBySettlement(settlementId);
    
    // Deterministic RNG for this specific lineage decision
    const lineageHash = this.generateLineageHashForArchetype(parentA, parentB, tick);
    const rng = new SeededARERng(lineageHash);

    // Base stats from parents (deterministic averaging with mutation)
    const stats = this.inheritStats(parentA.stats, parentB.stats, rng);
    
    // Traits from parents + settlement context + tick-based emergence
    const traits = this.deriveTraits(parentA, parentB, house, settlementLineages.length, tick, rng);

    return {
      archetypeSeed: stableHash32(lineageHash),
      stats,
      traits,
    };
  }

  /**
   * Inherit stats deterministically from parents.
   */
  private inheritStats(parentA: LineageStats, parentB: LineageStats, rng: SeededARERng): LineageStats {
    const mutationRate = 0.1;  // 10% chance of mutation
    const deviationFactor = 0.05;  // 5% deviation from mean

    const keys = ['strength', 'agility', 'intelligence', 'stamina', 'charisma', 'luck'] as const;
    const result: Partial<LineageStats> = {};

    for (const key of keys) {
      const mean = (parentA[key] + parentB[key]) / 2;
      const variance = mean * deviationFactor;
      
      // Deterministic random in range [-1, 1]
      const randomFactor = rng.nextFloat() * 2 - 1;
      let value = mean + randomFactor * variance;

      // Deterministic mutation check
      if (rng.nextFloat() < mutationRate) {
        const mutationAmount = (rng.nextFloat() * 2 - 1) * (mean * 0.2);
        value += mutationAmount;
      }

      result[key] = Math.max(1, Math.round(Math.max(1, value)));
    }

    return result as LineageStats;
  }

  /**
   * Derive traits deterministically.
   */
  private deriveTraits(
    parentA: NPCState,
    parentB: NPCState,
    house: HouseState | undefined,
    settlementGeneration: number,
    tick: number,
    rng: SeededARERng
  ): string[] {
    const traits: string[] = [];

    // Combine parent traits
    const parentTraits = [...new Set([...parentA.traits, ...parentB.traits])];
    
    // Add settlement-influenced traits based on tick
    const settlementInfluence = tick % 100;
    if (settlementInfluence < 30) traits.push('resourceful');
    else if (settlementInfluence < 50) traits.push('diplomatic');
    else if (settlementInfluence < 70) traits.push('martial');
    else traits.push('scholarly');

    // House-influenced traits
    if (house) {
      const houseRep = house.houseReputation;
      if (houseRep > 50) traits.push('noble');
      if (house.inheritancePoints > 100) traits.push('inherited_wealth');
      if (house.territorySize > 10) traits.push('landed');
    }

    // Add inherited traits from parents (deterministic selection)
    for (const trait of parentTraits) {
      if (rng.nextFloat() > 0.5) {  // 50% chance to inherit each parent trait
        traits.push(trait);
      }
    }

    // Limit to 5 traits max
    return [...new Set(traits)].slice(0, 5);
  }

  /**
   * Generate lineage hash for archetype calculation.
   */
  private generateLineageHashForArchetype(
    parentA: NPCState,
    parentB: NPCState,
    tick: number
  ): string {
    const seed = createARESeed([
      'descendant-archetype',
      parentA.id,
      parentB.id,
      parentA.lineageId ?? 'none',
      parentB.lineageId ?? 'none',
      tick,
    ]);
    return createARESeed([seed, stableHash32(seed)]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LINEAGE MANAGER - Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export class NPCLineageManager {
  private registry: FamilyHouseRegistry;
  private eligibilityEngine: NPCCoupleEligibilityEngine;
  private archetypeEngine: DescendantArchetypeEngine;

  constructor() {
    this.registry = new FamilyHouseRegistry();
    this.eligibilityEngine = new NPCCoupleEligibilityEngine(this.registry);
    this.archetypeEngine = new DescendantArchetypeEngine(this.registry);
  }

  /**
   * Get the family/house registry.
   */
  getRegistry(): FamilyHouseRegistry {
    return this.registry;
  }

  /**
   * Check if two NPCs are eligible for pairing.
   * Deterministic: same inputs + same tick = same result.
   */
  checkPairEligibility(context: PairEligibilityContext): PairEligibilityResult {
    return this.eligibilityEngine.calculatePairEligibility(context);
  }

  /**
   * Create a new lineage node (descendant).
   * Deterministic archetype generation from parent seeds.
   */
  createDescendant(
    parentA: NPCState,
    parentB: NPCState,
    houseId: string,
    settlementId: string,
    tick: number
  ): LineageNode {
    // Generate deterministic archetype
    const { archetypeSeed, stats, traits } = this.archetypeEngine.generateArchetype(
      parentA,
      parentB,
      houseId,
      settlementId,
      tick
    );

    // Determine generation
    const parentAGen = parentA.generation ?? 0;
    const parentBGen = parentB.generation ?? 0;
    const generation = Math.max(parentAGen, parentBGen) + 1;

    // Create stable lineage hash
    const parentLineageA = parentA.lineageId ?? this.generateInitialLineageHash(parentA.id, tick);
    const parentLineageB = parentB.lineageId ?? this.generateInitialLineageHash(parentB.id, tick);
    
    const lineageHash = this.eligibilityEngine.calculatePairEligibility({
      npcA: parentA,
      npcB: parentB,
      houseA: this.registry.getHouse(parentA.houseId ?? houseId),
      houseB: this.registry.getHouse(parentB.houseId ?? houseId),
      settlement: { id: settlementId, capacity: 100, population: 0, foodSupply: 100, housingUnits: 10, settlementType: 'village', tick },
      tick,
    }).lineageHash;

    const node: LineageNode = {
      id: `${lineageHash}:${tick}`,
      lineageHash,
      generation,
      birthTick: tick,
      parentLineageHashes: [parentLineageA, parentLineageB],
      houseId,
      settlementId,
      archetypeSeed,
      stats,
      traits,
    };

    this.registry.registerLineage(node);
    return node;
  }

  /**
   * Create initial lineage for founding NPC (no parents).
   */
  createFoundingLineage(
    npcId: string,
    houseId: string,
    settlementId: string,
    tick: number,
    stats: LineageStats
  ): LineageNode {
    const lineageHash = this.generateInitialLineageHash(npcId, tick);

    const node: LineageNode = {
      id: `${lineageHash}:${tick}`,
      lineageHash,
      generation: 0,
      birthTick: tick,
      parentLineageHashes: [],
      houseId,
      settlementId,
      archetypeSeed: stableHash32(lineageHash),
      stats,
      traits: ['founder'],
    };

    this.registry.registerLineage(node);
    return node;
  }

  /**
   * Generate initial lineage hash for founding NPCs.
   */
  private generateInitialLineageHash(npcId: string, tick: number): string {
    const seed = createARESeed(['founder-lineage', npcId, tick]);
    return stableHash32(seed).toString(16).padStart(8, '0');
  }

  /**
   * Get population pressure for a settlement.
   */
  getPopulationPressure(settlement: SettlementState, tick: number): PopulationPressure {
    return this.eligibilityEngine.calculatePopulationPressure(settlement, tick);
  }

  /**
   * Update house state (snapshot fields).
   */
  updateHouseSnapshot(houseId: string, updates: Partial<HouseState>): void {
    this.registry.updateHouse(houseId, updates);
  }

  /**
   * Serialize for persistence.
   */
  serialize(): { registry: ReturnType<FamilyHouseRegistry['serialize']> } {
    return {
      registry: this.registry.serialize(),
    };
  }

  /**
   * Load from persistence.
   */
  load(data: { registry: { houses: HouseState[]; lineages: LineageNode[] } }): void {
    this.registry.load(data.registry);
  }
}
