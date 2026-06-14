import { cellKey, cellToKappa, clampInt } from "./KappaMath";
import { SeededARERng } from "./SeededARERng";
import type { BuildingLotPlan, BuildingType, PropPlan, RoadGraphPlan, SettlementPlan } from "./ScenePlanTypes";

const LOT_TYPES: readonly BuildingType[] = ["blacksmith", "trader_shop", "healer_hut", "inn", "guard_post", "house", "storehouse"];

function lot(id: string, buildingType: BuildingType, tileX: number, tileZ: number, anchorRoadCell: string, widthTiles: number, depthTiles: number): BuildingLotPlan {
  return {
    id,
    buildingType,
    anchorRoadCell,
    tileX,
    tileZ,
    widthTiles,
    depthTiles,
    kappaPos: { x: cellToKappa(tileX), z: cellToKappa(tileZ), h: cellToKappa(0, 0) },
    entranceCell: anchorRoadCell,
  };
}

function prop(id: string, propType: PropPlan["propType"], tileX: number, tileZ: number, blocksMovement: boolean, densityClass: PropPlan["densityClass"]): PropPlan {
  return { id, propType, tileX, tileZ, kappaPos: { x: cellToKappa(tileX), z: cellToKappa(tileZ), h: cellToKappa(0, 0) }, blocksMovement, densityClass };
}

function footprintCells(tileX: number, tileZ: number, widthTiles: number, depthTiles: number): string[] {
  const cells: string[] = [];
  for (let dz = 0; dz < depthTiles; dz += 1) {
    for (let dx = 0; dx < widthTiles; dx += 1) {
      cells.push(cellKey(tileX + dx, tileZ + dz));
    }
  }
  return cells;
}

function footprintFits(input: { readonly chunkTiles: number; readonly tileX: number; readonly tileZ: number; readonly widthTiles: number; readonly depthTiles: number; readonly occupied: Set<string> }): boolean {
  if (input.tileX < 1 || input.tileZ < 1) return false;
  if (input.tileX + input.widthTiles >= input.chunkTiles) return false;
  if (input.tileZ + input.depthTiles >= input.chunkTiles) return false;
  return footprintCells(input.tileX, input.tileZ, input.widthTiles, input.depthTiles).every((key) => !input.occupied.has(key));
}

function firstFreeNearRoad(input: { readonly chunkTiles: number; readonly road: string; readonly occupied: Set<string>; readonly offset: number; readonly widthTiles: number; readonly depthTiles: number }): { tileX: number; tileZ: number } | null {
  const [rxRaw, rzRaw] = input.road.split(":");
  const rx = Number(rxRaw);
  const rz = Number(rzRaw);
  const candidates = [
    { tileX: rx, tileZ: rz - input.offset },
    { tileX: rx, tileZ: rz + input.offset },
    { tileX: rx - input.offset, tileZ: rz },
    { tileX: rx + input.offset, tileZ: rz },
  ];
  for (const c of candidates) {
    if (footprintFits({ chunkTiles: input.chunkTiles, tileX: c.tileX, tileZ: c.tileZ, widthTiles: input.widthTiles, depthTiles: input.depthTiles, occupied: input.occupied })) return c;
  }
  return null;
}

function firstFreeNearAnyRoad(input: { readonly chunkTiles: number; readonly roadKeys: readonly string[]; readonly occupied: Set<string>; readonly startIndex: number; readonly widthTiles: number; readonly depthTiles: number }): { tileX: number; tileZ: number; road: string } | null {
  for (let n = 0; n < input.roadKeys.length; n += 1) {
    const road = input.roadKeys[(input.startIndex + n) % input.roadKeys.length];
    for (const offset of [2, 3, 4, 5]) {
      const pos = firstFreeNearRoad({
        chunkTiles: input.chunkTiles,
        road,
        occupied: input.occupied,
        offset,
        widthTiles: input.widthTiles,
        depthTiles: input.depthTiles,
      });
      if (pos) return { ...pos, road };
    }
  }
  return null;
}

/**
 * Settlement lots are derived from road cells. The algorithm is bounded by the small road-cell map,
 * reserves occupied cells eagerly and returns O(1) collision maps to downstream systems.
 */
export function generateSettlementPlan(input: { readonly chunkTiles: number; readonly roads: RoadGraphPlan; readonly rng: SeededARERng }): SettlementPlan {
  const roadKeys = Object.keys(input.roads.roadCells).sort();
  const occupied = new Set<string>(roadKeys);
  const lots: BuildingLotPlan[] = [];
  const props: PropPlan[] = [];
  const lotCount = Math.min(LOT_TYPES.length, Math.max(5, input.rng.intInclusive(5, LOT_TYPES.length)));

  for (let i = 0; i < lotCount; i += 1) {
    const buildingType = LOT_TYPES[i % LOT_TYPES.length];
    const widthTiles = buildingType === "inn" || buildingType === "blacksmith" ? 3 : 2;
    const depthTiles = buildingType === "inn" ? 3 : 2;
    const startIndex = (i * 3 + input.rng.pickIndex(roadKeys.length)) % roadKeys.length;
    const pos = firstFreeNearAnyRoad({ chunkTiles: input.chunkTiles, roadKeys, occupied, startIndex, widthTiles, depthTiles });
    if (!pos) continue;
    lots.push(lot(`lot_${i}_${buildingType}`, buildingType, pos.tileX, pos.tileZ, pos.road, widthTiles, depthTiles));
    for (const key of footprintCells(pos.tileX, pos.tileZ, widthTiles, depthTiles)) occupied.add(key);
  }

  const center = clampInt((input.chunkTiles - 1 - ((input.chunkTiles - 1) % 2)) / 2, 2, input.chunkTiles - 3);
  props.push(prop("village_well", "well", center, center, true, "structure"));
  props.push(prop("market_stall_west", "market_stall", center - 2, center + 1, true, "structure"));
  props.push(prop("market_stall_east", "market_stall", center + 2, center - 1, true, "structure"));

  for (let i = 0; i < 16; i += 1) {
    const edge = i < 8 ? i + 3 : input.chunkTiles - 4;
    const tileX = i < 8 ? edge : input.rng.intInclusive(2, input.chunkTiles - 3);
    const tileZ = i < 8 ? input.rng.intInclusive(2, input.chunkTiles - 3) : i - 5;
    const key = cellKey(tileX, tileZ);
    if (occupied.has(key)) continue;
    const propType = input.rng.chancePerMille(520) ? "tree" : input.rng.chancePerMille(500) ? "bush" : "barrel";
    props.push(prop(`detail_${i}_${propType}`, propType, tileX, tileZ, propType === "tree", propType === "tree" ? "resource" : "detail"));
    if (propType === "tree") occupied.add(key);
  }

  return { id: "settlement_millbrook", settlementType: "village", centerCell: cellKey(center, center), lots, props };
}
