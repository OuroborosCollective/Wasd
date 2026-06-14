/**
 * FamilyHouseRegistry.ts
 *
 * Deterministic Family/House Registry for NPC Lineage System.
 * Implements the ARE truth path:
 * npc_pair_eligibility → family/house registry → lineageHash → descendant archetype
 * → birth tick → population pressure cap → canonical birth journal.
 */

import { createARESeed, stableHash32, SeededARERng } from '../../core/determinism/AREDeterminism';

export interface HouseState {
  id: string;
  houseName: string;
  houseReputation: number;
  inheritancePoints: number;
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
  lineageHash: string;
  generation: number;
  birthTick: number;
  deathTick?: number;
  parentLineageHashes: string[];
  houseId: string;
  settlementId: string;
  archetypeSeed: number;
  stats: LineageStats;
  traits: string[];
}

export interface LineageBirthEvent {
  eventHash: string;
  lineageId: string;
  lineageHash: string;
  parentLineageHashes: string[];
  houseId: string;
  settlementId: string;
  birthTick: number;
  pairEligibilityHash: string;
  pressureAtDecision: PopulationPressure;
  cause: 'founder' | 'eligible_pair';
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
  capacity: number;
  population: number;
  foodSupply: number;
  housingUnits: number;
  settlementType: 'village' | 'city' | 'kingdom' | 'nation';
  tick: number;
}

export interface NPCState {
  id: string;
  lineageId?: string;
  houseId?: string;
  settlementId?: string;
  stats: LineageStats;
  traits: string[];
  birthTick?: number;
  generation?: number;
}

export interface PopulationPressure {
  pressure: number;
  canSpawn: boolean;
  limitingFactor: 'capacity' | 'food' | 'housing' | 'house_state' | null;
  maxPopulation: number;
}

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

export class FamilyHouseRegistry {
  private houses: Map<string, HouseState> = new Map();
  private lineages: Map<string, LineageNode> = new Map();
  private lineageByHouse: Map<string, string[]> = new Map();
  private lineageBySettlement: Map<string, string[]> = new Map();
  private birthEvents: LineageBirthEvent[] = [];

  registerHouse(house: HouseState): void {
    this.houses.set(house.id, { ...house });
  }

  getHouse(id: string): HouseState | undefined {
    return this.houses.get(id);
  }

  getHousesBySettlement(settlementId: string): HouseState[] {
    return Array.from(this.houses.values()).filter((house) => house.settlementId === settlementId);
  }

  registerLineage(node: LineageNode, birthEvent?: LineageBirthEvent): void {
    this.lineages.set(node.id, { ...node });
    this.addIndex(this.lineageByHouse, node.houseId, node.id);
    this.addIndex(this.lineageBySettlement, node.settlementId, node.id);

    if (birthEvent) {
      this.birthEvents.push({ ...birthEvent, pressureAtDecision: { ...birthEvent.pressureAtDecision } });
    }
  }

  getLineage(id: string): LineageNode | undefined {
    return this.lineages.get(id);
  }

  getLineagesByHouse(houseId: string): LineageNode[] {
    const ids = this.lineageByHouse.get(houseId) ?? [];
    return ids.map((id) => this.lineages.get(id)).filter((lineage): lineage is LineageNode => lineage !== undefined);
  }

  getLineagesBySettlement(settlementId: string): LineageNode[] {
    const ids = this.lineageBySettlement.get(settlementId) ?? [];
    return ids.map((id) => this.lineages.get(id)).filter((lineage): lineage is LineageNode => lineage !== undefined);
  }

  getBirthEvents(): LineageBirthEvent[] {
    return this.birthEvents.map((event) => ({ ...event, pressureAtDecision: { ...event.pressureAtDecision } }));
  }

  getGeneration(lineageId: string): number {
    return this.lineages.get(lineageId)?.generation ?? 0;
  }

  getAncestry(lineageId: string, maxDepth = 10): LineageNode[] {
    const ancestors: LineageNode[] = [];
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: lineageId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || current.depth > maxDepth || visited.has(current.id)) continue;

      visited.add(current.id);
      const node = this.lineages.get(current.id);
      if (!node) continue;

