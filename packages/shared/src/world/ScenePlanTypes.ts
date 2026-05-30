import type { ARETick } from "./AREClock";
import type { KappaInt } from "./KappaMath";

export type BiomeId = "forest_village" | "forest" | "plains" | "mountain";
export type RoadType = "dirt_road" | "market_loop" | "gate_road";
export type BuildingType = "blacksmith" | "trader_shop" | "healer_hut" | "inn" | "guard_post" | "house" | "storehouse";
export type PropType = "tree" | "barrel" | "crate" | "sign" | "well" | "fence" | "bush" | "flower" | "market_stall" | "stone";
export type NpcRole = "elder" | "blacksmith" | "trader" | "healer" | "guard_captain" | "guard" | "farmer" | "hunter" | "child" | "innkeeper" | "carpenter" | "wandering_merchant" | "animal";
export type QuestAffinity = "crafting" | "trade" | "healing" | "defense" | "farming" | "hunting" | "social" | "exploration";

export interface KappaPoint {
  readonly x: KappaInt;
  readonly z: KappaInt;
  readonly h: KappaInt;
}

export interface ChunkCoord {
  readonly chunkX: number;
  readonly chunkZ: number;
}

export interface WorldDirectorInput extends ChunkCoord {
  readonly worldSeed: string;
  readonly biomeId: BiomeId;
  readonly kappa: 1000;
  readonly chunkTiles?: number;
  readonly tick?: ARETick;
}

export interface BiomePlan {
  readonly biomeId: BiomeId;
  readonly resourceDensityPerMille: number;
  readonly treeDensityPerMille: number;
  readonly settlementChancePerMille: number;
  readonly heightBase: KappaInt;
  readonly heightVariance: KappaInt;
}

export interface TerrainCellPlan {
  readonly id: string;
  readonly tileX: number;
  readonly tileZ: number;
  readonly kappaPos: KappaPoint;
  readonly terrainType: "grass" | "forest_floor" | "road_edge" | "stone";
  readonly walkable: boolean;
}

export interface RoadNodePlan {
  readonly id: string;
  readonly tileX: number;
  readonly tileZ: number;
  readonly kappaPos: KappaPoint;
}

export interface RoadEdgePlan {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly roadType: RoadType;
  readonly cells: readonly string[];
}

export interface RoadGraphPlan {
  readonly nodes: readonly RoadNodePlan[];
  readonly edges: readonly RoadEdgePlan[];
  readonly roadCells: Readonly<Record<string, RoadType>>;
}

export interface BuildingLotPlan {
  readonly id: string;
  readonly buildingType: BuildingType;
  readonly anchorRoadCell: string;
  readonly tileX: number;
  readonly tileZ: number;
  readonly widthTiles: number;
  readonly depthTiles: number;
  readonly kappaPos: KappaPoint;
  readonly entranceCell: string;
}

export interface PropPlan {
  readonly id: string;
  readonly propType: PropType;
  readonly tileX: number;
  readonly tileZ: number;
  readonly kappaPos: KappaPoint;
  readonly blocksMovement: boolean;
  readonly densityClass: "detail" | "resource" | "structure";
}

export interface NpcPlan {
  readonly id: string;
  readonly role: NpcRole;
  readonly displayNameSeed: string;
  readonly homeLot: string | null;
  readonly workLot: string | null;
  readonly dialogueSeed: string;
  readonly questAffinity: QuestAffinity;
  readonly tileX: number;
  readonly tileZ: number;
  readonly kappaPos: KappaPoint;
  readonly routeCells: readonly string[];
}

export interface SettlementPlan {
  readonly id: string;
  readonly settlementType: "village" | "camp" | "none";
  readonly centerCell: string;
  readonly lots: readonly BuildingLotPlan[];
  readonly props: readonly PropPlan[];
}

export interface ChunkScenePlan {
  readonly id: string;
  readonly input: WorldDirectorInput;
  readonly biome: BiomePlan;
  readonly terrain: readonly TerrainCellPlan[];
  readonly roads: RoadGraphPlan;
  readonly settlement: SettlementPlan;
  readonly npcs: readonly NpcPlan[];
  readonly props: readonly PropPlan[];
  readonly collisionCells: Readonly<Record<string, true>>;
  readonly generatedBy: "OuroborosWorldDirectorV1";
}
