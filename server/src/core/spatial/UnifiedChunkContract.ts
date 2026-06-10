/**
 * ARELORIA CORE: Unified Chunk Contract
 * 
 * Establishes the single source of truth for chunk visibility radii.
 * 
 * Key architectural decision:
 * - Simulation radius: 5×5 grid (radius=2) - entities within this range are simulated together
 * - Broadcast radius: 3×3 grid (radius=1) - entities within this range receive updates
 * 
 * This separation allows:
 * - Accurate simulation of nearby entities
 * - Efficient bandwidth by only broadcasting to nearby chunks
 * - Prevention of "popping" when entities enter/exit simulation range
 */

import type { ChunkKey } from '../are/types';
import { getChunkGrid } from './ChunkMath';

/**
 * Simulation radius: Number of chunks in each direction from center.
 * At radius=2, this creates a 5×5 grid covering 10×10 chunks.
 */
export const SIMULATION_CHUNK_RADIUS = 2;

/**
 * Broadcast radius: Number of chunks in each direction from center.
 * At radius=1, this creates a 3×3 grid covering 6×6 chunks.
 */
export const BROADCAST_CHUNK_RADIUS = 1;

/**
 * Total chunks in simulation grid (5×5 = 25)
 */
export const SIMULATION_CHUNK_COUNT = (SIMULATION_CHUNK_RADIUS * 2 + 1) ** 2;

/**
 * Total chunks in broadcast grid (3×3 = 9)
 */
export const BROADCAST_CHUNK_COUNT = (BROADCAST_CHUNK_RADIUS * 2 + 1) ** 2;

/**
 * UnifiedChunkContract: Interface for chunk visibility contracts.
 * 
 * All spatial systems MUST use these constants/functions to ensure
 * consistent chunk visibility across the codebase.
 */
export interface UnifiedChunkContract {
  /** Radius for simulation (entities within this range are processed together) */
  readonly simulationRadius: number;
  
  /** Radius for broadcast (entities within this range receive updates) */
  readonly broadcastRadius: number;
  
  /** Get all chunk keys for simulation range */
  getSimulationChunks(center: ChunkKey): ChunkKey[];
  
  /** Get all chunk keys for broadcast range */
  getBroadcastChunks(center: ChunkKey): ChunkKey[];
  
  /** Check if a chunk is within simulation range of center */
  isInSimulationRange(center: ChunkKey, chunk: ChunkKey): boolean;
  
  /** Check if a chunk is within broadcast range of center */
  isInBroadcastRange(center: ChunkKey, chunk: ChunkKey): boolean;
}

/**
 * Default implementation of UnifiedChunkContract.
 * Uses the standard 5×5 simulation / 3×3 broadcast radii.
 */
export class DefaultChunkContract implements UnifiedChunkContract {
  readonly simulationRadius = SIMULATION_CHUNK_RADIUS;
  readonly broadcastRadius = BROADCAST_CHUNK_RADIUS;

  getSimulationChunks(center: ChunkKey): ChunkKey[] {
    return getChunkGrid(center, this.simulationRadius);
  }

  getBroadcastChunks(center: ChunkKey): ChunkKey[] {
    return getChunkGrid(center, this.broadcastRadius);
  }

  isInSimulationRange(center: ChunkKey, chunk: ChunkKey): boolean {
    const simulationChunks = this.getSimulationChunks(center);
    return simulationChunks.includes(chunk);
  }

  isInBroadcastRange(center: ChunkKey, chunk: ChunkKey): boolean {
    const broadcastChunks = this.getBroadcastChunks(center);
    return broadcastChunks.includes(chunk);
  }
}

/**
 * Singleton instance of the default chunk contract.
 */
export const chunkContract = new DefaultChunkContract();

/**
 * Get all chunks that should be simulated for an entity at the given position.
 * This includes the entity's own chunk plus all chunks within simulation radius.
 */
export function getSimulationChunks(center: ChunkKey): ChunkKey[] {
  return chunkContract.getSimulationChunks(center);
}

/**
 * Get all chunks that should receive broadcasts for an entity at the given position.
 * This is a subset of simulation chunks (3×3 vs 5×5).
 */
export function getBroadcastChunks(center: ChunkKey): ChunkKey[] {
  return chunkContract.getBroadcastChunks(center);
}

/**
 * Check if a chunk is within the simulation range of another chunk.
 */
export function isInSimulationRange(center: ChunkKey, chunk: ChunkKey): boolean {
  return chunkContract.isInSimulationRange(center, chunk);
}

/**
 * Check if a chunk is within the broadcast range of another chunk.
 */
export function isInBroadcastRange(center: ChunkKey, chunk: ChunkKey): boolean {
  return chunkContract.isInBroadcastRange(center, chunk);
}

/**
 * Get all chunks that are in simulation range but NOT in broadcast range.
 * These chunks are simulated but don't receive broadcasts (edge of interaction).
 */
export function getEdgeChunks(center: ChunkKey): ChunkKey[] {
  const simChunks = getSimulationChunks(center);
  const broadcastChunks = getBroadcastChunks(center);
  return simChunks.filter(c => !broadcastChunks.includes(c));
}

/**
 * Validate that a radius value is valid for chunk operations.
 */
export function isValidChunkRadius(radius: number): boolean {
  return Number.isInteger(radius) && radius >= 0 && radius <= 10;
}