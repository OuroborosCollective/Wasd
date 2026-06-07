/**
 * WORLD DISCOVERY SERVICE
 *
 * Handles POI discovery logic based on player position.
 * Server-authoritative, deterministic.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now()
 * - Discovery based on proximity to POIs
 */

import type { WorldPoiSnapshot } from "./WorldPoiTypes.js";
import type { ChunkKey } from "./WorldDiscoveryTypes.js";
import { createChunkKey } from "./WorldDiscoveryTypes.js";
import { WorldDiscoveryStore, worldDiscoveryStore } from "./WorldDiscoveryStore.js";
import { JsonWorldDiscoveryPersistenceAdapter } from "./JsonWorldDiscoveryPersistenceAdapter.js";

/**
 * Default discovery radius in kappa units.
 * Players discover POIs when within this distance.
 */
export const DEFAULT_DISCOVERY_RADIUS = 96;

/**
 * Get chunk key from world position (in kappa units).
 */
export function getChunkKeyFromPosition(kappaX: number, kappaY: number): ChunkKey {
  const TILES_PER_CHUNK = 16;
  const KAPPA_PER_TILE = 1000;
  const chunkX = Math.floor(kappaX / (TILES_PER_CHUNK * KAPPA_PER_TILE));
  const chunkZ = Math.floor(kappaY / (TILES_PER_CHUNK * KAPPA_PER_TILE));
  return createChunkKey(chunkX, chunkZ);
}

/**
 * Calculate Euclidean distance between two positions (in kappa units).
 */
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get all visible chunk keys for a position.
 * Returns 3x3 grid centered on the player's chunk.
 */
export function getVisibleChunkKeys(kappaX: number, kappaY: number): ChunkKey[] {
  const TILES_PER_CHUNK = 16;
  const KAPPA_PER_TILE = 1000;
  const chunkX = Math.floor(kappaX / (TILES_PER_CHUNK * KAPPA_PER_TILE));
  const chunkZ = Math.floor(kappaY / (TILES_PER_CHUNK * KAPPA_PER_TILE));

  const keys: ChunkKey[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      keys.push(createChunkKey(chunkX + dx, chunkZ + dz));
    }
  }
  return keys;
}

export class WorldDiscoveryService {
  private readonly store: WorldDiscoveryStore;
  private readonly persistence: JsonWorldDiscoveryPersistenceAdapter;
  private hydratedPlayers = new Set<string>();

  constructor(
    store: WorldDiscoveryStore = worldDiscoveryStore,
    persistence?: JsonWorldDiscoveryPersistenceAdapter,
  ) {
    this.store = store;
    this.persistence = persistence ?? new JsonWorldDiscoveryPersistenceAdapter();
  }

  /**
   * Hydrate discovery state for a player from persistence.
   */
  async hydratePlayer(playerId: string): Promise<void> {
    if (this.hydratedPlayers.has(playerId)) return;

    const persisted = await this.persistence.loadOrCreateDefault(playerId);
    this.store.replaceState(playerId, persisted);
    this.hydratedPlayers.add(playerId);
  }

  /**
   * Persist discovery state for a player.
   */
  async persistPlayer(playerId: string): Promise<void> {
    const state = this.store.getState(playerId);
    const wasAutoSeeded = state.discoveredPoiIds.some((id) =>
      ["village_trader_001", "campfire_001", "furnace_001", "workbench_001"].includes(id),
    );
    await this.persistence.saveDiscovery(state, wasAutoSeeded);
  }

  /**
   * Process discovery for a player based on current position and visible POIs.
   * Returns newly discovered POI IDs.
   */
  processDiscovery(
    playerId: string,
    playerPosition: { x: number; y: number },
    visiblePois: readonly WorldPoiSnapshot[],
    discoveryRadius: number = DEFAULT_DISCOVERY_RADIUS,
  ): readonly string[] {
    // Find POIs within discovery radius
    const nearbyPois = visiblePois.filter((poi) => {
      const dist = distance(playerPosition, poi.position);
      return dist <= discoveryRadius;
    });

    // Get currently discovered POIs
    const currentlyDiscovered = this.store.getDiscoveredPoiIds(playerId);

    // Find new discoveries
    const newPoiIds = nearbyPois
      .map((poi) => poi.id)
      .filter((id) => !currentlyDiscovered.includes(id));

    if (newPoiIds.length > 0) {
      // Update store with new discoveries
      this.store.discoverPois(playerId, newPoiIds);

      // Also discover the chunks these POIs are in
      const newChunkKeys = nearbyPois
        .filter((poi) => !currentlyDiscovered.includes(poi.id))
        .map((poi) => createChunkKey(poi.chunk.x, poi.chunk.z));
      this.store.discoverChunks(playerId, newChunkKeys);
    }

    return newPoiIds;
  }

  /**
   * Get all discovered POI IDs for a player.
   */
  getDiscoveredPoiIds(playerId: string): readonly string[] {
    return this.store.getDiscoveredPoiIds(playerId);
  }

  /**
   * Get all discovered chunk keys for a player.
   */
  getDiscoveredChunkKeys(playerId: string): readonly ChunkKey[] {
    return this.store.getDiscoveredChunkKeys(playerId);
  }

  /**
   * Get discovery stats for a player.
   */
  getStats(playerId: string): { discoveredPoiCount: number; discoveredChunkCount: number; visiblePoiCount: number } {
    return this.store.getStats(playerId);
  }

  /**
   * Check if a specific POI is discovered.
   */
  isPoiDiscovered(playerId: string, poiId: string): boolean {
    return this.store.isDiscovered(playerId, poiId);
  }

  /**
   * Filter POIs to only discovered ones.
   */
  filterDiscoveredPois(
    playerId: string,
    pois: readonly WorldPoiSnapshot[],
  ): WorldPoiSnapshot[] {
    const discovered = this.store.getDiscoveredPoiIds(playerId);
    return pois.filter((poi) => discovered.includes(poi.id));
  }

  /**
   * Get discovery state for a player.
   */
  getState(playerId: string) {
    return this.store.getState(playerId);
  }

  /**
   * Clear hydration cache (for testing).
   */
  clearHydrationCache(): void {
    this.hydratedPlayers.clear();
  }
}

/**
 * Global discovery service instance.
 */
export const worldDiscoveryService = new WorldDiscoveryService();