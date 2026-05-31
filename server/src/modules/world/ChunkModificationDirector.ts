/**
 * OUROBOROS WORLD SEEDING: Chunk Modification Director
 * 
 * Tracks depleted resources per chunk to ensure deterministic regeneration
 * doesn't respawn already-gathered resources on chunk reload.
 * 
 * Axiom der Erhaltung: A felled tree must NOT respawn when the chunk
 * is unloaded and reloaded. The ChunkModificationDirector tracks these
 * modifications persistently per chunkCoordinate.
 */

import { AREHash } from '../../core/are/AREHash.js';

/**
 * Represents a single modification to a chunk state.
 * Could be a depleted resource, a placed building, etc.
 */
export interface ChunkModification {
  id: string;                    // Resource entity ID (e.g., 'res_wood_0_5_3')
  type: 'depleted' | 'placed' | 'modified';
  tick: number;                   // World tick when modification occurred
  originalYield?: number;         // Original yield value (for depleted resources)
}

/**
 * Snapshot of all modifications for a specific chunk.
 */
export interface ChunkModificationData {
  chunkX: number;
  chunkZ: number;
  worldSeed: string;
  modifications: Map<string, ChunkModification>;
  lastModifiedTick: number;
}

type ChunkKey = string;

function makeChunkKey(chunkX: number, chunkZ: number): ChunkKey {
  return `${chunkX}:${chunkZ}`;
}

/**
 * Deterministic entity ID generator for resources.
 * Format: res_{type}_{chunkX}_{chunkZ}_{index}
 * 
 * This ensures that when we regenerate the same chunk with the same seed,
 * we get the same resource entities. Then we check if their IDs are in
 * the modification map to determine if they should be depleted.
 */
export function generateResourceEntityId(
  resourceType: string,
  chunkX: number,
  chunkZ: number,
  index: number
): string {
  return `res_${resourceType}_${chunkX}_${chunkZ}_${index}`;
}

/**
 * ChunkModificationDirector - Persistent state tracking for chunk modifications.
 * 
 * Key design decisions:
 * 1. Uses deterministic AREHash to get chunk keys - same chunk always gets same key
 * 2. Modification map is indexed by entity ID for O(1) lookup during generation
 * 3. Tick tracking enables cleaning old modifications if needed
 */
export class ChunkModificationDirector {
  private static instance: ChunkModificationDirector;
  
  /**
   * Map from chunk key (cx:cz) to modification data.
   * In production, this should be persisted to DB/file storage.
   */
  private readonly modificationMap = new Map<ChunkKey, ChunkModificationData>();
  
  private constructor() {
    // Hidden constructor for singleton
  }

  public static getInstance(): ChunkModificationDirector {
    if (!ChunkModificationDirector.instance) {
      ChunkModificationDirector.instance = new ChunkModificationDirector();
    }
    return ChunkModificationDirector.instance;
  }

  /**
   * Check if a resource entity is marked as modified (e.g., depleted).
   */
  public isResourceDepleted(entityId: string): boolean {
    for (const data of this.modificationMap.values()) {
      if (data.modifications.has(entityId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get depletion data for a specific entity.
   */
  public getModification(entityId: string): ChunkModification | undefined {
    for (const data of this.modificationMap.values()) {
      const mod = data.modifications.get(entityId);
      if (mod) return mod;
    }
    return undefined;
  }

  /**
   * Mark a resource as depleted.
   * 
   * @param entityId - The generated entity ID (deterministic)
   * @param chunkX - Chunk X coordinate
   * @param chunkZ - Chunk Z coordinate
   * @param tick - Current world tick
   * @param originalYield - Original yield value for potential restoration
   */
  public markResourceDepleted(
    entityId: string,
    chunkX: number,
    chunkZ: number,
    tick: number,
    originalYield?: number
  ): void {
    const key = makeChunkKey(chunkX, chunkZ);
    let data = this.modificationMap.get(key);
    
    if (!data) {
      // Create new chunk data if it doesn't exist
      data = {
        chunkX,
        chunkZ,
        worldSeed: '', // Optional: could store world seed for validation
        modifications: new Map(),
        lastModifiedTick: tick,
      };
      this.modificationMap.set(key, data);
    }

    data.modifications.set(entityId, {
      id: entityId,
      type: 'depleted',
      tick,
      originalYield,
    });
    data.lastModifiedTick = tick;
  }

  /**
   * Get all depleted resource IDs for a specific chunk.
   * Used during chunk generation to filter out depleted resources.
   */
  public getDepletedResourcesForChunk(chunkX: number, chunkZ: number): Set<string> {
    const key = makeChunkKey(chunkX, chunkZ);
    const data = this.modificationMap.get(key);
    if (!data) return new Set();

    const depleted = new Set<string>();
    for (const [id, mod] of data.modifications) {
      if (mod.type === 'depleted') {
        depleted.add(id);
      }
    }
    return depleted;
  }

  /**
   * Check if a chunk has any modifications.
   */
  public hasChunkModifications(chunkX: number, chunkZ: number): boolean {
    const key = makeChunkKey(chunkX, chunkZ);
    const data = this.modificationMap.get(key);
    return data !== undefined && data.modifications.size > 0;
  }

  /**
   * Get modification count for diagnostics.
   */
  public getTotalModificationCount(): number {
    let count = 0;
    for (const data of this.modificationMap.values()) {
      count += data.modifications.size;
    }
    return count;
  }

  /**
   * Serialization support for persistence.
   * Returns a JSON-serializable representation.
   */
  public serialize(): SerializedChunkModifications {
    const serialized: SerializedChunkModifications = {};
    for (const [key, data] of this.modificationMap) {
      serialized[key] = {
        chunkX: data.chunkX,
        chunkZ: data.chunkZ,
        modifications: Array.from(data.modifications.entries()),
        lastModifiedTick: data.lastModifiedTick,
      };
    }
    return serialized;
  }

  /**
   * Restore from serialized data (e.g., after server restart).
   */
  public deserialize(data: SerializedChunkModifications): void {
    this.modificationMap.clear();
    for (const [key, serialized] of Object.entries(data)) {
      const [cx, cz] = key.split(':').map(Number);
      const modifications = new Map<string, ChunkModification>();
      for (const [id, mod] of serialized.modifications) {
        modifications.set(id, mod as ChunkModification);
      }
      this.modificationMap.set(key, {
        chunkX: cx,
        chunkZ: cz,
        worldSeed: serialized.worldSeed ?? '',
        modifications,
        lastModifiedTick: serialized.lastModifiedTick,
      });
    }
  }

  /**
   * Clear all modifications (for testing/reset).
   */
  public clear(): void {
    this.modificationMap.clear();
  }

  /**
   * Reset singleton (for testing).
   */
  public static reset(): void {
    ChunkModificationDirector.instance = new ChunkModificationDirector();
  }
}

export interface SerializedChunkModifications {
  [chunkKey: string]: {
    chunkX: number;
    chunkZ: number;
    worldSeed?: string;
    modifications: [string, ChunkModification][];
    lastModifiedTick: number;
  };
}

// Singleton export
export const chunkModificationDirector = ChunkModificationDirector.getInstance();
