/**
 * SpatialBroadcastTickSystem - Spatial grid management and network broadcast
 * 
 * Phase 2/3 of Core Reality Alignment initiative.
 * 
 * This system extracts spatial grid management from WorldTick into a
 * reusable TickSystem. It handles:
 * - Building spatial grid from entity positions each tick
 * - Querying visible entities for each player (3x3 chunk grid)
 * - Broadcasting spatial snapshots to clients
 * 
 * The system uses the UnifiedChunkContract for consistent chunk radii.
 */

import { TickSystem, TickSystemPriority, type TickSystemContext } from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';
import { createChunkKey, type ChunkKey } from './types.js';
import { UNIFIED_CHUNK_CONTRACT } from '../spatial/UnifiedChunkContract.js';

/**
 * SPATIAL_CHUNK_SIZE: Each chunk is 64 tiles × 64 tiles.
 * Used for Spatial Plexity (Axiom 4) - spatial filtering for broadcasts.
 */
const SPATIAL_CHUNK_SIZE = UNIFIED_CHUNK_CONTRACT.chunkSizeTiles;

type SpatialEntityKind = "player" | "npc" | "loot";

interface SpatialEntity {
  id: string;
  tileX: number;
  tileZ: number;
  kind: SpatialEntityKind;
  data: Record<string, unknown>;
}

/**
 * Compute chunk key from tile coordinates.
 * Uses integer division for deterministic behavior.
 */
function computeChunkKey(tileX: number, tileZ: number): ChunkKey {
  const cx = Math.floor(tileX / SPATIAL_CHUNK_SIZE);
  const cz = Math.floor(tileZ / SPATIAL_CHUNK_SIZE);
  return createChunkKey(cx, cz);
}

/**
 * Get all chunk keys for a grid centered on the given chunk.
 * Uses broadcastRadiusChunks from UnifiedChunkContract (default: 1 = 3x3).
 */
function getChunkKeysForRadius(centerChunkKey: ChunkKey, radius: number): ChunkKey[] {
  const [cxStr, czStr] = centerChunkKey.split(":");
  const cx = parseInt(cxStr, 10);
  const cz = parseInt(czStr, 10);
  
  const keys: ChunkKey[] = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      keys.push(createChunkKey(cx + dx, cz + dz));
    }
  }
  return keys;
}

/**
 * SpatialBroadcastGrid maintains an O(1) spatial index for entity lookup.
 */
export class SpatialBroadcastGrid {
  /** Map<ChunkKey, Set<EntityId>> - O(1) lookup by chunk */
  private chunkToEntities = new Map<ChunkKey, Set<string>>();
  
  /** Map<EntityId, SpatialEntity> - Entity data cache */
  private entities = new Map<string, SpatialEntity>();

  private pruneChunkIfEmpty(chunkKey: ChunkKey): void {
    const set = this.chunkToEntities.get(chunkKey);
    if (set && set.size === 0) this.chunkToEntities.delete(chunkKey);
  }

  /**
   * Register or update an entity's position in the spatial grid.
   * Automatically handles chunk migration when entity moves between chunks.
   */
  upsert(id: string, tileX: number, tileZ: number, kind: SpatialEntityKind, data: Record<string, unknown>): void {
    const newChunkKey = computeChunkKey(tileX, tileZ);
    const existing = this.entities.get(id);
    
    if (existing) {
      const oldChunkKey = computeChunkKey(existing.tileX, existing.tileZ);
      
      // Same chunk - just update data
      if (oldChunkKey === newChunkKey) {
        existing.tileX = tileX;
        existing.tileZ = tileZ;
        existing.kind = kind;
        existing.data = data;
        return;
      }
      
      // Different chunk - migrate entity and prune the old chunk if it is empty
      this.chunkToEntities.get(oldChunkKey)?.delete(id);
      this.pruneChunkIfEmpty(oldChunkKey);
    }
    
    // Insert into new chunk
    if (!this.chunkToEntities.has(newChunkKey)) {
      this.chunkToEntities.set(newChunkKey, new Set());
    }
    this.chunkToEntities.get(newChunkKey)!.add(id);
    
    // Update entity cache
    this.entities.set(id, { id, tileX, tileZ, kind, data });
  }
  
