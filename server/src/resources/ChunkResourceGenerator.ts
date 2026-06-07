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
 *
 * MVP Spawn Rules:
 * - forest/grass chunks: 2-5 trees
 * - mountain/rocky chunks: 1-3 ore
 * - water/river chunks: 1-2 fish spots
 * - Falls biome not available: deterministic mix from chunk coords (MVP placeholder)
 */

import type { ResourceNodeDefinition, ResourceKind } from "./ResourceTypes.js";
import { SeededARERng } from "@wasd/shared";

/** World seed for the game world */
const WORLD_SEED = "areloria:earth_1_1";

/** Chunk size in tiles (kappa units / 1000) */
const CHUNK_TILES = 16;

/** Tile size in kappa units (1 tile = 1000 kappa) */
const KAPPA_PER_TILE = 1000;

/** Resource node radius (distance in kappa units) */
const RESOURCE_RADIUS = 24;

/** Biome IDs for resource spawn rules */
type ChunkBiomeId = "forest_village" | "forest" | "plains" | "mountain";

interface ChunkResourceInput {
  worldSeed: string;
  chunkX: number;
  chunkZ: number;
  biomeId: ChunkBiomeId;
}

/**
 * Derive biome from chunk coordinates deterministically.
 * Uses chunk coordinates to create a deterministic biome pattern.
 */
function deriveChunkBiome(chunkX: number, chunkZ: number): ChunkBiomeId {
  // Create deterministic seed from chunk coordinates
  const seed = SeededARERng.hashSeed(`${WORLD_SEED}|biome|${chunkX}|${chunkZ}`);
  const rng = new SeededARERng(seed as unknown as string);

  // Biome distribution (deterministic based on coordinates)
  const roll = rng.intInclusive(0, 999);

  // 0-450 (45%): forest (forested areas)
  if (roll < 450) return "forest";

  // 450-650 (20%): plains
  if (roll < 650) return "plains";

  // 650-850 (20%): mountain (rocky/hilly areas)
  if (roll < 850) return "mountain";

  // 850-1000 (15%): forest_village (rare village chunks)
  return "forest_village";
}

/**
 * Get spawn counts for each resource kind based on biome.
 * Returns { min, max } for each resource type.
 */
function getSpawnCountsByBiome(biome: ChunkBiomeId): Record<ResourceKind, { min: number; max: number }> {
  switch (biome) {
    case "mountain":
      return {
        tree: { min: 0, max: 1 },      // Few trees in mountains
        ore: { min: 2, max: 4 },        // More ore in mountains
        fish_spot: { min: 0, max: 1 }, // Few fish spots
      };
    case "plains":
      return {
        tree: { min: 1, max: 3 },       // Some trees in plains
        ore: { min: 1, max: 2 },         // Few ore in plains
        fish_spot: { min: 1, max: 2 },   // Some fish spots
      };
    case "forest_village":
      return {
        tree: { min: 2, max: 4 },       // Trees around village
        ore: { min: 1, max: 2 },         // Some ore
        fish_spot: { min: 1, max: 2 },   // Some fish spots
      };
    case "forest":
    default:
      return {
        tree: { min: 3, max: 6 },       // Many trees in forest
        ore: { min: 1, max: 2 },         // Some ore
        fish_spot: { min: 1, max: 3 },   // Some fish spots
      };
  }
}

/**
 * Generate a deterministic resource node title based on kind and index.
 */
function generateNodeTitle(kind: ResourceKind, index: number, rng: SeededARERng): string {
  const treeNames = ["Young Pine", "Oak Tree", "Birch Tree", "Willow Tree", "Cedar Tree", "Maple Tree", "Ancient Tree"];
  const oreNames = ["Copper Rock", "Iron Deposit", "Tin Vein", "Coal Seam", "Silver Lode", "Gold Nugget"];
  const fishNames = ["Calm Fishing Spot", "Deep Waters", "Shallow Inlet", "Riverside Jetty", "Hidden Pool"];

  const names = kind === "tree" ? treeNames : kind === "ore" ? oreNames : fishNames;
  const nameIndex = rng.intInclusive(0, names.length - 1);
  const suffix = index > 0 ? ` #${index + 1}` : "";
  return `${names[nameIndex]}${suffix}`;
}

/**
 * Get skill ID for a resource kind.
 */
function getSkillIdForKind(kind: ResourceKind): "woodcutting" | "mining" | "fishing" {
  switch (kind) {
    case "tree": return "woodcutting";
    case "ore": return "mining";
    case "fish_spot": return "fishing";
  }
}

/**
 * Get item reward ID for a resource kind.
 */
function getItemRewardForKind(kind: ResourceKind): { id: string; name: string } {
  switch (kind) {
    case "tree": return { id: "wood_log", name: "Wood Log" };
    case "ore": return { id: "copper_ore", name: "Copper Ore" };
    case "fish_spot": return { id: "raw_fish", name: "Raw Fish" };
  }
}

