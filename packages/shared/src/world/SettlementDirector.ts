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

function firstFreeNearRoad(input: { readonly chunkTiles: number; readonly road: string; readonly occupied: Set<string>; readonly offset: number }): { tileX: number; tileZ: number } | null {
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
    if (c.tileX < 1 || c.tileZ < 1 || c.tileX >= input.chunkTiles - 1 || c.tileZ >= input.chunkTiles - 1) continue;
    const key = cellKey(c.tileX, c.tileZ);
    if (!input.occupied.has(key)) return c;
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
    const road = roadKeys[(i * 3 + input.rng.pickIndex(roadKeys.length)) % roadKeys.length];
    const pos = firstFreeNearRoad({ chunkTiles: input.chunkTiles, road, occupied, offset: 2 }) ?? firstFreeNearRoad({ chunkTiles: input.chunkTiles, road, occupied, offset: 3 });
    if (!pos) continue;
    const buildingType = LOT_TYPES[i % LOT_TYPES.length];
    const widthTiles = buildingType === "inn" || buildingType === "blacksmith" ? 3 : 2;
    const depthTiles = buildingType === "inn" ? 3 : 2;
    lots.push(lot(`lot_${i}_${buildingType}`, buildingType, pos.tileX, pos.tileZ, road, widthTiles, depthTiles));
    for (let dz = 0; dz < depthTiles; dz += 1) {
      for (let dx = 0; dx < widthTiles; dx += 1) {
        occupied.add(cellKey(clampInt(pos.tileX + dx, 0, input.chunkTiles - 1), clampInt(pos.tileZ + dz, 0, input.chunkTiles - 1)));
      }
    }
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
