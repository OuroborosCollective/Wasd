/**
 * OUROBOROS WORLD SEEDING: Resource Populator
 * 
 * Deterministic resource entity generation for chunks.
 * 
 * Axiom 1 (Absolute Determinism): NO non-deterministic RNG.
 * All resource placement is derived from worldSeed + chunkX + chunkZ via AREHash.
 * 
 * Axiom 2 (KAPPA-Grid Alignment): All resources have precise KAPPA coordinates.
 * 
 * Axiom 3 (Depletion Persistence): Resources that were gathered don't respawn
 * on chunk reload - tracked via ChunkModificationDirector.
 */

// @ARE-GUARD-EXEMPT: Performance monitoring only; timing measurements are observability metrics, not world-state inputs.

import { SeededARERng } from '../../core/determinism/AREDeterminism.js';
import { AREHash } from '../../core/are/AREHash.js';
import { chunkModificationDirector, generateResourceEntityId } from './ChunkModificationDirector.js';

/**
 * Resource type definitions with yield and biome associations.
 */
export interface ResourceDefinition {
  type: string;              // e.g., 'wood', 'stone', 'iron'
  yield: number;             // Base yield per gather
  density: number;           // 0-1 probability per spawn attempt
  biomes: string[];          // Allowed biomes
  footprint: { w: number; d: number };  // KAPPA-space footprint
}

/**
 * Predefined resource definitions for the game.
 */
export const RESOURCE_DEFINITIONS: Record<string, ResourceDefinition> = {
  wood: {
    type: 'wood',
    yield: 5,
    density: 0.15,
    biomes: ['forest', 'plains'],
    footprint: { w: 3, d: 3 },
  },
  stone: {
    type: 'stone',
    yield: 4,
    density: 0.12,
    biomes: ['mountain', 'hills'],
    footprint: { w: 2, d: 2 },
  },
  iron: {
    type: 'iron',
    yield: 2,
    density: 0.05,
    biomes: ['mountain'],
    footprint: { w: 2, d: 2 },
  },
  berries: {
    type: 'berries',
    yield: 3,
    density: 0.1,
    biomes: ['forest'],
    footprint: { w: 2, d: 2 },
  },
  herbs: {
    type: 'herbs',
    yield: 2,
    density: 0.08,
    biomes: ['plains', 'forest'],
    footprint: { w: 1, d: 1 },
  },
};

/**
 * Generated resource entity ready for world placement.
 */
export interface GeneratedResourceEntity {
  id: string;
  type: 'RESOURCE';
  resourceType: string;
  kappaX: number;      // KAPPA-space X coordinate
  kappaZ: number;      // KAPPA-space Z coordinate
  yield: number;       // Total yield (for regrow calculations)
  remainingYield: number;
  regrowRate: number;  // Ticks to regrow 1 unit
  depleted: boolean;   // Pre-depleted (from chunk modification)
}

/**
 * Chunk resource population result.
 */
export interface ChunkPopulationResult {
  chunkX: number;
  chunkZ: number;
  entities: GeneratedResourceEntity[];
  generationMs: number;
}

/**
 * ResourcePopulator - Deterministic chunk resource generation.
 * 
 * Uses SeededARERng derived from AREHash(worldSeed, chunkX, chunkZ) to
 * generate resources in a reproducible manner. The same chunk will always
 * generate the same resources in the same positions.
 */
export class ResourcePopulator {
  private static instance: ResourcePopulator;
  
  /**
   * Global world seed for all chunk generation.
   */
  private worldSeed: string = 'areloria:world:1';
  
  /**
   * Maximum spawn attempts per chunk per resource type.
   */
  private readonly SPAWN_ATTEMPTS_PER_CHUNK = 8;
  
  /**
   * KAPPA scale: 1 unit = 1000 KAPPA.
   * For chunk coordinates (64x64 tiles), we use tile coordinates.
   */
  private readonly KAPPA_SCALE = 1000;
  
  /**
   * Chunk size in tiles.
   */
  private readonly CHUNK_SIZE = 64;

  private constructor() {
    // Hidden constructor for singleton
  }

  public static getInstance(): ResourcePopulator {
    if (!ResourcePopulator.instance) {
      ResourcePopulator.instance = new ResourcePopulator();
    }
    return ResourcePopulator.instance;
  }

  /**
   * Set the global world seed.
   */
  public setWorldSeed(seed: string): void {
    this.worldSeed = seed;
  }

  /**
   * Get deterministic seed for a specific chunk.
   * Combines worldSeed + chunkX + chunkZ via AREHash.
   */
  private getChunkSeed(chunkX: number, chunkZ: number): number {
    const combined = `${this.worldSeed}:chunk:${chunkX}:${chunkZ}`;
    const hash = AREHash.hashObject({ seed: combined, chunkX, chunkZ });
    return hash;
  }

