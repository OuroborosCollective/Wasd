/**
 * ARELORIA CORE: Unified Chunk Contract
 * 
 * Single source of truth for chunk geometry parameters.
 * 
 * ARCHITECTURE DECISION: Resolve conflicting radii:
 * - ObserverEngine used viewDistanceChunks=2 → 5×5 simulation/interest grid
 * - WorldTick.SpatialBroadcastGrid used 3×3 broadcast grid
 * 
 * Solution:
 * - simulationRadiusChunks = 2 → 5×5 for INTEREST MANAGEMENT
 * - broadcastRadiusChunks = 1 → 3×3 for CLIENT SNAPSHOTS
 * 
 * These are NOT conflicting - they serve different purposes:
 * - 5×5 = which chunks affect simulation/interest calculations
 * - 3×3 = which entities are sent to client in snapshot
 */

import { CHUNK_SIZE_TILES, CHUNK_SIZE_KAPPA } from './ChunkMath';

export interface UnifiedChunkContract {
  /** Chunk size in tiles (world units) */
  readonly chunkSizeTiles: number;
  
  /** Chunk size in Kappa (fixed-point) */
  readonly chunkSizeKappa: number;
  
  /** 
   * Radius for simulation/interest management.
   * Entities in this range affect each other's simulation.
   * 2 chunks = 5×5 grid centered on observer
   */
  readonly simulationRadiusChunks: 2;
  
  /** 
   * Radius for client broadcast snapshots.
   * Only entities in this range are sent to client.
   * 1 chunk = 3×3 grid centered on observer
   */
  readonly broadcastRadiusChunks: 1;
  
  /** 
   * Number of chunks in simulation grid (one dimension).
   * simulationRadius 2 → 5 chunks (dx from -2 to +2)
   */
  readonly simulationGridSize: 5;
  
  /** 
   * Number of chunks in broadcast grid (one dimension).
   * broadcastRadius 1 → 3 chunks (dx from -1 to +1)
   */
  readonly broadcastGridSize: 3;
  
  /** 
   * Chunks after which a dormant chunk becomes inactive.
   * 0 = immediately dormant when no observers
   */
  readonly dormantAfterTicks: number;
}

export const UNIFIED_CHUNK_CONTRACT: UnifiedChunkContract = {
  chunkSizeTiles: CHUNK_SIZE_TILES,
  chunkSizeKappa: CHUNK_SIZE_KAPPA,
  simulationRadiusChunks: 2,
  broadcastRadiusChunks: 1,
  simulationGridSize: 5, // 2*2 + 1
  broadcastGridSize: 3, // 1*2 + 1
  dormantAfterTicks: 0, // Immediately dormant when no observers
} as const;

/**
 * Validate chunk coordinate is within bounds.
 */
export function assertValidChunkCoord(coord: number, operation: string): void {
  if (!Number.isInteger(coord)) {
    throw new Error(`[UnifiedChunkContract] Non-integer chunk coord in ${operation}: ${coord}`);
  }
  // Reasonable bounds check (-32768 to 32767 for Morton code compatibility)
  if (coord < -32768 || coord > 32767) {
    throw new Error(`[UnifiedChunkContract] Chunk coord out of Morton range in ${operation}: ${coord}`);
  }
}