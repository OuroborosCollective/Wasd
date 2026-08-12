/**
 * WORLD DISCOVERY SERVICE
 *
 * Handles POI discovery logic based on player position.
 * Server-authoritative, deterministic.
 *
 * Rules:
 * - Keine nichtdeterministische Zufallsquelle
 * - Keine externe Wall-Clock im Truth-Pfad
 * - Discovery based on proximity to POIs
 */

import type { WorldPoiSnapshot } from "./WorldPoiTypes.js";
import type { ChunkKey } from "./WorldDiscoveryTypes.js";
import { createChunkKey } from "./WorldDiscoveryTypes.js";
import { WorldDiscoveryStore, worldDiscoveryStore } from "./WorldDiscoveryStore.js";
import { JsonWorldDiscoveryPersistenceAdapter } from "./JsonWorldDiscoveryPersistenceAdapter.js";
import {
  DISCOVERY_RADIUS_KAPPA,
  kappaToChunkIndex,
} from "@wasd/shared";

/**
 * Default discovery radius in kappa units.
 * Players discover POIs when within this distance.
 */
export const DEFAULT_DISCOVERY_RADIUS = DISCOVERY_RADIUS_KAPPA;

/**
 * Get chunk key from world position (in kappa units).
 */
export function getChunkKeyFromPosition(kappaX: number, kappaY: number): ChunkKey {
  return createChunkKey(kappaToChunkIndex(kappaX), kappaToChunkIndex(kappaY));
}

/**
 * Check proximity in kappa units without a floating-point square root.
 * Inputs arrive as fixed-point integers; squared comparison preserves the
 * authoritative result while avoiding an approximate presentation transform.
 */
function isWithinDiscoveryRadius(
  a: { x: number; y: number },
  b: { x: number; y: number },
  radiusKappa: number,
): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= radiusKappa * radiusKappa;
}

/**
 * Get all visible chunk keys for a position.
 * Returns 3x3 grid centered on the player's chunk.
 */
export function getVisibleChunkKeys(kappaX: number, kappaY: number): ChunkKey[] {
  const chunkX = kappaToChunkIndex(kappaX);
  const chunkZ = kappaToChunkIndex(kappaY);

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
      return isWithinDiscoveryRadius(playerPosition, poi.position, discoveryRadius);
    });

    // Get currently discovered POIs
    const currentlyDiscovered = this.store.getDiscoveredPoiIds(playerId);

    // Find new discoveries
    const newPoiIds = nearbyPois
      .map((poi) => poi.id)
      .filter((id) => !currentlyDiscovered.includes(id))
      .sort((left, right) => left.localeCompare(right));

    if (newPoiIds.length > 0) {
      // Update store with new discoveries
      this.store.discoverPois(playerId, newPoiIds);

      // Also discover the chunks these POIs are in
      const newChunkKeys = nearbyPois
        .filter((poi) => !currentlyDiscovered.includes(poi.id))
        .map((poi) => createChunkKey(poi.chunk.x, poi.chunk.z));
      this.store.discoverChunks(playerId, [...new Set(newChunkKeys)].sort((left, right) => left.localeCompare(right)));
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
