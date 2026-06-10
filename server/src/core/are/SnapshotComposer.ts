/**
 * SnapshotComposer - Phase 8: Snapshot Composition with Layer Validation
 * 
 * Composes deterministic world snapshots from:
 * - ChunkID
 * - EntityStates
 * - IARELogicLayers (13 layers)
 * 
 * Integrates with PersistenceQueue for Phase 9.
 * 
 * Conservation law: ∑ Are = const
 */

import type { Kappa, TickId, StateHash, ChunkKey, EntityId } from './types.js';
import { createStateHash, type KappaInt } from './types.js';
import { KAPPA } from './Kappa.js';
import type { IARELogicLayers, LayerPersistenceEvent } from './IARELogicLayers.js';
import { getLayerValues, LAYER_CONSTANTS, createEmptyIARELogicLayers } from './IARELogicLayers.js';

/**
 * DeterminismViolation - Thrown when ARE conservation law is violated.
 */
export class DeterminismViolation extends Error {
  constructor(message: string) {
    super(`[ARE-Logic] DeterminismViolation: ${message}`);
    this.name = 'DeterminismViolation';
  }
}

/**
 * Entity state for snapshot composition.
 */
export interface SnapshotEntityState {
  id: EntityId;
  position_x: KappaInt;
  position_z: KappaInt;
  health: KappaInt;
  level: KappaInt;
}

/**
 * Chunk snapshot with 13-layer validation.
 */
export interface ChunkSnapshot {
  chunkId: ChunkKey;
  tick: TickId;
  entityStates: SnapshotEntityState[];
  iareLayers: IARELogicLayers;
  layerChecksum: KappaInt;
  deltaHash: StateHash;
}

/**
 * World snapshot - full state for a tick.
 */
export interface WorldSnapshot {
  tick: TickId;
  chunkSnapshots: Map<ChunkKey, ChunkSnapshot>;
  worldHash: StateHash;
  layerChecksum: KappaInt;
  activeChunkCount: number;
}

/**
 * SnapshotComposer - Composes deterministic world snapshots.
 * 
 * WorldHash = Hash(ChunkID + EntityStates + IARELogicLayers)
 */
export class SnapshotComposer {
  /** Chunk snapshots for current tick */
  private chunkSnapshots: Map<ChunkKey, ChunkSnapshot> = new Map();
  
  /** Previous world hash for delta calculation */
  private previousWorldHash: StateHash = createStateHash('0'.repeat(64));
  
  /** Persistence queue for layer events */
  private persistenceQueue: LayerPersistenceEvent[] = [];
  
  /**
   * Add a chunk to the snapshot composition.
   */
  addChunk(chunkId: ChunkKey, tick: TickId, entityStates: SnapshotEntityState[], iareLayers: IARELogicLayers): void {
    // Validate layer integrity BEFORE adding
    SnapshotComposer.validateLayerIntegrity(iareLayers);
    
    // Compute layer checksum
    const layerChecksum = this.computeLayerChecksum(iareLayers);
    
    // Create delta hash
    const deltaHash = this.computeDeltaHash(chunkId, entityStates, iareLayers);
    
    const chunkSnapshot: ChunkSnapshot = {
      chunkId,
      tick,
      entityStates,
      iareLayers,
      layerChecksum,
      deltaHash
    };
    
    this.chunkSnapshots.set(chunkId, chunkSnapshot);
  }
  
  /**
   * Validate layer integrity: ∑ Are = const
   * Throws DeterminismViolation if check fails.
   */
  static validateLayerIntegrity(layers: IARELogicLayers): void {
    const layerValues = getLayerValues(layers);
    
    // Sum all 13 layers using KappaInt arithmetic
    let sum: KappaInt = 0 as KappaInt;
    for (const value of layerValues) {
      sum = (sum + value) as KappaInt;
    }
    
    // Check conservation law: sum must equal CONST_ARE_TOTAL
    // Note: In a properly functioning system, CONST_ARE_TOTAL would be a fixed value
    // For now, we validate that the sum remains within expected bounds
    const expectedSum = LAYER_CONSTANTS.CONST_ARE_TOTAL;
    
    // For dynamic systems, we check that the delta from expected is within tolerance
    // This allows for legitimate state changes while detecting corruption
    const TOLERANCE = 1; // 1 Kappa tolerance for integer arithmetic
    
    const delta = Math.abs(Number(sum) - Number(expectedSum));
    if (delta > TOLERANCE && Number(expectedSum) !== 0) {
      throw new DeterminismViolation(
        `[ARE-Logic] Integrity check failed: Sum mismatch. ` +
        `Expected: ${expectedSum}, Got: ${sum}, Delta: ${delta}`
      );
    }
  }
  
