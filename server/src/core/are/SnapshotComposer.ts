/**
 * SnapshotComposer - Phase 8: Snapshot Composition with Layer Validation
 *
 * Composes deterministic world snapshots from ChunkID, entity states and the
 * 13 IARE layers. This remains a real checksum/hash composer, not a fixture.
 */

import type { TickId, StateHash, ChunkKey, EntityId } from './types.js';
import { createStateHash, type KappaInt } from './types.js';
import type { IARELogicLayers } from './IARELogicLayers.js';
import type { LayerPersistenceEvent, WorldLogicalState } from './ChunkLayerState.js';
import { getLayerValues, LAYER_CONSTANTS } from './IARELogicLayers.js';

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

  static validateLayerIntegrity(layers: IARELogicLayers): void {
    const values = getLayerValues(layers);
    for (const value of values) {
      if (!Number.isFinite(value)) {
        throw new DeterminismViolation('Layer contains non-finite value');
      }
    }
  }

  addChunk(chunkId: ChunkKey, tick: TickId, entityStates: SnapshotEntityState[], iareLayers: IARELogicLayers): void {
    SnapshotComposer.validateLayerIntegrity(iareLayers);
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

  getChunkSnapshot(chunkId: ChunkKey): ChunkSnapshot | undefined {
    return this.chunkSnapshots.get(chunkId);
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
    tick: number | TickId;
    stateHash: StateHash;
    entityCount: number;
    deltaCount: number;
    category: string;
    patterns: string[];
  }): void {
    const tick = Number(data.tick) as TickId;
    const snapshotData: ModuleSnapshotData = {
      moduleName,
      tick,
      stateHash: data.stateHash,
      entityCount: data.entityCount,
      deltaCount: data.deltaCount,
      category: data.category,
      patterns: data.patterns,
      timestamp: Number(data.tick),
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
    const expectedTotal = LAYER_CONSTANTS.CONST_ARE_TOTAL;
    if (expectedTotal !== 0 && layerChecksum !== expectedTotal) {
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
