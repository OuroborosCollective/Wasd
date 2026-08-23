/**
 * WORLD DISCOVERY TYPES
 *
 * Server-authoritative discovery state for POIs and chunks.
 *
 * Rules:
 * - No Math random
 * - No Date now for gameplay state
 * - Deterministic by playerId
 * - Arrays sorted, no duplicates
 */

export interface WorldDiscoveryState {
  readonly playerId: string;
  readonly schemaVersion: 1;
  readonly discoveredPoiIds: readonly string[];
  readonly discoveredChunks: readonly ChunkKey[];
}

/**
 * Chunk key format for discovery tracking.
 */
export type ChunkKey = `${number}:${number}`;

/**
 * Create a chunk key from coordinates.
 */
export function createChunkKey(chunkX: number, chunkZ: number): ChunkKey {
  return `${chunkX}:${chunkZ}`;
}

/**
 * Parse a chunk key back to coordinates.
 */
export function parseChunkKey(key: ChunkKey): { chunkX: number; chunkZ: number } {
  const [x, z] = key.split(":").map(Number);
  return { chunkX: x, chunkZ: z };
}

/**
 * Default empty discovery state for a new player.
 */
export function createDefaultDiscoveryState(playerId: string): WorldDiscoveryState {
  return Object.freeze({
    playerId,
    schemaVersion: 1 as const,
    discoveredPoiIds: [],
    discoveredChunks: [],
  });
}

/**
 * Add discovered POI to state (idempotent).
 */
export function addDiscoveredPoi(state: WorldDiscoveryState, poiId: string): WorldDiscoveryState {
  if (state.discoveredPoiIds.includes(poiId)) {
    return state;
  }
  // Bolt: Optimization - Direct relational operator comparison is ~3-5x faster than localeCompare
  return Object.freeze({
    ...state,
    discoveredPoiIds: Object.freeze([...state.discoveredPoiIds, poiId].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))),
  });
}

/**
 * Add discovered chunk to state (idempotent).
 */
export function addDiscoveredChunk(state: WorldDiscoveryState, chunkKey: ChunkKey): WorldDiscoveryState {
  if (state.discoveredChunks.includes(chunkKey)) {
    return state;
  }
  // Bolt: Optimization - Direct relational operator comparison is ~3-5x faster than localeCompare
  return Object.freeze({
    ...state,
    discoveredChunks: Object.freeze([...state.discoveredChunks, chunkKey].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))),
  });
}

/**
 * Add multiple discovered POIs at once.
 */
export function addDiscoveredPois(state: WorldDiscoveryState, poiIds: readonly string[]): WorldDiscoveryState {
  const newIds = poiIds.filter((id) => !state.discoveredPoiIds.includes(id));
  if (newIds.length === 0) {
    return state;
  }
  // Bolt: Optimization - Direct relational operator comparison is ~3-5x faster than localeCompare
  return Object.freeze({
    ...state,
    discoveredPoiIds: Object.freeze([...state.discoveredPoiIds, ...newIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))),
  });
}

/**
 * Add multiple discovered chunks at once.
 */
export function addDiscoveredChunks(state: WorldDiscoveryState, chunkKeys: readonly ChunkKey[]): WorldDiscoveryState {
  const newChunks = chunkKeys.filter((key) => !state.discoveredChunks.includes(key));
  if (newChunks.length === 0) {
    return state;
  }
  // Bolt: Optimization - Direct relational operator comparison is ~3-5x faster than localeCompare
  return Object.freeze({
    ...state,
    discoveredChunks: Object.freeze([...state.discoveredChunks, ...newChunks].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))),
  });
}

/**
 * Starter village POI IDs that are auto-discovered for new players.
 */
export const STARTER_VILLAGE_POI_IDS = Object.freeze([
  "village_trader_001",
  "campfire_001",
  "furnace_001",
  "workbench_001",
] as const);

/**
 * Create initial discovery state with starter POIs pre-discovered.
 */
export function createStarterDiscoveryState(playerId: string): WorldDiscoveryState {
  const state = createDefaultDiscoveryState(playerId);
  return addDiscoveredPois(state, STARTER_VILLAGE_POI_IDS);
}

/**
 * Check if a POI is discovered.
 */
export function isPoiDiscovered(state: WorldDiscoveryState, poiId: string): boolean {
  return state.discoveredPoiIds.includes(poiId);
}

/**
 * Check if a chunk is discovered.
 */
export function isChunkDiscovered(state: WorldDiscoveryState, chunkKey: ChunkKey): boolean {
  return state.discoveredChunks.includes(chunkKey);
}