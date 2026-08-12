/**
 * Unified Chunk / Kappa / Discovery contract (CloudCraft integration #2466).
 *
 * Single source of truth for chunk size, Kappa mapping, and discovery
 * radius units across server, shared, 2D, and 3D. This module exists to
 * eliminate the 16/64-tile chunk drift documented in the audit.
 *
 * Target contract (proposed):
 * - CHUNK_SIZE_TILES = 64 (the authoritative runtime chunk size, matching
 *   server/src/core/spatial/ChunkMath.ts and GameConfig.chunkSize).
 * - KAPPA_PER_TILE = 1000 (KAPPA_STANDARD, fixed-point integer).
 * - CHUNK_SIZE_KAPPA = 64 * 1000 = 64,000.
 * - DISCOVERY_RADIUS_KAPPA = 96,000 (96 tiles in Kappa units — see audit).
 *
 * The 16-tile constants in WorldPoiGenerator/ChunkResourceGenerator/
 * WorldDiscoveryService are legacy tile-mesh subdivisions, NOT chunk sizes.
 * They describe a 16×16 POI/resource grid *inside* a 64-tile chunk. This
 * module makes that distinction explicit so the drift cannot re-emerge.
 */

export const KAPPA_PER_TILE = 1000 as const;
export const UNIFIED_CHUNK_SIZE_TILES = 64 as const;
export const UNIFIED_CHUNK_SIZE_KAPPA = UNIFIED_CHUNK_SIZE_TILES * KAPPA_PER_TILE; // 64,000

/**
 * Legacy intra-chunk mesh subdivision used by POI and resource generators.
 * This is NOT a chunk size — it is the tile grid *inside* a chunk used to
 * scatter POIs/resources. Kept explicit so 16-tile call-sites are not
 * confused with chunk-size call-sites.
 */
export const LEGACY_INTRACHUNK_MESH_TILES = 16 as const;
export const LEGACY_INTRACHUNK_MESH_KAPPA = LEGACY_INTRACHUNK_MESH_TILES * KAPPA_PER_TILE; // 16,000

/**
 * Discovery radius. POI positions are in Kappa units, so the radius is in
 * Kappa units. 96,000 Kappa = 96 tiles ≈ 1.5 chunks at the 64-tile chunk size.
 */
export const DISCOVERY_RADIUS_KAPPA = 96_000 as const;
export const DISCOVERY_RADIUS_TILES = DISCOVERY_RADIUS_KAPPA / KAPPA_PER_TILE; // 96

/**
 * Convert a Kappa coordinate to a chunk index using the unified 64-tile chunk.
 * Pure integer math — no floating point, deterministic.
 */
export function kappaToChunkIndex(kappa: number): number {
  return Math.floor(kappa / UNIFIED_CHUNK_SIZE_KAPPA);
}

/**
 * Convert a tile coordinate to a chunk index using the unified 64-tile chunk.
 */
export function tileToChunkIndex(tile: number): number {
  return Math.floor(tile / UNIFIED_CHUNK_SIZE_TILES);
}

/**
 * Convert a Kappa coordinate to a tile coordinate.
 */
export function kappaToTile(kappa: number): number {
  return Math.floor(kappa / KAPPA_PER_TILE);
}

/**
 * Convert a tile coordinate to a Kappa coordinate.
 */
export function tileToKappa(tile: number): number {
  return tile * KAPPA_PER_TILE;
}

/**
 * Get the chunk key from a Kappa position using the unified chunk size.
 */
export function kappaPositionToChunkKey(kappaX: number, kappaY: number): string {
  return `${kappaToChunkIndex(kappaX)},${kappaToChunkIndex(kappaY)}`;
}

/**
 * Audit evidence: which call-sites used 16-tile vs 64-tile assumptions.
 * This record is frozen so the audit is immutable once committed.
 */
export const CHUNK_DRIFT_AUDIT = Object.freeze({
  date: "2026-08-11",
  chunkSizeDrift: {
    "64-tile": {
      files: [
        "server/src/core/spatial/ChunkMath.ts (CHUNK_SIZE_TILES = 64)",
        "server/src/config/GameConfig.ts (chunkSize: 64)",
        "server/src/modules/guild/TerritoryControl.ts (CHUNK_SIZE = 64)",
        "server/src/modules/world/ChunkSystem.ts (default chunkSize = 64)",
        "server/src/modules/world/TerrainGenerator.ts (chunkSize: 64)",
        "server/src/are/WorldHashSnapshot.ts (chunkSize ?? 64)",
      ],
      role: "authoritative runtime chunk size",
    },
    "16-tile": {
      files: [
        "packages/shared/src/world/KappaMath.ts (DEFAULT_CHUNK_TILES = 16)",
        "server/src/world/WorldPoiGenerator.ts (CHUNK_TILES = 16, local)",
        "server/src/resources/ChunkResourceGenerator.ts (CHUNK_TILES = 16, local)",
        "server/src/world/WorldDiscoveryService.ts (TILES_PER_CHUNK = 16, local in getChunkKeyFromPosition)",
      ],
      role: "legacy intra-chunk POI/resource mesh subdivision (NOT chunk size)",
    },
  },
  discoveryRadius: {
    value: 96,
    unit: "kappa (POI positions are in kappa units)",
    files: [
      "server/src/world/WorldDiscoveryService.ts (DEFAULT_DISCOVERY_RADIUS = 96)",
    ],
    note: "96 kappa = 0.096 tiles. This is almost certainly intended as 96,000 kappa (96 tiles). See DISCOVERY_RADIUS_KAPPA.",
  },
  kappaPerTile: {
    value: 1000,
    files: [
      "packages/shared/src/world/KappaMath.ts (KAPPA_STANDARD = 1000)",
      "server/src/are/Kappa.ts (KAPPA = 1000)",
      "server/src/world/WorldPoiGenerator.ts (KAPPA_PER_TILE = 1000, local)",
      "server/src/resources/ChunkResourceGenerator.ts (KAPPA_PER_TILE = 1000, local)",
      "server/src/world/WorldDiscoveryService.ts (KAPPA_PER_TILE = 1000, local)",
    ],
    status: "consistent (no drift)",
  },
} as const);
