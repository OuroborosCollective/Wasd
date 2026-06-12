/**
 * GenesisEngine - Zero-State Database Cold Start Reconstruction
 * 
 * Phase 11: Ouroboros Grand Unification with ARE-Logic
 * 
 * Axiom 1: Snapshot-Prinzip (keine Mutation während Iteration)
 * Axiom 2: Nomock-Theorem (keine Mocks, keine Stubs)
 * Axiom 3: Zeitstempel-Integrität (tick-basiert)
 * 
 * State-Bloat = 0: We store only Erdős-Strings + tick count.
 * Layers are recomputed deterministically on load.
 */

import { KAPPA, type KappaInt } from '../are/Kappa.js';
import { kappa1000Hash, type KappaLayers } from '../are/KappaLayers.js';
import type { ChunkKey, TickId } from '../are/types.js';
import {
  type ErdősString,
  type ErdősRecord,
  type GenesisRecord,
  type OuroborosLayerVector
} from './OuroborosTypes.js';
import {
  fromErdosRecord,
  parseErdosString,
  reconstructLayersFromErdos
} from './ErdosStringManager.js';

export interface GenesisChunkState {
  readonly chunkKey: ChunkKey;
  readonly erdos: ErdősString;
  readonly layers: KappaLayers;
  readonly tickCount: TickId;
}

/**
 * GenesisEngine - Cold-start world reconstruction from minimal records
 */
export class GenesisEngine {
  /**
   * Rebuild world state from minimal Erdős-String records.
   * 
   * State-Bloat = 0: We store only strings, not layer values.
   * 
   * @param records - Array of ErdősRecord from persistence
   * @returns Map of chunkKey to reconstructed state
   */
  bootUniverse(records: ReadonlyArray<ErdősRecord>): Map<ChunkKey, GenesisChunkState> {
    const restoredUniverse = new Map<ChunkKey, GenesisChunkState>();
    
    for (const record of records) {
      // Reconstruct ErdősString
      const erdos = fromErdosRecord(record);
      
      // Deterministic reconstruction (same as cold boot)
      const rebuildHash = kappa1000Hash(`${record.erdosString}_${KAPPA}`);
      
      const restoredLayers = this.reconstructLayersFromHash(
        rebuildHash,
        record.erdosString,
        record.lastTick
      );
      
      restoredUniverse.set(record.chunkKey, Object.freeze({
        chunkKey: record.chunkKey,
        erdos,
        layers: restoredLayers,
        tickCount: record.lastTick
      }));
    }
    
    return restoredUniverse;
  }

  /**
   * Reconstruct single chunk state from Erdős-String.
   */
  reconstructChunkState(record: ErdősRecord): GenesisChunkState {
    const erdos = fromErdosRecord(record);
    const rebuildHash = kappa1000Hash(`${record.erdosString}_${KAPPA}`);
    const layers = this.reconstructLayersFromHash(
      rebuildHash,
      record.erdosString,
      record.lastTick
    );
    
    return Object.freeze({
      chunkKey: record.chunkKey,
      erdos,
      layers,
      tickCount: record.lastTick
    });
  }

