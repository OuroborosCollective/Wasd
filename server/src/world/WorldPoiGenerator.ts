/**
 * WORLD POI GENERATOR
 *
 * Deterministic POI generation for chunks outside the starter village.
 *
 * Rules:
 * - No Math.random() - uses FNV-1a seeded RNG for determinism
 * - No Date.now() for gameplay state
 * - Same worldSeed + chunkX + chunkZ => same POIs
 * - IDs are stable: poi:{chunkX}:{chunkZ}:{type}:0
 * - Positions are stable within chunk bounds
 * - Sorted by ID for deterministic iteration
 *
 * POI Distribution (MVP):
 * - ~25-35% of chunks have exactly 1 gathering camp
 * - Starter chunk 0/0 uses fixed village POIs
 * - Biome-based POI type selection
 */

import { SeededARERng } from "@wasd/shared";
import type { WorldPoiSnapshot, WorldPoiType } from "./WorldPoiTypes.js";
import { getCampResourceBias } from "./WorldPoiTypes.js";
import { resolveResourceWorldSeed } from "../resources/ResourceWorldSeedResolver.js";

/** Runtime-resolved world seed. No hardcoded seed fallback. */
const WORLD_SEED = resolveResourceWorldSeed(undefined, "world poi generator");

/** Chunk size in tiles (kappa units / 1000) */
const CHUNK_TILES = 16;

/** Tile size in kappa units (1 tile = 1000 kappa) */
const KAPPA_PER_TILE = 1000;

/** POI interaction radius */
const POI_RADIUS = 32;

/** Biome IDs for POI spawn rules */
export type ChunkBiomeId = "forest_village" | "forest" | "plains" | "mountain";

interface WorldPoiInput {
  worldSeed: string;
  chunkX: number;
  chunkZ: number;
  biomeId: ChunkBiomeId;
}

/**
 * Derive biome from chunk coordinates deterministically.
 */
export function deriveChunkBiome(chunkX: number, chunkZ: number): ChunkBiomeId {
  const seed = SeededARERng.hashSeed(`${WORLD_SEED}|biome|${chunkX}|${chunkZ}`);
  const rng = new SeededARERng(seed as unknown as string);

  const roll = rng.intInclusive(0, 999);

  if (roll < 450) return "forest";
  if (roll < 650) return "plains";
  if (roll < 850) return "mountain";
  return "forest_village";
}

/**
 * Get POI type for a biome (deterministic).
 */
function getPoiTypeForBiome(biome: ChunkBiomeId, rng: SeededARERng): WorldPoiType | null {
  switch (biome) {
    case "forest":
    case "forest_village": {
      const roll = rng.intInclusive(0, 999);
      return roll < 350 ? "logging_camp" : null;
    }
    case "mountain": {
      const roll = rng.intInclusive(0, 999);
      return roll < 300 ? "mining_camp" : null;
    }
    case "plains": {
      const roll = rng.intInclusive(0, 999);
      return roll < 250 ? "fishing_camp" : null;
    }
    default:
      return null;
  }
}

/**
 * Generate deterministic POI title based on type.
 */
function generatePoiTitle(type: WorldPoiType, index: number): string {
  switch (type) {
    case "logging_camp": {
      const names = ["Timber Camp", "Lumber Camp", "Woodcutters' Rest", "Forest Depot"];
      return names[index % names.length];
    }
    case "mining_camp": {
      const names = ["Ore Camp", "Miners' Haven", "Rock Quarry", "Stonecutters' Post"];
      return names[index % names.length];
    }
    case "fishing_camp": {
      const names = ["Fishing Spot", "Angler's Rest", "Dock Camp", "River Camp"];
      return names[index % names.length];
    }
    default:
      return type;
  }
}

/**
 * Generate deterministic POIs for a given chunk.
 *
 * @param input - Chunk coordinates and biome
 * @returns Sorted array of WorldPoiSnapshot (sorted by ID for determinism)
 */