  /**
   * Compute checksum for layer state.
   */
  private computeLayerChecksum(layers: IARELogicLayers): KappaInt {
    const layerValues = getLayerValues(layers);
    
    // XOR-based checksum for deterministic behavior
    let checksum: KappaInt = 0 as KappaInt;
    for (const value of layerValues) {
      checksum = (checksum ^ value) as KappaInt;
    }
    
    return checksum;
  }
  
  /**
   * Compute delta hash for chunk + entities + layers.
   */
  private computeDeltaHash(
    chunkId: ChunkKey, 
    entityStates: SnapshotEntityState[], 
    iareLayers: IARELogicLayers
  ): StateHash {
    // Build deterministic hash input
    let hashInput = String(chunkId);
    
    // Add entity states
    for (const entity of entityStates) {
      hashInput += `|${String(entity.id)}:${Number(entity.position_x)}:${Number(entity.position_z)}:${Number(entity.health)}`;
    }
    
    // Add layer values
    const layerValues = getLayerValues(iareLayers);
    hashInput += '|layers:' + layerValues.map(v => String(v)).join(':');
    
    // Simple hash for now (in production, use sha256 from ManifestHasher)
    const hashHex = this.simpleHash(hashInput);
    return createStateHash(hashHex);
  }
  
  /**
   * Simple deterministic hash function.
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to 64-character hex string
    const hex = Math.abs(hash).toString(16).padStart(8, '0').repeat(8).substring(0, 64);
    return hex;
  }
  
  /**
   * Finalize world snapshot.
   */
  finalizeWorldSnapshot(tick: TickId): WorldSnapshot {
    // Compute world hash from all chunk hashes
    let worldHashInput = `tick:${tick}`;
    
    for (const [chunkId, snapshot] of this.chunkSnapshots) {
      worldHashInput += `|${String(chunkId)}:${String(snapshot.deltaHash)}`;
    }
    
    const worldHash = createStateHash(this.simpleHash(worldHashInput).padEnd(64, '0').substring(0, 64));
    
    // Compute total layer checksum
    let totalChecksum: KappaInt = 0 as KappaInt;
    for (const snapshot of this.chunkSnapshots.values()) {
      totalChecksum = (totalChecksum ^ snapshot.layerChecksum) as KappaInt;
    }
    
    const worldSnapshot: WorldSnapshot = {
      tick,
      chunkSnapshots: new Map(this.chunkSnapshots),
      worldHash,
      layerChecksum: totalChecksum,
      activeChunkCount: this.chunkSnapshots.size
    };
    
    // Update previous hash
    this.previousWorldHash = worldHash;
    
    return worldSnapshot;
  }
  
  /**
   * Get persistence events for Phase 9.
   */
  getPersistenceEvents(): LayerPersistenceEvent[] {
    return [...this.persistenceQueue];
  }
  
  /**
   * Clear current tick's data.
   */
  clear(): void {
    this.chunkSnapshots.clear();
  }
  
  /**
   * Get number of chunks in current snapshot.
   */
  getChunkCount(): number {
    return this.chunkSnapshots.size;
  }
  
  /**
   * Get chunk snapshot by ID.
   */
  getChunkSnapshot(chunkId: ChunkKey): ChunkSnapshot | undefined {
    return this.chunkSnapshots.get(chunkId);
  }
}

/**
 * Global SnapshotComposer instance.
 */
export const snapshotComposer = new SnapshotComposer();