/**
 * Get required tool for a resource kind.
 * Trees can be gathered bare-handed (requiredTool: undefined) for MVP.
 * Ore requires mining_tool.
 * Fish spots require fishing_tool.
 */
function getRequiredToolForKind(kind: ResourceKind): "mining_tool" | "fishing_tool" | undefined {
  switch (kind) {
    case "tree": return undefined; // Bare-handed allowed for MVP
    case "ore": return "mining_tool";
    case "fish_spot": return "fishing_tool";
  }
}

/**
 * Generate deterministic resource node definitions for a given chunk.
 *
 * @param input - Chunk coordinates and biome
 * @returns Sorted array of ResourceNodeDefinition (sorted by ID for determinism)
 */
export function generateChunkResourceNodes(input: ChunkResourceInput): readonly ResourceNodeDefinition[] {
  const { worldSeed, chunkX, chunkZ, biomeId } = input;

  // Create deterministic RNG seed for this chunk's resources
  const seed = SeededARERng.compose([worldSeed, "resources", chunkX, chunkZ, biomeId]);
  const rng = new SeededARERng(seed);

  // Determine actual biome to use (use provided biomeId or derive deterministically)
  const effectiveBiome = biomeId || deriveChunkBiome(chunkX, chunkZ);

  // Get spawn counts for this biome
  const spawnCounts = getSpawnCountsByBiome(effectiveBiome);

  // Generate nodes for each kind
  const nodes: ResourceNodeDefinition[] = [];
  let globalIndex = 0;

  for (const kind of ["tree", "ore", "fish_spot"] as ResourceKind[]) {
    const counts = spawnCounts[kind];
    const count = rng.intInclusive(counts.min, counts.max);

    for (let i = 0; i < count; i++) {
      // Generate deterministic position within chunk bounds
      // Leave a margin of 2 tiles from chunk edges to avoid edge cases
      const margin = 2;
      const range = CHUNK_TILES - margin * 2;

      const tileX = margin + rng.intInclusive(0, range - 1);
      const tileZ = margin + rng.intInclusive(0, range - 1);

      // Convert tile coordinates to kappa units
      // Chunk offset: chunkX * CHUNK_TILES * KAPPA_PER_TILE
      const kappaX = chunkX * CHUNK_TILES * KAPPA_PER_TILE + tileX * KAPPA_PER_TILE;
      const kappaY = chunkZ * CHUNK_TILES * KAPPA_PER_TILE + tileZ * KAPPA_PER_TILE; // Using Z as Y in kappa

      // Generate node ID: resource:{chunkX}:{chunkZ}:{kind}:{index}
      const nodeId = `resource:${chunkX}:${chunkZ}:${kind}:${i}`;

      // Generate title using deterministic RNG
      const titleRng = rng.fork(`title_${globalIndex}`);
      const title = generateNodeTitle(kind, i, titleRng);

      // Get skill and reward info
      const skillId = getSkillIdForKind(kind);
      const reward = getItemRewardForKind(kind);
      const requiredTool = getRequiredToolForKind(kind);

      // XP reward varies by kind
      const xpReward = kind === "tree" ? 25 : kind === "ore" ? 35 : 20;

      // Respawn ticks (server ticks)
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

  // Sort by ID for deterministic iteration
  return Object.freeze(nodes.sort((a, b) => a.id.localeCompare(b.id)));
}

/**
 * Get visible chunks for a player at given tile position.
 * Returns a 3x3 grid of chunk coordinates centered on the player.
 */
export function getVisibleChunkCoords(tileX: number, tileZ: number): Array<{ chunkX: number; chunkZ: number }> {
  const chunkX = Math.floor(tileX / CHUNK_TILES);
  const chunkZ = Math.floor(tileZ / CHUNK_TILES);

  const visible: Array<{ chunkX: number; chunkZ: number }> = [];

  // 3x3 grid centered on player
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      visible.push({
        chunkX: chunkX + dx,
        chunkZ: chunkZ + dz,
      });
    }
  }

  return visible;
}

/**
 * Check if a chunk coordinate is the starter chunk (0, 0).
 * Starter chunk uses STARTER_RESOURCE_NODES instead of procedural nodes.
 */
export function isStarterChunk(chunkX: number, chunkZ: number): boolean {
  return chunkX === 0 && chunkZ === 0;
}

/**
 * Get the biome ID for a chunk.
 * Uses provided biomeId if given, otherwise derives deterministically.
 */
export function getChunkBiome(chunkX: number, chunkZ: number, providedBiomeId?: ChunkBiomeId): ChunkBiomeId {
  if (providedBiomeId) return providedBiomeId;
  return deriveChunkBiome(chunkX, chunkZ);
}

/**
 * Export constants for use by other modules
 */
export const CHUNK_RESOURCE_CONSTANTS = {
  CHUNK_TILES,
  KAPPA_PER_TILE,
  RESOURCE_RADIUS,
  WORLD_SEED,
} as const;