  /**
   * Generate resources for a specific chunk.
   * 
   * @param chunkX - Chunk X coordinate
   * @param chunkZ - Chunk Z coordinate  
   * @param biome - The dominant biome for this chunk (determines resource types)
   * @param depletedResources - Optional set of pre-depleted resource IDs
   * @returns Array of generated resource entities
   */
  public generateChunkResources(
    chunkX: number,
    chunkZ: number,
    biome: string = 'forest',
    depletedResources?: Set<string>
  ): ChunkPopulationResult {
    const startTime = performance.now();
    const entities: GeneratedResourceEntity[] = [];
    
    // Get deterministic RNG for this chunk
    const chunkSeed = this.getChunkSeed(chunkX, chunkZ);
    const rng = new SeededARERng(chunkSeed);
    
    // If no depleted resources provided, check the modification director
    if (!depletedResources) {
      depletedResources = chunkModificationDirector.getDepletedResourcesForChunk(chunkX, chunkZ);
    }
    
    // Generate resources for each defined type
    for (const [resourceKey, definition] of Object.entries(RESOURCE_DEFINITIONS)) {
      // Check if this resource type is allowed in this biome
      if (!definition.biomes.includes(biome)) {
        continue;
      }
      
      // Spawn attempts based on density
      const spawnAttempts = Math.ceil(this.SPAWN_ATTEMPTS_PER_CHUNK * definition.density);
      
      for (let attempt = 0; attempt < spawnAttempts; attempt++) {
        // Generate deterministic position within chunk
        // Use chunk-local coordinates (0 to CHUNK_SIZE)
        const localX = rng.nextRange(2, this.CHUNK_SIZE - 2);
        const localZ = rng.nextRange(2, this.CHUNK_SIZE - 2);
        
        // Convert to world coordinates (tile space)
        const worldX = chunkX * this.CHUNK_SIZE + localX;
        const worldZ = chunkZ * this.CHUNK_SIZE + localZ;
        
        // Convert to KAPPA coordinates
        const kappaX = Math.round(worldX * this.KAPPA_SCALE);
        const kappaZ = Math.round(worldZ * this.KAPPA_SCALE);
        
        // Generate deterministic entity ID
        const entityIndex = entities.length;
        const entityId = generateResourceEntityId(
          definition.type,
          chunkX,
          chunkZ,
          entityIndex
        );
        
        // Check if this resource is depleted
        const isDepleted = depletedResources.has(entityId);
        
        // Create the resource entity
        const entity: GeneratedResourceEntity = {
          id: entityId,
          type: 'RESOURCE',
          resourceType: definition.type,
          kappaX,
          kappaZ,
          yield: definition.yield,
          remainingYield: isDepleted ? 0 : definition.yield,
          regrowRate: this.getRegrowRate(definition.type),
          depleted: isDepleted,
        };
        
        entities.push(entity);
      }
    }
    
    const generationMs = performance.now() - startTime;
    
    return {
      chunkX,
      chunkZ,
      entities,
      generationMs,
    };
  }

  /**
   * Get regrowth rate based on resource type.
   * Returns ticks needed to regrow 1 unit.
   */
  private getRegrowRate(resourceType: string): number {
    switch (resourceType) {
      case 'wood': return 600;      // ~60 seconds at 10 ticks/sec
      case 'stone': return 400;     // ~40 seconds
      case 'iron': return 1200;     // ~120 seconds (rare)
      case 'berries': return 200;   // ~20 seconds (fast regrow)
      case 'herbs': return 300;     // ~30 seconds
      default: return 500;
    }
  }

  /**
   * Convert resource entity to world-ready format.
   * Used by the spatial broadcast system.
   */
  public toWorldEntity(entity: GeneratedResourceEntity): Record<string, unknown> {
    return {
      id: entity.id,
      type: entity.type,
      resourceType: entity.resourceType,
      x: entity.kappaX / this.KAPPA_SCALE,      // Convert back to world space
      z: entity.kappaZ / this.KAPPA_SCALE,
      kappaX: entity.kappaX,
      kappaZ: entity.kappaZ,
      yield: entity.remainingYield,
      maxYield: entity.yield,
      depleted: entity.depleted,
      regrowRate: entity.regrowRate,
    };
  }

  /**
   * Get footprint for collision/pathfinding.
   */
  public getResourceFootprint(resourceType: string): { w: number; d: number } {
    const def = RESOURCE_DEFINITIONS[resourceType];
    return def?.footprint ?? { w: 2, d: 2 };
  }
}

// Singleton export
export const resourcePopulator = ResourcePopulator.getInstance();
