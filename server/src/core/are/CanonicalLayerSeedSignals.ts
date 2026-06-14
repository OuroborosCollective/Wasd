import {
  deriveChunkBiome,
  generateChunkScenePlan,
  KAPPA_STANDARD,
  type BiomeId,
  type ChunkScenePlan,
} from '@wasd/shared';
import type { ChunkKey, TickId } from './types.js';
import { parseChunkKey } from './types.js';
import { resolveCanonicalWorldSeed, type CanonicalLayerSeedSignals } from './CanonicalLayerSeed.js';

function clampPerMille(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1000, Math.trunc(value)));
}

function ratioPerMille(part: number, total: number): number {
  if (total <= 0) return 0;
  return clampPerMille((part * 1000) / total);
}

function countTerrain(plan: ChunkScenePlan, terrainType: ChunkScenePlan['terrain'][number]['terrainType']): number {
  return plan.terrain.filter((cell) => cell.terrainType === terrainType).length;
}

function countProps(plan: ChunkScenePlan, densityClass: ChunkScenePlan['props'][number]['densityClass']): number {
  return plan.props.filter((prop) => prop.densityClass === densityClass).length
    + plan.settlement.props.filter((prop) => prop.densityClass === densityClass).length;
}

function pressureFromBiome(plan: ChunkScenePlan): { risk: number; underworld: number } {
  const totalTerrain = Math.max(1, plan.terrain.length);
  const stoneRatio = ratioPerMille(countTerrain(plan, 'stone'), totalTerrain);
  const forestRatio = ratioPerMille(countTerrain(plan, 'forest_floor'), totalTerrain);
  const collisionRatio = ratioPerMille(Object.keys(plan.collisionCells).length, totalTerrain);
  const settlementRelief = Math.min(260, plan.settlement.lots.length * 18);

  const riskBase = plan.biome.biomeId === 'mountain' ? 380 : plan.biome.biomeId === 'forest' ? 220 : plan.biome.biomeId === 'forest_village' ? 160 : 90;
  const underworldBase = plan.biome.biomeId === 'mountain' ? 420 : plan.biome.biomeId === 'forest' ? 120 : 60;

  return {
    risk: clampPerMille(riskBase + Math.floor(stoneRatio / 2) + Math.floor(forestRatio / 6) - settlementRelief),
    underworld: clampPerMille(underworldBase + Math.floor(stoneRatio / 3) + Math.floor(collisionRatio / 8)),
  };
}

export interface CanonicalWorldgenSignalInput {
  readonly worldSeed?: string | number | null;
  readonly chunkKey: ChunkKey;
  readonly activationTick: TickId;
}

export function deriveCanonicalWorldgenSeedSignals(input: CanonicalWorldgenSignalInput): CanonicalLayerSeedSignals {
  const worldSeed = resolveCanonicalWorldSeed(input.worldSeed);
  const parsed = parseChunkKey(input.chunkKey);
  const chunkX = Number(parsed.cx);
  const chunkZ = Number(parsed.cz);
  const biomeId = deriveChunkBiome(chunkX, chunkZ, worldSeed) as BiomeId;
  const plan = generateChunkScenePlan({ worldSeed, chunkX, chunkZ, biomeId, kappa: KAPPA_STANDARD });

  const totalTerrain = Math.max(1, plan.terrain.length);
  const roadCellCount = Object.keys(plan.roads.roadCells).length;
  const collisionCellCount = Object.keys(plan.collisionCells).length;
  const pressure = pressureFromBiome(plan);

  return Object.freeze({
    signalVersion: 1,
    source: plan.generatedBy,
    biomeId: plan.biome.biomeId,
    resourceDensityPerMille: clampPerMille(plan.biome.resourceDensityPerMille),
    treeDensityPerMille: clampPerMille(plan.biome.treeDensityPerMille),
    settlementChancePerMille: clampPerMille(plan.biome.settlementChancePerMille),
    heightBaseKappa: Number(plan.biome.heightBase),
    heightVarianceKappa: Number(plan.biome.heightVariance),
    terrainGrassPerMille: ratioPerMille(countTerrain(plan, 'grass'), totalTerrain),
    terrainForestPerMille: ratioPerMille(countTerrain(plan, 'forest_floor'), totalTerrain),
    terrainStonePerMille: ratioPerMille(countTerrain(plan, 'stone'), totalTerrain),
    terrainRoadPerMille: ratioPerMille(countTerrain(plan, 'road_edge'), totalTerrain),
    roadCellCount,
    roadEdgeCount: plan.roads.edges.length,
    settlementLotCount: plan.settlement.lots.length,
    settlementIntentPerMille: clampPerMille(plan.biome.settlementChancePerMille + plan.settlement.lots.length * 80 + countProps(plan, 'structure') * 35),
    resourcePropCount: countProps(plan, 'resource'),
    structurePropCount: countProps(plan, 'structure'),
    collisionCellCount,
    npcCount: plan.npcs.length,
    dangerPressurePerMille: pressure.risk,
    dungeonPressurePerMille: pressure.underworld,
    signature: [
      plan.generatedBy,
      worldSeed,
      String(input.chunkKey),
      Number(input.activationTick),
      plan.biome.biomeId,
      plan.biome.resourceDensityPerMille,
      plan.biome.treeDensityPerMille,
      plan.biome.settlementChancePerMille,
      roadCellCount,
      plan.roads.edges.length,
      plan.settlement.lots.length,
      plan.npcs.length,
      collisionCellCount,
    ].join('|'),
  });
}