  /**
   * Remove an entity from the spatial grid.
   * Called when entity despawns or leaves the world.
   */
  remove(id: string): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    
    const chunkKey = computeChunkKey(entity.tileX, entity.tileZ);
    this.chunkToEntities.get(chunkKey)?.delete(id);
    this.pruneChunkIfEmpty(chunkKey);
    this.entities.delete(id);
  }
  
  /**
   * Get all entities visible in the chunk grid around the given tile position.
   * Uses broadcastRadiusChunks from UnifiedChunkContract.
   * ⚡ Bolt Optimization: Avoids getChunkKeysForRadius overhead (allocations, splits, parsing).
   */
  getVisibleEntities(centerTileX: number, centerTileZ: number): SpatialEntity[] {
    const cx = Math.floor(centerTileX / SPATIAL_CHUNK_SIZE);
    const cz = Math.floor(centerTileZ / SPATIAL_CHUNK_SIZE);
    const radius = UNIFIED_CHUNK_CONTRACT.broadcastRadiusChunks;
    
    const visibleEntities: SpatialEntity[] = [];
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const chunkKey = createChunkKey(cx + dx, cz + dz);
        const entityIds = this.chunkToEntities.get(chunkKey);
        if (!entityIds) continue;

        for (const id of entityIds) {
          const entity = this.entities.get(id);
          if (entity) {
            visibleEntities.push(entity);
          }
        }
      }
    }
    
    return visibleEntities;
  }
  
  /**
   * Get all entities in a specific chunk.
   */
  getEntitiesInChunk(chunkKey: string | ChunkKey): SpatialEntity[] {
    const key = String(chunkKey);
    const entityIds = this.chunkToEntities.get(key as ChunkKey);
    if (!entityIds) return [];
    
    const entities: SpatialEntity[] = [];
    for (const id of entityIds) {
      const entity = this.entities.get(id);
      if (entity) {
        entities.push(entity);
      }
    }
    return entities;
  }
  
  /**
   * Clear all entities from the grid.
   * Called at the start of each tick to rebuild fresh.
   */
  clear(): void {
    this.chunkToEntities.clear();
    this.entities.clear();
  }
  
  /**
   * Get statistics about the grid state.
   */
  getStats(): { totalEntities: number; totalChunks: number; byKind: Record<SpatialEntityKind, number> } {
    const byKind: Record<SpatialEntityKind, number> = { player: 0, npc: 0, loot: 0 };
    let totalChunks = 0;
    
    for (const entity of this.entities.values()) {
      byKind[entity.kind]++;
    }

    for (const entityIds of this.chunkToEntities.values()) {
      if (entityIds.size > 0) totalChunks++;
    }
    
    return {
      totalEntities: this.entities.size,
      totalChunks,
      byKind,
    };
  }
}

/**
 * Global spatial grid instance.
 */
export const spatialBroadcastGrid = new SpatialBroadcastGrid();

/**
 * SpatialBroadcastTickSystem implements TickSystem for spatial management.
 */
export class SpatialBroadcastTickSystem implements TickSystem {
  readonly name = 'spatial-broadcast';
  readonly priority = TickSystemPriority.BROADCAST;
  enabled = true;
  
  private grid: SpatialBroadcastGrid;
  private playerPositionProvider: (() => Array<{ id: string; x: number; y: number; isOffline?: boolean }>) | null = null;
  private npcPositionProvider: (() => Array<{ id: string; x: number; y: number; name?: string; health?: number; maxHealth?: number; role?: string; state?: string }>) | null = null;
  private lootProvider: (() => Array<{ id: string; position?: { x: number; y: number }; items?: unknown[]; gold?: number }>) | null = null;
  private broadcastHandler: ((socketId: string, snapshot: unknown) => void) | null = null;
  private playerToSocketProvider: (() => Map<string, string>) | null = null;
  private socketToPlayerProvider: (() => Map<string, string>) | null = null;
  
  constructor(grid?: SpatialBroadcastGrid) {
    this.grid = grid || spatialBroadcastGrid;
  }
  
  setPlayerPositionProvider(provider: () => Array<{ id: string; x: number; y: number; isOffline?: boolean }>): void {
    this.playerPositionProvider = provider;
  }
  
  setNpcPositionProvider(provider: () => Array<{ id: string; x: number; y: number; name?: string; health?: number; maxHealth?: number; role?: string; state?: string }>): void {
    this.npcPositionProvider = provider;
  }
  
  setLootProvider(provider: () => Array<{ id: string; position?: { x: number; y: number }; items?: unknown[]; gold?: number }>): void {
    this.lootProvider = provider;
  }
  
  setBroadcastHandler(handler: (socketId: string, snapshot: unknown) => void): void {
    this.broadcastHandler = handler;
  }
  
  setPlayerToSocketProvider(provider: () => Map<string, string>): void {
    this.playerToSocketProvider = provider;
  }
  
  setSocketToPlayerProvider(provider: () => Map<string, string>): void {
    this.socketToPlayerProvider = provider;
  }
  
  tick(_context: TickSystemContext): void {
    this.grid.clear();
    
    for (const player of this.playerPositionProvider?.() ?? []) {
      if (player.isOffline) continue;
      this.grid.upsert(player.id, player.x, player.y, 'player', { player });
    }
    
    for (const npc of this.npcPositionProvider?.() ?? []) {
      this.grid.upsert(npc.id, npc.x, npc.y, 'npc', { npc });
    }
    
    for (const loot of this.lootProvider?.() ?? []) {
      if (!loot.position) continue;
      this.grid.upsert(loot.id, loot.position.x, loot.position.y, 'loot', { loot });
    }
    
    this.broadcastVisibleEntities();
  }

  private broadcastVisibleEntities(): void {
    if (!this.broadcastHandler || !this.playerToSocketProvider || !this.socketToPlayerProvider) return;
    const playerToSocket = this.playerToSocketProvider();
    for (const player of this.playerPositionProvider?.() ?? []) {
      if (player.isOffline) continue;
      const socketId = playerToSocket.get(player.id);
      if (!socketId) continue;
      const visibleEntities = this.grid.getVisibleEntities(player.x, player.y);
      this.broadcastHandler(socketId, {
        type: 'SPATIAL_SNAPSHOT',
        playerId: player.id,
        entities: visibleEntities,
      });
    }
  }

  getGrid(): SpatialBroadcastGrid {
    return this.grid;
  }
}

export function registerSpatialBroadcastTickSystem(registry = tickSystemRegistry): SpatialBroadcastTickSystem {
  const system = new SpatialBroadcastTickSystem();
  registry.register({
    system,
    dependencies: [],
    tags: ['spatial', 'broadcast'],
  });
  return system;
}
