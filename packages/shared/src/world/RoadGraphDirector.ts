import { cellKey, cellToKappa, clampInt, intDiv } from "./KappaMath";
import type { RoadEdgePlan, RoadGraphPlan, RoadNodePlan, RoadType } from "./ScenePlanTypes";

function node(id: string, tileX: number, tileZ: number): RoadNodePlan {
  return { id, tileX, tileZ, kappaPos: { x: cellToKappa(tileX), z: cellToKappa(tileZ), h: cellToKappa(0, 0) } };
}

function drawOrthogonalCells(fromX: number, fromZ: number, toX: number, toZ: number): string[] {
  const cells: string[] = [];
  const stepX = fromX <= toX ? 1 : -1;
  const stepZ = fromZ <= toZ ? 1 : -1;
  for (let x = fromX; x !== toX + stepX; x += stepX) cells.push(cellKey(x, fromZ));
  for (let z = fromZ; z !== toZ + stepZ; z += stepZ) cells.push(cellKey(toX, z));
  return [...new Set(cells)];
}

function edge(id: string, from: RoadNodePlan, to: RoadNodePlan, roadType: RoadType): RoadEdgePlan {
  return { id, from: from.id, to: to.id, roadType, cells: drawOrthogonalCells(from.tileX, from.tileZ, to.tileX, to.tileZ) };
}

/**
 * Road graph is generated before settlement objects. The graph is intentionally small:
 * O(chunkTiles) cells, stable node IDs and a precomputed road-cell map for O(1) lookup.
 */
export function generateRoadGraph(chunkTiles: number): RoadGraphPlan {
  const max = chunkTiles - 1;
  const center = clampInt(intDiv(max, 2), 2, max - 2);
  const westGate = node("gate_west", 0, center);
  const eastGate = node("gate_east", max, center);
  const northGate = node("gate_north", center, 0);
  const southGate = node("gate_south", center, max);
  const marketNW = node("market_nw", center - 2, center - 2);
  const marketNE = node("market_ne", center + 2, center - 2);
  const marketSE = node("market_se", center + 2, center + 2);
  const marketSW = node("market_sw", center - 2, center + 2);
  const square = node("market_center", center, center);

  const nodes = [westGate, eastGate, northGate, southGate, marketNW, marketNE, marketSE, marketSW, square] as const;
  const edges: RoadEdgePlan[] = [
    edge("main_west", westGate, square, "dirt_road"),
    edge("main_east", square, eastGate, "dirt_road"),
    edge("gate_north", northGate, square, "gate_road"),
    edge("gate_south", square, southGate, "gate_road"),
    edge("market_north", marketNW, marketNE, "market_loop"),
    edge("market_east", marketNE, marketSE, "market_loop"),
    edge("market_south", marketSE, marketSW, "market_loop"),
    edge("market_west", marketSW, marketNW, "market_loop"),
  ];

  const roadCells: Record<string, RoadType> = {};
  for (const item of edges) {
    for (const c of item.cells) roadCells[c] = item.roadType;
  }

  return { nodes, edges, roadCells };
}
