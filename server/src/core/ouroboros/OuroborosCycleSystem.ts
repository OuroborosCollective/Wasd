/**
 * OuroborosCycleSystem - Civilization Collapse and Rebirth
 * 
 * Phase 11: Ouroboros Grand Unification with ARE-Logic
 * 
 * Axiom 1: Snapshot-Prinzip (keine Mutation während Iteration)
 * Axiom 2: Nomock-Theorem (keine Mocks, keine Stubs)
 * Axiom 3: Zeitstempel-Integrität (tick-basiert)
 * Axiom 4: Informations-Erhaltung (Energie geht nicht verloren)
 * Axiom 5: Feld-Lokalität (3x3 Nachbar-Ausbreitung)
 * 
 * The Ouroboros Cycle:
 * 1. KINGDOM → WAR (conflict rises above threshold)
 * 2. WAR → FALLEN (conflict > 100.0, kingdom collapses)
 * 3. FALLEN → dungeon spawns with mythos seed
 * 4. FALLEN → cycles accumulates released energy
 * 5. cycles > 100.0 → RESURRECT wave to 3x3 neighbors
 * 6. RESURRECT → new SETTLE, cycle repeats
 */

import { TickSystemPriority, type TickSystem, type TickSystemContext } from '../are/TickSystem.js';
import { tickSystemRegistry, type TickSystemRegistry } from '../are/TickSystemRegistry.js';
import { TickSystemCategory, type ChunkKey, type TickId } from '../are/types.js';
import { getNeighborChunkKeys } from '../are/types.js';
import { kappa1000Hash, type KappaLayers } from '../are/KappaLayers.js';
import { kAdd, kSub, kDiv, type KappaInt } from '../are/Kappa.js';
import {
  OUROBOROS_CONFIG,
  OuroborosEventType,
  OuroborosPhase,
  type ErdősString
} from './OuroborosTypes.js';
import {
  appendEvent,
  getOuroborosPhase,
  hasEvent
} from './ErdosStringManager.js';
import { LayerResonanceTickSystem } from './LayerResonanceTickSystem.js';

export const OUROBOROS_CYCLE_SYSTEM_NAME = 'ouroboros-cycle' as const;
export const OUROBOROS_CYCLE_PRIORITY = TickSystemPriority.WORLD;

export interface OuroborosCycleChunkState {
  chunkKey: ChunkKey;
  erdos: ErdősString;
  layers: KappaLayers;
  mythosSeed: number;  // Dungeon seed after FALLEN
}

export interface OuroborosCycleSystemOptions {
  readonly tickInterval?: number;
  readonly ouroborosCheckInterval?: number;
  readonly resurrectionInterval?: number;
  readonly resonanceSystem?: LayerResonanceTickSystem;
}

export class OuroborosCycleSystem implements TickSystem {
  readonly id = OUROBOROS_CYCLE_SYSTEM_NAME;
  readonly name = OUROBOROS_CYCLE_SYSTEM_NAME;
  readonly priority = OUROBOROS_CYCLE_PRIORITY;
  readonly category = TickSystemCategory.WORLD;
  enabled = true;

  private readonly tickInterval: number;
  private readonly ouroborosCheckInterval: number;
  private readonly resurrectionInterval: number;
  private readonly resonanceSystem: LayerResonanceTickSystem | null;
  
  // Active chunks with mythos seeds
  private activeChunks: Map<ChunkKey, OuroborosCycleChunkState> = new Map();
  
  // Pending mutations
  private pendingErdos: Map<ChunkKey, ErdősString> = new Map();
  private pendingLayers: Map<ChunkKey, Partial<KappaLayers>> = new Map();
  private pendingMythos: Map<ChunkKey, number> = new Map();

  constructor(options: OuroborosCycleSystemOptions = {}) {
    this.tickInterval = options.tickInterval ?? OUROBOROS_CONFIG.TICK.TICK_INTERVAL;
    this.ouroborosCheckInterval = options.ouroborosCheckInterval ?? OUROBOROS_CONFIG.TICK.OUROBOROS_CHECK_INTERVAL;
    this.resurrectionInterval = options.resurrectionInterval ?? OUROBOROS_CONFIG.TICK.RESURRECTION_INTERVAL;
    this.resonanceSystem = options.resonanceSystem ?? null;
  }

  /**
   * Register a chunk for Ouroboros cycle processing.
   */
  registerChunk(chunkKey: ChunkKey, erdos: ErdősString, layers: KappaLayers): void {
    const existing = this.activeChunks.get(chunkKey);
    this.activeChunks.set(chunkKey, {
      chunkKey,
      erdos,
      layers,
      mythosSeed: existing?.mythosSeed ?? 0
    });
  }

  /**
   * Unregister a chunk.
   */
  unregisterChunk(chunkKey: ChunkKey): void {
    this.activeChunks.delete(chunkKey);
    this.pendingErdos.delete(chunkKey);
    this.pendingLayers.delete(chunkKey);
    this.pendingMythos.delete(chunkKey);
  }

