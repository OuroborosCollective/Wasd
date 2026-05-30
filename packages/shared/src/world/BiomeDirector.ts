import { cellToKappa, KAPPA_STANDARD, toKappa, type KappaInt } from "./KappaMath";
import { SeededARERng } from "./SeededARERng";
import type { BiomeId, BiomePlan, TerrainCellPlan } from "./ScenePlanTypes";

export function generateBiomePlan(biomeId: BiomeId, rng: SeededARERng): BiomePlan {
  if (biomeId === "forest_village") {
    return {
      biomeId,
      resourceDensityPerMille: 180,
      treeDensityPerMille: 260,
      settlementChancePerMille: 1000,
      heightBase: toKappa(0),
      heightVariance: (rng.intInclusive(0, 2) * KAPPA_STANDARD) as KappaInt,
    };
  }
  if (biomeId === "mountain") {
    return {
      biomeId,
      resourceDensityPerMille: 220,
      treeDensityPerMille: 90,
      settlementChancePerMille: 160,
      heightBase: toKappa(2),
      heightVariance: toKappa(4),
    };
  }
  if (biomeId === "plains") {
    return {
      biomeId,
      resourceDensityPerMille: 120,
      treeDensityPerMille: 80,
      settlementChancePerMille: 420,
      heightBase: toKappa(0),
      heightVariance: toKappa(1),
    };
  }
  return {
    biomeId,
    resourceDensityPerMille: 200,
    treeDensityPerMille: 320,
    settlementChancePerMille: 220,
    heightBase: toKappa(0),
    heightVariance: toKappa(2),
  };
}

export function generateTerrainCells(input: { readonly chunkTiles: number; readonly biome: BiomePlan; readonly roadCells?: Readonly<Record<string, unknown>> }): readonly TerrainCellPlan[] {
  const cells: TerrainCellPlan[] = [];
  for (let z = 0; z < input.chunkTiles; z += 1) {
    for (let x = 0; x < input.chunkTiles; x += 1) {
      const id = `${x}:${z}`;
      const isRoad = Boolean(input.roadCells?.[id]);
      cells.push({
        id,
        tileX: x,
        tileZ: z,
        kappaPos: { x: cellToKappa(x), z: cellToKappa(z), h: input.biome.heightBase },
        terrainType: isRoad ? "road_edge" : input.biome.biomeId === "mountain" ? "stone" : input.biome.biomeId.includes("forest") ? "forest_floor" : "grass",
        walkable: true,
      });
    }
  }
  return cells;
}
