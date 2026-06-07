import { cellToKappa, KAPPA_STANDARD, toKappa, type KappaInt } from "./KappaMath";
import { SeededARERng } from "./SeededARERng";
import type { BiomeId, BiomePlan, TerrainCellPlan } from "./ScenePlanTypes";

/**
 * Derive deterministic biome from chunk coordinates.
 * Uses FNV-1a hashing for deterministic biome assignment.
 *
 * @param chunkX - Chunk X coordinate
 * @param chunkZ - Chunk Z coordinate
 * @param worldSeed - World seed for additional entropy
 * @returns BiomeId - Deterministic biome for this chunk
 */
export function deriveChunkBiome(chunkX: number, chunkZ: number, worldSeed?: string): BiomeId {
  const seed = worldSeed ?? "areloria:earth_1_1";
  const hashInput = `${seed}|biome|${chunkX}|${chunkZ}`;
  const hash = SeededARERng.hashSeed(hashInput);
  const rng = new SeededARERng(hash as unknown as string);

  // Deterministic roll using the hash-derived RNG
  const roll = rng.intInclusive(0, 999);

  // Biome distribution (deterministic based on chunk coordinates):
  // 0-450 (45%): forest - forested areas
  if (roll < 450) return "forest";

  // 450-650 (20%): plains - open grasslands
  if (roll < 650) return "plains";

  // 650-850 (20%): mountain - rocky/hilly areas
  if (roll < 850) return "mountain";

  // 850-1000 (15%): forest_village - rare village chunks
  return "forest_village";
}

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