  /**
   * Reconstruct layers deterministically from hash.
   * 
   * @param hash - Rebuild hash from Erdős-String
   * @param erdosString - Original event string
   * @param tick - Last tick
   */
  private reconstructLayersFromHash(
    hash: number,
    erdosString: string,
    tick: TickId
  ): KappaLayers {
    // Parse events for influence calculation
    const events = parseErdosString(erdosString);
    
    // Calculate event-based bonuses
    let conflictBonus = 0 as KappaInt;
    let economyBonus = 0 as KappaInt;
    let memoryBonus = 0 as KappaInt;
    let cyclesBonus = 0 as KappaInt;
    let kingdomId = 0;
    let hasFallen = false;
    
    for (const event of events) {
      switch (event.type) {
        case 'WAR':
          conflictBonus = (conflictBonus + 50000) as KappaInt;
          break;
        case 'KINGDOM':
          economyBonus = (economyBonus + 80000) as KappaInt;
          memoryBonus = (memoryBonus + 50000) as KappaInt;
          kingdomId = event.data ? Number(event.data) : 0;
          break;
        case 'FALLEN':
          cyclesBonus = (cyclesBonus + 100000) as KappaInt;
          hasFallen = true;
          break;
        case 'RESURRECT':
          cyclesBonus = (cyclesBonus + 20000) as KappaInt;
          break;
        case 'LEGEND':
          memoryBonus = (memoryBonus + 30000) as KappaInt;
          break;
      }
    }
    
    // Extract base values from hash deterministically
    const ecology = (hash % KAPPA) as KappaInt;
    const market = ((hash >> 2) % KAPPA) as KappaInt;
    const physiology = ((hash >> 4) % KAPPA) as KappaInt;
    const trade = ((hash >> 6) % KAPPA) as KappaInt;
    const politics = ((hash >> 8) % KAPPA) as KappaInt;
    const faith = ((hash >> 10) % KAPPA) as KappaInt;
    const fear = ((hash >> 12) % KAPPA) as KappaInt;
    const memory = ((hash >> 14) % KAPPA + memoryBonus) as KappaInt;
    const conflict = ((hash >> 16) % KAPPA + conflictBonus) as KappaInt;
    const economy = ((hash >> 18) % KAPPA + economyBonus) as KappaInt;
    const kingdoms = kingdomId > 0
      ? (kingdomId % 500000) as KappaInt
      : (0 as KappaInt);
    const dungeon = hasFallen
      ? (kappa1000Hash(`${hash}_${tick}`) % KAPPA) as KappaInt
      : ((hash >> 22) % KAPPA) as KappaInt;
    const cycles = cyclesBonus;
    
    return Object.freeze({
      ecology,
      market,
      physiology,
      trade,
      memory,
      politics,
      conflict,
      economy,
      kingdoms,
      faith,
      dungeon,
      fear,
      cycles
    }) as unknown as KappaLayers;
  }

  /**
   * Create genesis record for persistence.
   */
  createGenesisRecord(erdos: ErdősString): GenesisRecord {
    return Object.freeze({
      chunkKey: erdos.chunkKey,
      erdosString: erdos.events,
      tickCount: erdos.lastTick
    });
  }

  /**
   * Generate initial world from seed.
   * Creates genesis chunks with SETTLE events.
   * 
   * @param seed - World seed for deterministic generation
   * @param chunkCount - Number of chunks to generate
   * @param startTick - Starting tick
   */
  generateGenesisWorld(
    seed: string,
    chunkCount: number,
    startTick: TickId
  ): Map<ChunkKey, GenesisChunkState> {
    const world = new Map<ChunkKey, GenesisChunkState>();
    
    for (let i = 0; i < chunkCount; i++) {
      // Deterministic chunk key from index
      const chunkHash = kappa1000Hash(`${seed}_${i}_${KAPPA}`);
      const cx = (chunkHash % 100) - 50;
      const cz = ((chunkHash >> 8) % 100) - 50;
      const chunkKey = `${cx}:${cz}` as ChunkKey;
      
      // Generate deterministic tick for settlement
      const settleTick = (startTick + (i * 100)) as TickId;
      
      // Create genesis Erdős-String
      const erdos: ErdősString = Object.freeze({
        chunkKey,
        events: `${settleTick}:SETTLE`,
        lastTick: settleTick
      });
      
      // Reconstruct layers
      const layers = this.reconstructLayersFromHash(
        chunkHash,
        erdos.events,
        settleTick
      );
      
      world.set(chunkKey, Object.freeze({
        chunkKey,
        erdos,
        layers,
        tickCount: settleTick
      }));
    }
    
    return world;
  }

  /**
   * Verify world integrity after reconstruction.
   */
  verifyWorldIntegrity(
    world: Map<ChunkKey, GenesisChunkState>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [chunkKey, state] of world) {
      // Verify chunk key matches
      if (state.chunkKey !== chunkKey) {
        errors.push(`Chunk key mismatch: ${chunkKey}`);
      }
      
      // Verify Erdős-String consistency
      if (state.erdos.chunkKey !== chunkKey) {
        errors.push(`Erdős-String chunk mismatch: ${chunkKey}`);
      }
      
      // Verify tick count consistency
      if (state.erdos.lastTick !== state.tickCount) {
        errors.push(`Tick mismatch for ${chunkKey}: erdos=${state.erdos.lastTick}, state=${state.tickCount}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
let genesisEngineInstance: GenesisEngine | null = null;

export function getGenesisEngine(): GenesisEngine {
  if (!genesisEngineInstance) {
    genesisEngineInstance = new GenesisEngine();
  }
  return genesisEngineInstance;
}