      ancestors.push(node);
      const parentIds = [...node.parentLineageHashes].sort();
      for (const parentId of parentIds) {
        if (!visited.has(parentId)) queue.push({ id: parentId, depth: current.depth + 1 });
      }
    }

    return ancestors;
  }

  updateHouse(houseId: string, updates: Partial<HouseState>): void {
    const house = this.houses.get(houseId);
    if (house) Object.assign(house, updates);
  }

  serialize(): { houses: HouseState[]; lineages: LineageNode[]; birthEvents: LineageBirthEvent[] } {
    return {
      houses: Array.from(this.houses.values()).map((house) => ({ ...house })),
      lineages: Array.from(this.lineages.values()).map((lineage) => ({ ...lineage, parentLineageHashes: [...lineage.parentLineageHashes], traits: [...lineage.traits] })),
      birthEvents: this.getBirthEvents(),
    };
  }

  load(data: { houses: HouseState[]; lineages: LineageNode[]; birthEvents?: LineageBirthEvent[] }): void {
    this.houses.clear();
    this.lineages.clear();
    this.lineageByHouse.clear();
    this.lineageBySettlement.clear();
    this.birthEvents = [];

    for (const house of data.houses) this.houses.set(house.id, { ...house });
    for (const lineage of data.lineages) this.registerLineage(lineage);
    this.birthEvents = (data.birthEvents ?? []).map((event) => ({ ...event, pressureAtDecision: { ...event.pressureAtDecision } }));
  }

  private addIndex(index: Map<string, string[]>, key: string, value: string): void {
    const values = index.get(key) ?? [];
    if (!values.includes(value)) values.push(value);
    index.set(key, values);
  }
}

export class NPCCoupleEligibilityEngine {
  constructor(private readonly registry: FamilyHouseRegistry) {}

  calculatePairEligibility(context: PairEligibilityContext): PairEligibilityResult {
    const { npcA, npcB, houseA, houseB, settlement, tick } = context;
    const pressure = this.calculatePopulationPressure(settlement, tick);
    const rejectedHash = this.generateLineageHash(npcA.id, npcB.id, tick, 'rejected');

    if (npcA.settlementId !== settlement.id || npcB.settlementId !== settlement.id) {
      return { eligible: false, lineageHash: rejectedHash, rejectionReason: 'different_settlement', pressureAtDecision: pressure };
    }

    if (!pressure.canSpawn) {
      const rejectionReason = pressure.limitingFactor === 'capacity' || settlement.population >= settlement.capacity
        ? 'settlement_full'
        : 'pressure_too_high';
      return { eligible: false, lineageHash: rejectedHash, rejectionReason, pressureAtDecision: pressure };
    }

    if ((houseA && !houseA.isActive) || (houseB && !houseB.isActive)) {
      return { eligible: false, lineageHash: rejectedHash, rejectionReason: 'house_not_active', pressureAtDecision: pressure };
    }

    if (this.calculateDeterministicRelatedness(npcA, npcB) > 0.5) {
      return { eligible: false, lineageHash: rejectedHash, rejectionReason: 'too_closely_related', pressureAtDecision: pressure };
    }

    return {
      eligible: true,
      lineageHash: this.generateLineageHash(npcA.id, npcB.id, tick, 'eligible'),
      pressureAtDecision: pressure,
    };
  }

  calculatePopulationPressure(settlement: SettlementState, _tick: number): PopulationPressure {
    const capacityRatio = settlement.population / Math.max(1, settlement.capacity);
    const foodPressure = settlement.foodSupply < 0
      ? Math.min(0.5, Math.abs(settlement.foodSupply) / Math.max(1, settlement.population * 10))
      : 0;
    const housingPressure = settlement.housingUnits > 0
      ? Math.max(0, 1 - (settlement.housingUnits / Math.max(1, settlement.population))) * 0.3
      : 0.3;
    const totalPressure = Math.min(1, capacityRatio * 0.4 + foodPressure + housingPressure);
    const maxFromFood = settlement.foodSupply > 0 ? Math.floor(settlement.foodSupply / 10) + settlement.population : settlement.population;
    const maxFromHousing = settlement.housingUnits * 2;
    const maxPopulation = Math.min(settlement.capacity, maxFromFood, maxFromHousing);

    let limitingFactor: PopulationPressure['limitingFactor'] = null;
    if (settlement.population >= settlement.capacity || capacityRatio >= 0.95) limitingFactor = 'capacity';
    else if (settlement.population >= maxPopulation) limitingFactor = maxFromHousing <= maxFromFood ? 'housing' : 'food';
    else if (totalPressure >= 0.9) limitingFactor = foodPressure > housingPressure ? 'food' : 'housing';

    return {
      pressure: totalPressure,
      canSpawn: totalPressure < 0.9 && settlement.population < maxPopulation,
      limitingFactor,
      maxPopulation,
    };
  }