  tick(context: TickSystemContext): void {
    const tickCount = this.extractTickCount(context);
    
    if (tickCount % this.tickInterval !== 0) return;
    
    // Snapshot for iteration (Axiom 1)
    const snapshot = new Map(this.activeChunks);
    
    // Clear pending mutations
    this.pendingErdos.clear();
    this.pendingLayers.clear();
    this.pendingMythos.clear();
    
    // Process Ouroboros fall
    if (tickCount % this.ouroborosCheckInterval === 0) {
      this.processOuroborosFall(snapshot, tickCount);
    }
    
    // Process resurrection wave
    if (tickCount % this.resurrectionInterval === 0) {
      this.processResurrectionWave(snapshot, tickCount);
    }
    
    // Apply mutations
    this.applyPendingMutations();
  }

  init?(context?: TickSystemContext): void {
    console.log(`[OuroborosCycleSystem] Initializing at tick ${context?.tickId ?? 0}`);
  }

  shutdown?(_context?: TickSystemContext): void {
    console.log('[OuroborosCycleSystem] Shutting down');
    this.activeChunks.clear();
    this.pendingErdos.clear();
    this.pendingLayers.clear();
    this.pendingMythos.clear();
  }

  /**
   * Ouroboros Fall - Axiom 4: Energy Conservation
   * 
   * When: conflict > 100.0 (100000) && kingdoms > 0
   * Releases: kingdom energy to cycles (ground state)
   * Creates: Dungeon with mythos seed
   */
  private processOuroborosFall(
    snapshot: Map<ChunkKey, OuroborosCycleChunkState>,
    tick: TickId
  ): void {
    const config = OUROBOROS_CONFIG.LAYER_RESONANCE;
    
    for (const [key, state] of snapshot) {
      const { erdos, layers } = state;
      
      // Skip if no kingdom or already fallen
      if (layers.kingdoms === 0) continue;
      if (hasEvent(erdos, OuroborosEventType.FALLEN)) continue;
      
      // Check Ouroboros fall threshold
      if (layers.conflict < config.OUROBOROS_FALL_THRESHOLD) continue;
      
      // Determine phase
      const phase = getOuroborosPhase(erdos);
      if (phase !== OuroborosPhase.KINGDOM && phase !== OuroborosPhase.WAR) continue;
      
      // Calculate released energy (Axiom 4: Conservation)
      const releasedEnergy = kAdd(layers.economy, layers.kingdoms);
      
      // Generate deterministic dungeon seed
      const dungeonSeed = kappa1000Hash(`${key}_${layers.kingdoms}_${tick}`);
      
      // Mark as fallen
      const newErdos = appendEvent(erdos, OuroborosEventType.FALLEN, tick, String(dungeonSeed));
      
      // Clear kingdom state, release energy to cycles
      this.pendingErdos.set(key, newErdos);
      this.pendingLayers.set(key, {
        kingdoms: 0,
        economy: 0,
        conflict: 0,
        physiology: 0,
        cycles: kAdd(layers.cycles, releasedEnergy)
      });
      this.pendingMythos.set(key, dungeonSeed);
      
      console.log(`[OuroborosCycle] FALLEN at ${key}: released ${releasedEnergy} energy, dungeon seed: ${dungeonSeed}`);
    }
  }

  /**
   * Resurrection Wave - Axiom 5: Field Locality
   * 
   * When: cycles > 100.0 (100000)
   * Spreads: Equal radiation to 3x3 neighbors
   * Results: New SETTLE events, ecology/economy restoration
   */
  private processResurrectionWave(
    snapshot: Map<ChunkKey, OuroborosCycleChunkState>,
    tick: TickId
  ): void {
    const config = OUROBOROS_CONFIG.LAYER_RESONANCE;
    
    for (const [key, state] of snapshot) {
      const { erdos, layers } = state;
      
      // Skip if not fallen or no cycles
      if (!hasEvent(erdos, OuroborosEventType.FALLEN)) continue;
      if (layers.cycles < config.RESURRECTION_THRESHOLD) continue;
      
      // Skip if already resurrecting
      if (hasEvent(erdos, OuroborosEventType.RESURRECT)) continue;
      
      // Get 3x3 neighbors (Axiom 5: Feld-Lokalität)
      const neighbors = getNeighborChunkKeys(key);
      
      // Calculate radiation per neighbor (equal distribution)
      const neighborCount = neighbors.length + 1; // Include self
      const radiation = kDiv(layers.cycles, neighborCount);
      
      // Apply to self first
      const newErdos = appendEvent(erdos, OuroborosEventType.RESURRECT, tick);
      this.pendingErdos.set(key, newErdos);
      this.pendingLayers.set(key, {
        ecology: kAdd(layers.ecology, radiation),
        economy: kAdd(layers.economy, radiation),
        cycles: kSub(layers.cycles, radiation)
      });
      
      // Spread to neighbors
      for (const nKey of neighbors) {
        const nState = snapshot.get(nKey as ChunkKey);
        if (!nState) continue;
        
        const nLayers = nState.layers;
        const nErdos = nState.erdos;
        
        // Skip if already fallen
        if (hasEvent(nErdos, OuroborosEventType.FALLEN)) continue;
        
        // Apply radiation
        const existing = this.pendingLayers.get(nKey as ChunkKey);
        if (existing) {
          this.pendingLayers.set(nKey as ChunkKey, {
            ...existing,
            ecology: kAdd(existing.ecology ?? nLayers.ecology, radiation),
            economy: kAdd(existing.economy ?? nLayers.economy, radiation)
          });
        } else {
          this.pendingLayers.set(nKey as ChunkKey, {
            ecology: kAdd(nLayers.ecology, radiation),
            economy: kAdd(nLayers.economy, radiation)
          });
        }
      }
      
      console.log(`[OuroborosCycle] RESURRECT at ${key}: ${radiation} radiation to ${neighborCount} chunks`);
    }
  }

