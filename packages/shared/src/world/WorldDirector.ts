import { DEFAULT_CHUNK_TILES, KAPPA_STANDARD, cellKey, cellToKappa } from "./KappaMath";
import { SeededARERng } from "./SeededARERng";
import { generateBiomePlan, generateTerrainCells } from "./BiomeDirector";
import { generateRoadGraph } from "./RoadGraphDirector";
import { generateSettlementPlan } from "./SettlementDirector";
import { generateNpcPlan } from "./NPCDirector";
import type { ChunkScenePlan, PropPlan, WorldDirectorInput } from "./ScenePlanTypes";

function buildCollisionCells(input: { readonly settlementProps: readonly PropPlan[]; readonly worldProps: readonly PropPlan[] }): Readonly<Record<string, true>> {
  const cells: Record<string, true> = {};
  for (const prop of [...input.settlementProps, ...input.worldProps]) {
    if (prop.blocksMovement) cells[cellKey(prop.tileX, prop.tileZ)] = true;
  }
  return cells;
}

function generateWorldScatter(input: { readonly chunkTiles: number; readonly rng: SeededARERng; readonly occupied: Readonly<Record<string, unknown>> }): readonly PropPlan[] {
  const props: PropPlan[] = [];
  const count = input.rng.intInclusive(12, 22);
  for (let i = 0; i < count; i += 1) {
    const tileX = input.rng.intInclusive(1, input.chunkTiles - 2);
    const tileZ = input.rng.intInclusive(1, input.chunkTiles - 2);
    const key = cellKey(tileX, tileZ);
    if (input.occupied[key]) continue;
    const propType = input.rng.chancePerMille(520) ? "tree" : input.rng.chancePerMille(420) ? "bush" : input.rng.chancePerMille(240) ? "stone" : "flower";
    props.push({
      id: `world_${i}_${propType}`,
      propType,
      tileX,
      tileZ,
      kappaPos: { x: cellToKappa(tileX), z: cellToKappa(tileZ), h: cellToKappa(0, 0) },
      blocksMovement: propType === "tree" || propType === "stone",
      densityClass: propType === "tree" ? "resource" : "detail",
    });
  }
  return props;
}

/**
 * OuroborosWorldDirectorV1 is the shared stateless world truth generator.
 * It executes the cascade: biome -> road graph -> settlement lots -> NPC roles -> scatter/collision.
 * The returned plan contains abstract semantic asset roles only; renderers bind concrete assets later.
 */
export function generateChunkScenePlan(rawInput: WorldDirectorInput): Readonly<ChunkScenePlan> {
  if (rawInput.kappa !== KAPPA_STANDARD) throw new Error("WorldDirector requires kappa=1000");
  const chunkTiles = rawInput.chunkTiles ?? DEFAULT_CHUNK_TILES;
  const seed = SeededARERng.compose([rawInput.worldSeed, rawInput.chunkX, rawInput.chunkZ, rawInput.biomeId, rawInput.kappa]);
  const rng = new SeededARERng(seed);
  const biome = generateBiomePlan(rawInput.biomeId, rng.fork("biome"));
  const roads = generateRoadGraph(chunkTiles);
  const terrain = generateTerrainCells({ chunkTiles, biome, roadCells: roads.roadCells });
  const settlement = generateSettlementPlan({ chunkTiles, roads, rng: rng.fork("settlement") });
  const occupied: Record<string, unknown> = { ...roads.roadCells };
  for (const lot of settlement.lots) occupied[cellKey(lot.tileX, lot.tileZ)] = true;
  for (const prop of settlement.props) occupied[cellKey(prop.tileX, prop.tileZ)] = true;
  const props = generateWorldScatter({ chunkTiles, rng: rng.fork("scatter"), occupied });
  const npcs = generateNpcPlan({ worldSeed: rawInput.worldSeed, chunkX: rawInput.chunkX, chunkZ: rawInput.chunkZ, roads, settlement, rng: rng.fork("npc") });
  const collisionCells = buildCollisionCells({ settlementProps: settlement.props, worldProps: props });

  return Object.freeze({
    id: `chunk:${rawInput.worldSeed}:${rawInput.chunkX}:${rawInput.chunkZ}:${rawInput.biomeId}`,
    input: { ...rawInput, chunkTiles },
    biome,
    terrain,
    roads,
    settlement,
    npcs,
    props,
    collisionCells,
    generatedBy: "OuroborosWorldDirectorV1",
  });
}