  private calculateDeterministicRelatedness(npcA: NPCState, npcB: NPCState): number {
    if (!npcA.lineageId || !npcB.lineageId) {
      return npcA.houseId && npcA.houseId === npcB.houseId ? 0.3 : 0;
    }

    const nodeA = this.registry.getLineage(npcA.lineageId);
    const nodeB = this.registry.getLineage(npcB.lineageId);
    if (!nodeA || !nodeB) return 0;

    const ancestryA = new Map(this.registry.getAncestry(npcA.lineageId).map((node) => [node.id, node]));
    let strongestRelatedness = 0;

    for (const ancestorB of this.registry.getAncestry(npcB.lineageId)) {
      const ancestorA = ancestryA.get(ancestorB.id);
      if (!ancestorA) continue;
      const distanceA = Math.max(0, nodeA.generation - ancestorA.generation);
      const distanceB = Math.max(0, nodeB.generation - ancestorB.generation);
      strongestRelatedness = Math.max(strongestRelatedness, Math.max(0, 1 - ((distanceA + distanceB) / 12)));
    }

    return strongestRelatedness;
  }

  private generateLineageHash(npcAId: string, npcBId: string, tick: number, status: 'eligible' | 'rejected'): string {
    const [firstNpcId, secondNpcId] = [npcAId, npcBId].sort();
    const seed = createARESeed(['lineage-hash', firstNpcId, secondNpcId, tick, status]);
    return stableHash32(seed).toString(16).padStart(8, '0');
  }
}

export class DescendantArchetypeEngine {
  constructor(private readonly registry: FamilyHouseRegistry) {}

  generateArchetype(
    parentA: NPCState,
    parentB: NPCState,
    houseId: string,
    settlementId: string,
    tick: number
  ): { archetypeSeed: number; stats: LineageStats; traits: string[] } {
    const house = this.registry.getHouse(houseId);
    const settlementLineages = this.registry.getLineagesBySettlement(settlementId);
    const lineageHash = this.generateLineageHashForArchetype(parentA, parentB, tick);
    const rng = new SeededARERng(lineageHash);

    return {
      archetypeSeed: stableHash32(lineageHash),
      stats: this.inheritStats(parentA.stats, parentB.stats, rng),
      traits: this.deriveTraits(parentA, parentB, house, settlementLineages.length, tick, rng),
    };
  }

  private inheritStats(parentA: LineageStats, parentB: LineageStats, rng: SeededARERng): LineageStats {
    const keys = ['strength', 'agility', 'intelligence', 'stamina', 'charisma', 'luck'] as const;
    const result: Partial<LineageStats> = {};

    for (const key of keys) {
      const mean = (parentA[key] + parentB[key]) / 2;
      let value = mean + ((rng.nextFloat() * 2 - 1) * (mean * 0.05));
      if (rng.nextFloat() < 0.1) value += (rng.nextFloat() * 2 - 1) * (mean * 0.2);
      result[key] = Math.max(1, Math.round(value));
    }

    return result as LineageStats;
  }

  private deriveTraits(
    parentA: NPCState,
    parentB: NPCState,
    house: HouseState | undefined,
    settlementGeneration: number,
    tick: number,
    rng: SeededARERng
  ): string[] {
    const traits: string[] = [];
    const parentTraits = [...new Set([...parentA.traits, ...parentB.traits])].sort();
    const settlementInfluence = tick % 100;

    if (settlementInfluence < 30) traits.push('resourceful');
    else if (settlementInfluence < 50) traits.push('diplomatic');
    else if (settlementInfluence < 70) traits.push('martial');
    else traits.push('scholarly');

    if (settlementGeneration > 25) traits.push('established_lineage');
    if (house?.houseReputation && house.houseReputation > 50) traits.push('noble');
    if (house?.inheritancePoints && house.inheritancePoints > 100) traits.push('inherited_wealth');
    if (house?.territorySize && house.territorySize > 10) traits.push('landed');

    for (const trait of parentTraits) {
      if (rng.nextFloat() > 0.5) traits.push(trait);
    }

    return [...new Set(traits)].slice(0, 5);
  }

  private generateLineageHashForArchetype(parentA: NPCState, parentB: NPCState, tick: number): string {
    const parentKeys = [
      `${parentA.id}:${parentA.lineageId ?? 'none'}`,
      `${parentB.id}:${parentB.lineageId ?? 'none'}`,
    ].sort();
    const seed = createARESeed(['descendant-archetype', ...parentKeys, tick]);
    return createARESeed([seed, stableHash32(seed)]);
  }
}

export class NPCLineageManager {
  private readonly registry: FamilyHouseRegistry;
  private readonly eligibilityEngine: NPCCoupleEligibilityEngine;
  private readonly archetypeEngine: DescendantArchetypeEngine;

  constructor(registry: FamilyHouseRegistry = new FamilyHouseRegistry()) {
    this.registry = registry;
    this.eligibilityEngine = new NPCCoupleEligibilityEngine(this.registry);
    this.archetypeEngine = new DescendantArchetypeEngine(this.registry);
  }

