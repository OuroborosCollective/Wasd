import { createARESeed, stableHash32 } from '../../core/determinism/AREDeterminism.js';
import type { HouseState, LineageStats, NPCState, SettlementState } from './FamilyHouseRegistry.js';
import type { LineageRuntimeStateContext, LineageRuntimeStateProvider, LineageRuntimeStateSnapshot } from './LineageBirthSnapshotBridge.js';
import type { WorldPoiSnapshot } from '../../world/WorldPoiTypes.js';
import { CampNpcService } from '../../npc/CampNpcService.js';

export const POI_LINEAGE_SETTLEMENT_ID = 'settlement:starter_village';
export const POI_LINEAGE_HOUSE_ID = 'house:starter_village:civic';

export interface LineagePoiRuntimeStateProviderOptions {
  readonly settlementId?: string;
  readonly houseId?: string;
  readonly maxSelectionsPerSettlement?: number;
}

function stat(seed: string, label: string): number {
  return 8 + (stableHash32(createARESeed(['poi-lineage-stat', seed, label])) % 8);
}

function statsFor(seed: string): LineageStats {
  return {
    strength: stat(seed, 'strength'),
    agility: stat(seed, 'agility'),
    intelligence: stat(seed, 'intelligence'),
    stamina: stat(seed, 'stamina'),
    charisma: stat(seed, 'charisma'),
    luck: stat(seed, 'luck'),
  };
}

function vendorNpcFromPoi(poi: WorldPoiSnapshot, settlementId: string, houseId: string): NPCState | null {
  if (poi.type !== 'village_trader') return null;
  return {
    id: poi.id,
    houseId,
    settlementId,
    stats: statsFor(poi.id),
    traits: ['vendor', 'village', 'runtime_poi'],
    generation: 0,
    birthTick: 0,
  };
}

function campNpcToLineageNpc(npc: ReturnType<CampNpcService['generateCampNpcs']>[number], settlementId: string, houseId: string): NPCState {
  return {
    id: npc.id,
    houseId,
    settlementId,
    stats: statsFor(npc.id),
    traits: ['camp_worker', npc.type, npc.activity, 'runtime_poi'],
    generation: 0,
    birthTick: 0,
  };
}

function buildHouse(houseId: string, settlementId: string, population: number): HouseState {
  return {
    id: houseId,
    houseName: 'Starter Village Civic House',
    houseReputation: 50 + population,
    inheritancePoints: population * 5,
    settlementId,
    foundingTick: 0,
    territorySize: Math.max(1, population),
    resourceStored: population * 10,
    housingCapacity: Math.max(8, population + 4),
    currentPopulation: population,
    isActive: true,
  };
}

function buildSettlement(settlementId: string, population: number, tick: number): SettlementState {
  return {
    id: settlementId,
    capacity: Math.max(24, population + 12),
    population,
    foodSupply: 100 + population * 10,
    housingUnits: Math.max(8, Math.ceil(population / 2) + 4),
    settlementType: 'village',
    tick,
  };
}

export function createPoiLineageRuntimeState(
  tick: number,
  worldPois: readonly WorldPoiSnapshot[],
  options: LineagePoiRuntimeStateProviderOptions = {}
): LineageRuntimeStateSnapshot | null {
  const settlementId = options.settlementId ?? POI_LINEAGE_SETTLEMENT_ID;
  const houseId = options.houseId ?? POI_LINEAGE_HOUSE_ID;
  const orderedPois = [...worldPois].sort((a, b) => a.id.localeCompare(b.id));
  const campService = new CampNpcService();

  const vendorNpcs = orderedPois
    .map((poi) => vendorNpcFromPoi(poi, settlementId, houseId))
    .filter((npc): npc is NPCState => npc !== null);

  const campNpcs = campService
    .generateCampNpcs(orderedPois, tick)
    .map((npc) => campNpcToLineageNpc(npc, settlementId, houseId));

  const npcs = [...vendorNpcs, ...campNpcs].sort((a, b) => a.id.localeCompare(b.id));
  if (npcs.length === 0) return null;

  const house = buildHouse(houseId, settlementId, npcs.length);
  const settlement = buildSettlement(settlementId, npcs.length, tick);

  return Object.freeze({
    tick,
    settlements: Object.freeze([settlement]),
    houses: Object.freeze([house]),
    npcs: Object.freeze(npcs),
    maxSelectionsPerSettlement: Math.max(0, Math.floor(options.maxSelectionsPerSettlement ?? 1)),
  });
}

export class LineagePoiRuntimeStateProvider implements LineageRuntimeStateProvider {
  public constructor(private readonly options: LineagePoiRuntimeStateProviderOptions = {}) {}

  public getLineageRuntimeState(_playerId: string, logicalIndex: number, context?: LineageRuntimeStateContext): LineageRuntimeStateSnapshot | null {
    const pois = context?.worldPois ?? [];
    return createPoiLineageRuntimeState(logicalIndex, pois, this.options);
  }
}