  /**
   * Apply pending mutations atomically.
   */
  private applyPendingMutations(): void {
    // Apply Erdős mutations
    for (const [key, newErdos] of this.pendingErdos) {
      const state = this.activeChunks.get(key);
      if (state) {
        this.activeChunks.set(key, { ...state, erdos: newErdos });
      }
    }
    
    // Apply layer mutations
    for (const [key, changes] of this.pendingLayers) {
      const state = this.activeChunks.get(key);
      if (state) {
        this.activeChunks.set(key, {
          ...state,
          layers: { ...state.layers, ...changes } as KappaLayers
        });
      }
    }
    
    // Apply mythos seeds
    for (const [key, mythos] of this.pendingMythos) {
      const state = this.activeChunks.get(key);
      if (state) {
        this.activeChunks.set(key, { ...state, mythosSeed: mythos });
      }
    }
  }

  /**
   * Get mythos seed for a chunk (for dungeon generation).
   */
  getMythosSeed(chunkKey: ChunkKey): number {
    return this.activeChunks.get(chunkKey)?.mythosSeed ?? 0;
  }

  /**
   * Get current Ouroboros phase for a chunk.
   */
  getPhase(chunkKey: ChunkKey): OuroborosPhase {
    const state = this.activeChunks.get(chunkKey);
    if (!state) return OuroborosPhase.WILD;
    return getOuroborosPhase(state.erdos);
  }

  /**
   * Check if a chunk is in fallen state (dungeon active).
   */
  isFallen(chunkKey: ChunkKey): boolean {
    const state = this.activeChunks.get(chunkKey);
    if (!state) return false;
    return hasEvent(state.erdos, OuroborosEventType.FALLEN);
  }

  private extractTickCount(context: TickSystemContext): number {
    if (context.tickId !== undefined) return Number(context.tickId);
    if (context.tick !== undefined) return Number(context.tick);
    if (context.logicalIndex !== undefined) return Number(context.logicalIndex);
    if (context.tickCount !== undefined) return Number(context.tickCount);
    return 0;
  }
}

export const DEFAULT_OUROBOROS_CYCLE_OPTIONS: OuroborosCycleSystemOptions = {
  tickInterval: OUROBOROS_CONFIG.TICK.TICK_INTERVAL,
  ouroborosCheckInterval: OUROBOROS_CONFIG.TICK.OUROBOROS_CHECK_INTERVAL,
  resurrectionInterval: OUROBOROS_CONFIG.TICK.RESURRECTION_INTERVAL
};

export function createOuroborosCycleSystem(
  options: OuroborosCycleSystemOptions = {}
): OuroborosCycleSystem {
  return new OuroborosCycleSystem({
    ...DEFAULT_OUROBOROS_CYCLE_OPTIONS,
    ...options
  });
}

export function registerOuroborosCycleSystem(
  options: OuroborosCycleSystemOptions = {},
  registry: TickSystemRegistry = tickSystemRegistry
): OuroborosCycleSystem {
  const system = createOuroborosCycleSystem(options);
  registry.register({
    system,
    dependencies: [],
    tags: ['ouroboros', 'cycle', 'fall', 'resurrection', 'dungeon']
  });
  console.log(`[OuroborosCycleSystem] Registered with priority ${system.priority}`);
  return system;
}

let ouroborosCycleSystemInstance: OuroborosCycleSystem | null = null;

export function getOuroborosCycleSystem(
  options: OuroborosCycleSystemOptions = {}
): OuroborosCycleSystem {
  if (!ouroborosCycleSystemInstance) {
    ouroborosCycleSystemInstance = createOuroborosCycleSystem(options);
  }
  return ouroborosCycleSystemInstance;
}