  getRegistry(): FamilyHouseRegistry {
    return this.registry;
  }

  checkPairEligibility(context: PairEligibilityContext): PairEligibilityResult {
    return this.eligibilityEngine.calculatePairEligibility(context);
  }

  createDescendant(
    parentA: NPCState,
    parentB: NPCState,
    houseId: string,
    settlement: SettlementState,
    tick: number = settlement.tick
  ): LineageNode {
    const houseA = this.registry.getHouse(parentA.houseId ?? houseId);
    const houseB = this.registry.getHouse(parentB.houseId ?? houseId);
    const eligibility = this.eligibilityEngine.calculatePairEligibility({ npcA: parentA, npcB: parentB, houseA, houseB, settlement, tick });

    if (!eligibility.eligible) {
      throw new Error(`npc_pair_not_eligible:${eligibility.rejectionReason ?? 'unknown'}`);
    }

    const { archetypeSeed, stats, traits } = this.archetypeEngine.generateArchetype(parentA, parentB, houseId, settlement.id, tick);
    const generation = Math.max(parentA.generation ?? 0, parentB.generation ?? 0) + 1;
    const parentLineageA = parentA.lineageId ?? this.generateInitialLineageHash(parentA.id, tick);
    const parentLineageB = parentB.lineageId ?? this.generateInitialLineageHash(parentB.id, tick);
    const parentLineageHashes = [parentLineageA, parentLineageB].sort();

    const node: LineageNode = {
      id: `${eligibility.lineageHash}:${tick}`,
      lineageHash: eligibility.lineageHash,
      generation,
      birthTick: tick,
      parentLineageHashes,
      houseId,
      settlementId: settlement.id,
      archetypeSeed,
      stats,
      traits,
    };

    this.registry.registerLineage(node, this.createBirthEvent(node, eligibility, 'eligible_pair'));
    return node;
  }

  createFoundingLineage(npcId: string, houseId: string, settlementId: string, tick: number, stats: LineageStats): LineageNode {
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

    const pressure: PopulationPressure = { pressure: 0, canSpawn: true, limitingFactor: null, maxPopulation: Number.MAX_SAFE_INTEGER };
    const event: LineageBirthEvent = {
      eventHash: this.generateBirthEventHash(node, lineageHash, pressure, 'founder'),
      lineageId: node.id,
      lineageHash,
      parentLineageHashes: [],
      houseId,
      settlementId,
      birthTick: tick,
      pairEligibilityHash: lineageHash,
      pressureAtDecision: pressure,
      cause: 'founder',
    };

    this.registry.registerLineage(node, event);
    return node;
  }

  getPopulationPressure(settlement: SettlementState, tick: number): PopulationPressure {
    return this.eligibilityEngine.calculatePopulationPressure(settlement, tick);
  }

  updateHouseSnapshot(houseId: string, updates: Partial<HouseState>): void {
    this.registry.updateHouse(houseId, updates);
  }

  serialize(): { registry: ReturnType<FamilyHouseRegistry['serialize']> } {
    return { registry: this.registry.serialize() };
  }

  load(data: { registry: { houses: HouseState[]; lineages: LineageNode[]; birthEvents?: LineageBirthEvent[] } }): void {
    this.registry.load(data.registry);
  }

  private generateInitialLineageHash(npcId: string, tick: number): string {
    const seed = createARESeed(['founder-lineage', npcId, tick]);
    return stableHash32(seed).toString(16).padStart(8, '0');
  }

  private createBirthEvent(node: LineageNode, eligibility: PairEligibilityResult, cause: 'eligible_pair'): LineageBirthEvent {
    return {
      eventHash: this.generateBirthEventHash(node, eligibility.lineageHash, eligibility.pressureAtDecision, cause),
      lineageId: node.id,
      lineageHash: node.lineageHash,
      parentLineageHashes: [...node.parentLineageHashes],
      houseId: node.houseId,
      settlementId: node.settlementId,
      birthTick: node.birthTick,
      pairEligibilityHash: eligibility.lineageHash,
      pressureAtDecision: { ...eligibility.pressureAtDecision },
      cause,
    };
  }

  private generateBirthEventHash(
    node: LineageNode,
    pairEligibilityHash: string,
    pressure: PopulationPressure,
    cause: LineageBirthEvent['cause']
  ): string {
    const seed = createARESeed([
      'lineage-birth-event',
      node.id,
      pairEligibilityHash,
      node.birthTick,
      node.houseId,
      node.settlementId,
      cause,
      pressure.pressure,
      pressure.maxPopulation,
      pressure.limitingFactor ?? 'none',
    ]);
    return stableHash32(seed).toString(16).padStart(8, '0');
  }
}
