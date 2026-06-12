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
import type { IARELogicLayers } from './IARELogicLayers.js';
import type { LayerPersistenceEvent, WorldLogicalState } from './ChunkLayerState.js';
import { getLayerValues, LAYER_CONSTANTS, createEmptyIARELogicLayers } from './IARELogicLayers.js';

export class DeterminismViolation extends Error {
  constructor(message: string) {
    super(`[ARE-Logic] DeterminismViolation: ${message}`);
    this.name = 'DeterminismViolation';
  }
}

export interface SnapshotEntityState {
  id: EntityId;
  position_x: KappaInt;
  position_z: KappaInt;
  health: KappaInt;
  level: KappaInt;
  worldState?: WorldLogicalState;
}

export interface ChunkSnapshot {
  chunkId: ChunkKey;
  tick: TickId;
  entityStates: SnapshotEntityState[];
  iareLayers: IARELogicLayers;
  layerChecksum: KappaInt;
  deltaHash: StateHash;
}

export interface WorldSnapshot {
  tick: TickId;
  chunkSnapshots: Map<ChunkKey, ChunkSnapshot>;
  worldHash: StateHash;
  layerChecksum: KappaInt;
  activeChunkCount: number;
}

export interface ModuleSnapshotData {
  moduleName: string;
  tick: TickId;
  stateHash: StateHash;
  entityCount: number;
  deltaCount: number;
  category: string;
  patterns: string[];
  timestamp: number;
}

export class SnapshotComposer {
  private chunkSnapshots: Map<ChunkKey, ChunkSnapshot> = new Map();
  private previousWorldHash: StateHash = createStateHash('0'.repeat(64));
  private persistenceQueue: LayerPersistenceEvent[] = [];
  private moduleSnapshots: Map<string, ModuleSnapshotData> = new Map();

  addChunk(chunkId: ChunkKey, tick: TickId, entityStates: SnapshotEntityState[], iareLayers: IARELogicLayers): void {
    const layerChecksum = this.computeLayerChecksum(iareLayers);
    this.validateLayerConservation(layerChecksum);
    const deltaHash = this.computeDeltaHash(chunkId, entityStates, iareLayers);
    const snapshot: ChunkSnapshot = { chunkId, tick, entityStates, iareLayers, layerChecksum, deltaHash };
    this.chunkSnapshots.set(chunkId, snapshot);
  }

  finalizeWorldSnapshot(tick: TickId): WorldSnapshot {
    const worldHash = this.computeWorldHash();
    const layerChecksum = this.computeTotalLayerChecksum();
    const snapshot: WorldSnapshot = {
      tick,
      chunkSnapshots: new Map(this.chunkSnapshots),
      worldHash,
      layerChecksum,
      activeChunkCount: this.chunkSnapshots.size,
    };
    this.previousWorldHash = worldHash;
    return snapshot;
  }

  getChunkCount(): number {
    return this.chunkSnapshots.size;
  }

  clear(): void {
    this.chunkSnapshots.clear();
    this.moduleSnapshots.clear();
  }

  addModuleState(moduleName: string, data: ModuleSnapshotData): void {
    this.registerModuleSnapshot(moduleName, data);
  }

  registerModuleSnapshot(moduleName: string, data: {
    tick: number;
    stateHash: StateHash;
    entityCount: number;
    deltaCount: number;
    category: string;
    patterns: string[];
  }): void {
    const snapshotData: ModuleSnapshotData = {
      moduleName,
      tick: data.tick as TickId,
      stateHash: data.stateHash,
      entityCount: data.entityCount,
      deltaCount: data.deltaCount,
      category: data.category,
      patterns: data.patterns,
      timestamp: data.tick,
    };
    this.moduleSnapshots.set(moduleName, snapshotData);
  }

  getModuleSnapshots(): ModuleSnapshotData[] {
    return Array.from(this.moduleSnapshots.values()).map((snapshot) => ({ ...snapshot, timestamp: 0 }));
  }

  private computeLayerChecksum(layers: IARELogicLayers): KappaInt {
    const total = getLayerValues(layers).reduce((sum, value) => sum + value, 0);
    return total as KappaInt;
  }

  private computeTotalLayerChecksum(): KappaInt {
    let total = 0;
    for (const snapshot of this.chunkSnapshots.values()) total += snapshot.layerChecksum;
    return total as KappaInt;
  }

  private validateLayerConservation(layerChecksum: KappaInt): void {
    const expectedTotal = LAYER_CONSTANTS.TOTAL_SYSTEM_ENERGY;
    if (layerChecksum !== expectedTotal) {
      throw new DeterminismViolation(`Layer conservation violated: expected ${expectedTotal}, got ${layerChecksum}`);
    }
  }

  private computeDeltaHash(chunkId: ChunkKey, entityStates: SnapshotEntityState[], iareLayers: IARELogicLayers): StateHash {
    const input = JSON.stringify({ chunkId, entityStates, iareLayers });
    return this.hashString(input);
  }

  private computeWorldHash(): StateHash {
    const chunks = Array.from(this.chunkSnapshots.entries()).sort(([a], [b]) => String(a).localeCompare(String(b)));
    const input = JSON.stringify(chunks.map(([key, snapshot]) => [key, snapshot.deltaHash, snapshot.layerChecksum]));
    return this.hashString(`${this.previousWorldHash}:${input}`);
  }

  private hashString(input: string): StateHash {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    const hex = hash.toString(16).padStart(8, '0');
    return createStateHash((hex.repeat(8)).slice(0, 64));
  }
}

export const snapshotComposer = new SnapshotComposer();
