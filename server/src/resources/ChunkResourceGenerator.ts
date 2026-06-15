/**
 * CHUNK RESOURCE GENERATOR
 *
 * Deterministic procedural resource node generation for chunks outside the starter village.
 *
 * Rules:
 * - No Math.random() - uses FNV-1a seeded RNG for determinism
 * - No Date.now() for gameplay state
 * - Same worldSeed + chunkX + chunkZ => same resource nodes
 * - IDs are stable: resource:{chunkX}:{chunkZ}:{kind}:{index}
 * - Positions are stable within chunk bounds
 * - Sorted by ID for deterministic iteration
 */

import type { ResourceNodeDefinition, ResourceKind } from "./ResourceTypes.js";
import { SeededARERng } from "@wasd/shared";

/** Chunk size in tiles (kappa units / 1000) */
const CHUNK_TILES = 16;

/** Tile size in kappa units (1 tile = 1000 kappa) */
const KAPPA_PER_TILE = 1000;

/** Resource node radius (distance in kappa units) */
const RESOURCE_RADIUS = 24;

/** Biome IDs for resource spawn rules */
export type ChunkBiomeId = "forest_village" | "forest" | "plains" | "mountain";

interface ChunkResourceInput {
  worldSeed: string;
  chunkX: number;
  chunkZ: number;
  biomeId: ChunkBiomeId;
}

function resolveChunkWorldSeed(input?: string): string {
  const trimmed = input?.trim();
  if (trimmed) return trimmed;
  return ["areloria", "earth", "1", "1"].join(":");
}

/**
 * Derive biome from chunk coordinates deterministically.
 * Uses chunk coordinates to create a deterministic biome pattern.
 */
function deriveChunkBiome(worldSeed: string, chunkX: number, chunkZ: number): ChunkBiomeId {
  const seed = SeededARERng.hashSeed(`${resolveChunkWorldSeed(worldSeed)}|biome|${chunkX}|${chunkZ}`);
  const rng = new SeededARERng(seed as unknown as string);
  const roll = rng.intInclusive(0, 999);

  if (roll < 450) return "forest";
  if (roll < 650) return "plains";
  if (roll < 850) return "mountain";
  return "forest_village";
}

function getSpawnCountsByBiome(biome: ChunkBiomeId): Record<ResourceKind, { min: number; max: number }> {
  switch (biome) {
    case "mountain":
      return { tree: { min: 0, max: 1 }, ore: { min: 2, max: 4 }, fish_spot: { min: 0, max: 1 } };
    case "plains":
      return { tree: { min: 1, max: 3 }, ore: { min: 1, max: 2 }, fish_spot: { min: 1, max: 2 } };
    case "forest_village":
      return { tree: { min: 2, max: 4 }, ore: { min: 1, max: 2 }, fish_spot: { min: 1, max: 2 } };
    case "forest":
    default:
      return { tree: { min: 3, max: 6 }, ore: { min: 1, max: 2 }, fish_spot: { min: 1, max: 3 } };
  }
}

function generateNodeTitle(kind: ResourceKind, index: number, rng: SeededARERng): string {
  const treeNames = ["Young Pine", "Oak Tree", "Birch Tree", "Willow Tree", "Cedar Tree", "Maple Tree", "Ancient Tree"];
  const oreNames = ["Copper Rock", "Iron Deposit", "Tin Vein", "Coal Seam", "Silver Lode", "Gold Nugget"];
  const fishNames = ["Calm Fishing Spot", "Deep Waters", "Shallow Inlet", "Riverside Jetty", "Hidden Pool"];

  const names = kind === "tree" ? treeNames : kind === "ore" ? oreNames : fishNames;
  const nameIndex = rng.intInclusive(0, names.length - 1);
  const suffix = index > 0 ? ` #${index + 1}` : "";
  return `${names[nameIndex]}${suffix}`;
}

function getSkillIdForKind(kind: ResourceKind): "woodcutting" | "mining" | "fishing" {
  switch (kind) {
    case "tree": return "woodcutting";
    case "ore": return "mining";
    case "fish_spot": return "fishing";
  }
}

function getItemRewardForKind(kind: ResourceKind): { id: string; name: string } {
  switch (kind) {
    case "tree": return { id: "wood_log", name: "Wood Log" };
    case "ore": return { id: "copper_ore", name: "Copper Ore" };
    case "fish_spot": return { id: "raw_fish", name: "Raw Fish" };
  }
}

function getRequiredToolForKind(kind: ResourceKind): "mining_tool" | "fishing_tool" | undefined {
  switch (kind) {
    case "tree": return undefined;
    case "ore": return "mining_tool";
    case "fish_spot": return "fishing_tool";
  }
}

export function generateChunkResourceNodes(input: ChunkResourceInput): readonly ResourceNodeDefinition[] {
  const { chunkX, chunkZ, biomeId } = input;
  const worldSeed = resolveChunkWorldSeed(input.worldSeed);
  const effectiveBiome = biomeId || deriveChunkBiome(worldSeed, chunkX, chunkZ);
  const seed = SeededARERng.compose([worldSeed, "resources", chunkX, chunkZ, effectiveBiome]);
  const rng = new SeededARERng(seed);
  const spawnCounts = getSpawnCountsByBiome(effectiveBiome);
  const nodes: ResourceNodeDefinition[] = [];
  let globalIndex = 0;

  for (const kind of ["tree", "ore", "fish_spot"] as ResourceKind[]) {
    const counts = spawnCounts[kind];
    const count = rng.intInclusive(counts.min, counts.max);

    for (let i = 0; i < count; i++) {
      const margin = 2;
      const range = CHUNK_TILES - margin * 2;
      const tileX = margin + rng.intInclusive(0, range - 1);
      const tileZ = margin + rng.intInclusive(0, range - 1);
      const kappaX = chunkX * CHUNK_TILES * KAPPA_PER_TILE + tileX * KAPPA_PER_TILE;
      const kappaY = chunkZ * CHUNK_TILES * KAPPA_PER_TILE + tileZ * KAPPA_PER_TILE;
      const nodeId = `resource:${chunkX}:${chunkZ}:${kind}:${i}`;
      const titleRng = rng.fork(`title_${globalIndex}`);
      const title = generateNodeTitle(kind, i, titleRng);
      const skillId = getSkillIdForKind(kind);
      const reward = getItemRewardForKind(kind);
      const requiredTool = getRequiredToolForKind(kind);
      const xpReward = kind === "tree" ? 25 : kind === "ore" ? 35 : 20;
      const respawnTicks = kind === "tree" ? 30 : kind === "ore" ? 45 : 25;

      nodes.push({
        id: nodeId,
        kind,
        title,
        skillId,
        requiredLevel: 1,
        xpReward,
        itemRewardId: reward.id,
        itemRewardName: reward.name,
        respawnTicks,
        position: { x: kappaX, y: kappaY },
        radius: RESOURCE_RADIUS,
        requiredTool,
      });

      globalIndex++;
    }
  }

  return Object.freeze(nodes.sort((a, b) => a.id.localeCompare(b.id)));
}

export function getVisibleChunkCoords(tileX: number, tileZ: number): Array<{ chunkX: number; chunkZ: number }> {
  const chunkX = Math.floor(tileX / CHUNK_TILES);
  const chunkZ = Math.floor(tileZ / CHUNK_TILES);
  const visible: Array<{ chunkX: number; chunkZ: number }> = [];

  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      visible.push({ chunkX: chunkX + dx, chunkZ: chunkZ + dz });
    }
  }

  return visible;
}
