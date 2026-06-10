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
import { createChunkKey, type ChunkKey, type ChunkCoord } from './types.js';
import { UNIFIED_CHUNK_CONTRACT } from '../spatial/UnifiedChunkContract.js';

/**
 * SPATIAL_CHUNK_SIZE: Each chunk is 64 tiles × 64 tiles.
 * Used for Spatial Plexity (Axiom 4) - spatial filtering for broadcasts.
 */
const SPATIAL_CHUNK_SIZE = UNIFIED_CHUNK_CONTRACT.chunkSizeTiles;

/**
 * Chunk key format: "cx:cz" where:
 *   - cx = Math.floor(tileX / SPATIAL_CHUNK_SIZE)
 *   - cz = Math.floor(tileZ / SPATIAL_CHUNK_SIZE)
 */
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
 * 
 * Architecture:
 * - Map<ChunkKey, Set<EntityId>> for fast chunk-to-entity lookup
 * - Map<EntityId, SpatialEntity> for entity data cache
 * 
 * When an entity moves, we detect chunk migration and update both indexes.
 */
export class SpatialBroadcastGrid {
  /** Map<ChunkKey, Set<EntityId>> - O(1) lookup by chunk */
  private chunkToEntities = new Map<ChunkKey, Set<string>>();
  
  /** Map<EntityId, SpatialEntity> - Entity data cache */
  private entities = new Map<string, SpatialEntity>();

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
        existing.data = data;
        return;
      }
      
      // Different chunk - migrate entity
      this.chunkToEntities.get(oldChunkKey)?.delete(id);
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
    this.entities.delete(id);
  }
  
  /**
   * Get all entities visible in the chunk grid around the given tile position.
   * Uses broadcastRadiusChunks from UnifiedChunkContract.
   */
  getVisibleEntities(centerTileX: number, centerTileZ: number): SpatialEntity[] {
    const centerChunkKey = computeChunkKey(centerTileX, centerTileZ);
    const chunkKeys = getChunkKeysForRadius(centerChunkKey, UNIFIED_CHUNK_CONTRACT.broadcastRadiusChunks);
    
    const visibleEntities: SpatialEntity[] = [];
    
    for (const chunkKey of chunkKeys) {
      const entityIds = this.chunkToEntities.get(chunkKey);
      if (!entityIds) continue;
      
      for (const id of entityIds) {
        const entity = this.entities.get(id);
        if (entity) {
          visibleEntities.push(entity);
        }
      }
    }
    
    return visibleEntities;
  }
  
  /**
   * Get all entities in a specific chunk.
   */
  getEntitiesInChunk(chunkKey: ChunkKey): SpatialEntity[] {
    const entityIds = this.chunkToEntities.get(chunkKey);
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
    
    for (const entity of this.entities.values()) {
      byKind[entity.kind]++;
    }
    
    return {
      totalEntities: this.entities.size,
      totalChunks: this.chunkToEntities.size,
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
 * 
 * This extracts the spatial grid logic from WorldTick.tick() into a
 * standalone system that can be tested and reused.
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
  
  /**
   * Set the player position provider.
   * Called each tick to get current player positions.
   */
  setPlayerPositionProvider(provider: () => Array<{ id: string; x: number; y: number; isOffline?: boolean }>): void {
    this.playerPositionProvider = provider;
  }
  
  /**
   * Set the NPC position provider.
   */
  setNpcPositionProvider(provider: () => Array<{ id: string; x: number; y: number; name?: string; health?: number; maxHealth?: number; role?: string; state?: string }>): void {
    this.npcPositionProvider = provider;
  }
  
  /**
   * Set the loot entity provider.
   */
  setLootProvider(provider: () => Array<{ id: string; position?: { x: number; y: number }; items?: unknown[]; gold?: number }>): void {
    this.lootProvider = provider;
  }
  
  /**
   * Set the broadcast handler for sending snapshots to clients.
   */
  setBroadcastHandler(handler: (socketId: string, snapshot: unknown) => void): void {
    this.broadcastHandler = handler;
  }
  
  /**
   * Set the player-to-socket mapping provider.
   */
  setPlayerToSocketProvider(provider: () => Map<string, string>): void {
    this.playerToSocketProvider = provider;
  }
  
  /**
   * Set the socket-to-player mapping provider.
   */
  setSocketToPlayerProvider(provider: () => Map<string, string>): void {
    this.socketToPlayerProvider = provider;
  }
  
  tick(context: TickSystemContext): void {
    // Step 1: Rebuild the spatial grid with current entity positions
    this.grid.clear();
    
    // Step 2: Add all online players to spatial grid
    if (this.playerPositionProvider) {
      const players = this.playerPositionProvider();
      for (const player of players) {
        if (player.isOffline) continue;
        const tileX = Math.round(player.x);
        const tileZ = Math.round(player.y);
        this.grid.upsert(player.id, tileX, tileZ, "player", {
          id: player.id,
          name: player.name ?? player.id,
          x: tileX,
          z: tileZ,
          kind: "player",
        });
      }
    }
    
    // Step 3: Add all NPCs to spatial grid
    if (this.npcPositionProvider) {
      const npcs = this.npcPositionProvider();
      for (const npc of npcs) {
        const tileX = Math.round(npc.x);
        const tileZ = Math.round(npc.y);
        this.grid.upsert(npc.id, tileX, tileZ, "npc", {
          id: npc.id,
          name: npc.name ?? npc.id,
          x: tileX,
          z: tileZ,
          kind: "npc",
          health: npc.health,
          maxHealth: npc.maxHealth,
          role: npc.role,
          state: npc.state,
        });
      }
    }
    
    // Step 4: Add all loot entities to spatial grid
    if (this.lootProvider) {
      const lootEntities = this.lootProvider();
      for (const loot of lootEntities) {
        if (!loot.position) continue;
        const tileX = Math.round(loot.position.x);
        const tileZ = Math.round(loot.position.y);
        this.grid.upsert(loot.id, tileX, tileZ, "loot", {
          id: loot.id,
          x: tileX,
          z: tileZ,
          kind: "loot",
          items: loot.items,
          gold: loot.gold,
        });
      }
    }
    
    // Step 5: Broadcast spatial snapshots to each connected player
    if (this.broadcastHandler && this.playerToSocketProvider && this.socketToPlayerProvider) {
      const playerToSocket = this.playerToSocketProvider();
      const socketToPlayer = this.socketToPlayerProvider();
      
      for (const [socketId, playerId] of playerToSocket) {
        // Find player position from provider
        if (this.playerPositionProvider) {
          const players = this.playerPositionProvider();
          const player = players.find(p => p.id === playerId);
          if (!player || player.isOffline) continue;
          
          const playerTileX = Math.round(player.x);
          const playerTileZ = Math.round(player.y);
          
          // Build and broadcast snapshot
          const snapshot = this.buildSpatialSnapshot(playerId, playerTileX, playerTileZ);
          this.broadcastHandler(socketId, snapshot);
        }
      }
    }
  }
  
  /**
   * Build a spatial snapshot for a player at the given position.
   */
  private buildSpatialSnapshot(selfId: string, playerTileX: number, playerTileZ: number): {
    type: string;
    selfId: string;
    otherPlayers: Record<string, unknown>[];
    npcs: Record<string, unknown>[];
    loot: Record<string, unknown>[];
  } {
    const visibleEntities = this.grid.getVisibleEntities(playerTileX, playerTileZ);
    
    const otherPlayers: Record<string, unknown>[] = [];
    const npcs: Record<string, unknown>[] = [];
    const loot: Record<string, unknown>[] = [];
    
    for (const entity of visibleEntities) {
      if (entity.id === selfId) continue; // Skip self
      
      if (entity.kind === "player") {
        otherPlayers.push(entity.data);
      } else if (entity.kind === "npc") {
        npcs.push(entity.data);
      } else if (entity.kind === "loot") {
        loot.push(entity.data);
      }
    }
    
    return {
      type: "spatial_snapshot",
      selfId,
      otherPlayers,
      npcs,
      loot,
    };
  }
  
  /**
   * Get the underlying spatial grid for testing.
   */
  getGrid(): SpatialBroadcastGrid {
    return this.grid;
  }
}