export function generateChunkPois(input: WorldPoiInput): readonly WorldPoiSnapshot[] {
  const { worldSeed, chunkX, chunkZ, biomeId } = input;

  // Starter chunk uses fixed village POIs (not generated)
  if (chunkX === 0 && chunkZ === 0) {
    return [];
  }

  // Create deterministic RNG seed for this chunk's POIs
  const seed = SeededARERng.compose([worldSeed, "pois", chunkX, chunkZ, biomeId]);
  const rng = new SeededARERng(seed);

  // Determine POI type for this biome
  const poiType = getPoiTypeForBiome(biomeId, rng);

  // No POI for this chunk
  if (!poiType) {
    return [];
  }

  // Generate deterministic position within chunk bounds
  // Leave margin of 2 tiles from edges
  const margin = 3;
  const range = CHUNK_TILES - margin * 2;

  const tileX = margin + rng.intInclusive(0, range - 1);
  const tileZ = margin + rng.intInclusive(0, range - 1);

  // Convert tile coordinates to kappa units
  const kappaX = chunkX * CHUNK_TILES * KAPPA_PER_TILE + tileX * KAPPA_PER_TILE;
  const kappaY = chunkZ * CHUNK_TILES * KAPPA_PER_TILE + tileZ * KAPPA_PER_TILE;

  // Generate POI ID: poi:{chunkX}:{chunkZ}:{type}:0
  const poiId = `poi:${chunkX}:${chunkZ}:${poiType}:0`;

  // Generate title
  const title = generatePoiTitle(poiType, 0);

  // Get tags based on POI type
  const tags = getTagsForPoiType(poiType);

  const poi: WorldPoiSnapshot = {
    id: poiId,
    type: poiType,
    title,
    position: {
      x: kappaX,
      y: kappaY,
    },
    chunk: {
      x: chunkX,
      z: chunkZ,
    },
    interactionRadius: POI_RADIUS,
    tags,
  };

  return Object.freeze([poi]);
}

/**
 * Get tags for a POI type.
 */
function getTagsForPoiType(type: WorldPoiType): readonly string[] {
  switch (type) {
    case "logging_camp":
      return ["trees_nearby", "wood_resource"];
    case "mining_camp":
      return ["ore_veins_nearby", "ore_resource"];
    case "fishing_camp":
      return ["fish_spots_nearby", "fish_resource"];
    case "campfire":
      return ["processing", "cooking"];
    case "furnace":
      return ["processing", "smelting"];
    case "workbench":
      return ["processing", "crafting"];
    case "village_trader":
      return ["trading", "vendor"];
    default:
      return [];
  }
}

/**
 * Get the biome ID for a chunk.
 */
export function getChunkBiome(chunkX: number, chunkZ: number, providedBiomeId?: ChunkBiomeId): ChunkBiomeId {
  if (providedBiomeId) return providedBiomeId;
  return deriveChunkBiome(chunkX, chunkZ);
}

/**
 * Check if a chunk coordinate is the starter chunk (0, 0).
 */
export function isStarterChunk(chunkX: number, chunkZ: number): boolean {
  return chunkX === 0 && chunkZ === 0;
}

/**
 * Get resource bias for a POI type.
 */
export function getPoiResourceBias(poiType: WorldPoiType): "tree" | "ore" | "fish_spot" | null {
  return getCampResourceBias(poiType);
}

/**
 * Generate POIs for multiple chunks (e.g., visible 3x3 grid).
 */
export function generateVisibleChunkPois(
  visibleChunks: Array<{ chunkX: number; chunkZ: number }>,
  worldSeed: string = WORLD_SEED
): readonly WorldPoiSnapshot[] {
  const allPois: WorldPoiSnapshot[] = [];

  for (const { chunkX, chunkZ } of visibleChunks) {
    const biome = deriveChunkBiome(chunkX, chunkZ);
    const pois = generateChunkPois({
      worldSeed,
      chunkX,
      chunkZ,
      biomeId: biome,
    });
    allPois.push(...pois);
  }

  // Sort by ID for deterministic iteration
  return Object.freeze(allPois.sort((a, b) => a.id.localeCompare(b.id)));
}

/**
 * Get the fixed starter village POIs.
 * These are used for the starter chunk instead of generated POIs.
 */
export function getStarterVillagePois(): readonly WorldPoiSnapshot[] {
  return Object.freeze([
    {
      id: "village_trader_001",
      type: "village_trader" as WorldPoiType,
      title: "Mira the Quartermaster",
      position: { x: 462, y: 503 },
      chunk: { x: 0, z: 0 },
      interactionRadius: 32,
      tags: ["trading", "vendor"],
    },
    {
      id: "campfire_001",
      type: "campfire" as WorldPoiType,
      title: "Village Campfire",
      position: { x: 465, y: 506 },
      chunk: { x: 0, z: 0 },
      interactionRadius: 32,
      tags: ["processing", "cooking"],
    },
    {
      id: "furnace_001",
      type: "furnace" as WorldPoiType,
      title: "Village Furnace",
      position: { x: 470, y: 506 },
      chunk: { x: 0, z: 0 },
      interactionRadius: 32,
      tags: ["processing", "smelting"],
    },
    {
      id: "workbench_001",
      type: "workbench" as WorldPoiType,
      title: "Village Workbench",
      position: { x: 468, y: 500 },
      chunk: { x: 0, z: 0 },
      interactionRadius: 32,
      tags: ["processing", "crafting"],
    },
  ]);
}

/**
 * Export constants for use by other modules
 */
export const CHUNK_POI_CONSTANTS = {
  CHUNK_TILES,
  KAPPA_PER_TILE,
  POI_RADIUS,
  WORLD_SEED,
} as const;