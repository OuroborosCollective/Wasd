/**
 * WORLD DISCOVERY STORE
 *
 * Server-authoritative in-memory store for player discovery state.
 * Deterministic: No Math.random(), stable ordering, no Date.now().
 */

import {
  type WorldDiscoveryState,
  type ChunkKey,
  createDefaultDiscoveryState,
  createStarterDiscoveryState,
  addDiscoveredPoi,
  addDiscoveredChunk,
  addDiscoveredPois,
  addDiscoveredChunks,
  isPoiDiscovered,
  isChunkDiscovered,
  createChunkKey,
  STARTER_VILLAGE_POI_IDS,
} from "./WorldDiscoveryTypes.js";

export class WorldDiscoveryStore {
  private readonly states = new Map<string, WorldDiscoveryState>();
  private autoSeedStarterPois: boolean;

  constructor(options: { autoSeedStarterPois?: boolean } = {}) {
    this.autoSeedStarterPois = options.autoSeedStarterPois ?? true;
  }

  /**
   * Get discovery state for a player, creating default if needed.
   * If autoSeedStarterPois is true, new players get starter POIs pre-discovered.
   */
  getState(playerId: string): WorldDiscoveryState {
    const existing = this.states.get(playerId);
    if (existing) return existing;

    const created = this.autoSeedStarterPois
      ? createStarterDiscoveryState(playerId)
      : createDefaultDiscoveryState(playerId);
    this.states.set(playerId, created);
    return created;
  }

  /**
   * Check if a POI is discovered for a player.
   */
  isDiscovered(playerId: string, poiId: string): boolean {
    const state = this.getState(playerId);
    return isPoiDiscovered(state, poiId);
  }

  /**
   * Check if a chunk is discovered for a player.
   */
  isChunkDiscovered(playerId: string, chunkKey: ChunkKey): boolean {
    const state = this.getState(playerId);
    return isChunkDiscovered(state, chunkKey);
  }

  /**
   * Discover a single POI for a player.
   */
  discoverPoi(playerId: string, poiId: string): WorldDiscoveryState {
    const state = this.getState(playerId);
    const next = addDiscoveredPoi(state, poiId);
    if (next !== state) {
      this.states.set(playerId, next);
    }
    return next;
  }

  /**
   * Discover a single chunk for a player.
   */
  discoverChunk(playerId: string, chunkKey: ChunkKey): WorldDiscoveryState {
    const state = this.getState(playerId);
    const next = addDiscoveredChunk(state, chunkKey);
    if (next !== state) {
      this.states.set(playerId, next);
    }
    return next;
  }

  /**
   * Discover multiple POIs for a player.
   */
  discoverPois(playerId: string, poiIds: readonly string[]): WorldDiscoveryState {
    const state = this.getState(playerId);
    const next = addDiscoveredPois(state, poiIds);
    if (next !== state) {
      this.states.set(playerId, next);
    }
    return next;
  }

  /**
   * Discover multiple chunks for a player.
   */
  discoverChunks(playerId: string, chunkKeys: readonly ChunkKey[]): WorldDiscoveryState {
    const state = this.getState(playerId);
    const next = addDiscoveredChunks(state, chunkKeys);
    if (next !== state) {
      this.states.set(playerId, next);
    }
    return next;
  }

  /**
   * Replace entire discovery state for a player (used for hydration from persistence).
   */
  replaceState(playerId: string, state: WorldDiscoveryState): void {
    this.states.set(playerId, state);
  }

  /**
   * Get all discovered POIs for a player.
   */
  getDiscoveredPoiIds(playerId: string): readonly string[] {
    return this.getState(playerId).discoveredPoiIds;
  }

  /**
   * Get all discovered chunks for a player.
   */
  getDiscoveredChunkKeys(playerId: string): readonly ChunkKey[] {
    return this.getState(playerId).discoveredChunks;
  }

  /**
   * Get discovery stats for a player.
   */
  getStats(playerId: string): { discoveredPoiCount: number; discoveredChunkCount: number; visiblePoiCount: number } {
    const state = this.getState(playerId);
    return {
      discoveredPoiCount: state.discoveredPoiIds.length,
      discoveredChunkCount: state.discoveredChunks.length,
      visiblePoiCount: state.discoveredPoiIds.length, // For MVP, visible = discovered
    };
  }

  /**
   * Clear state for a player (for testing).
   */
  clearForTests(): void {
    this.states.clear();
  }

  /**
   * Clear all states (for testing).
   */
  clearAll(): void {
    this.states.clear();
  }
}

/**
 * Global discovery store instance.
 */
export const worldDiscoveryStore = new WorldDiscoveryStore({
  autoSeedStarterPois: true,
});