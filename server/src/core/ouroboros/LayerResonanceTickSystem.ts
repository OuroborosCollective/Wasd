/**
 * LayerResonanceTickSystem - Kingdom Emergence + Legend Wave Propagation
 * 
 * Phase 11: Ouroboros Grand Unification with ARE-Logic
 * 
 * Axiom 1: Snapshot-Prinzip (keine Mutation während Iteration)
 * Axiom 2: Nomock-Theorem (keine Mocks, keine Stubs)
 * Axiom 3: Zeitstempel-Integrität (tick-basiert)
 * Axiom 4: Informations-Erhaltung (Energie geht nicht verloren)
 * Axiom 5: Feld-Lokalität (3x3 Nachbar-Ausbreitung)
 * 
 * Integrates with WorldTickThinShell/WorldTickScheduler.
 */

import { TickSystemPriority, type TickSystem, type TickSystemContext } from '../are/TickSystem.js';
import { tickSystemRegistry, type TickSystemRegistry } from '../are/TickSystemRegistry.js';
import { TickSystemCategory, type ChunkKey, type TickId } from '../are/types.js';
import { getNeighborChunkKeys } from '../are/types.js';
import { kappa1000Hash, type KappaLayers, type KappaLayerKey } from '../are/KappaLayers.js';
import { kAdd, kSub, kDiv, KAPPA, type KappaInt } from '../are/Kappa.js';
import {
  OUROBOROS_CONFIG,
  OuroborosEventType,
  OuroborosPhase,
  type ErdősString,
  type OuroborosLayerVector
} from './OuroborosTypes.js';
import {
  appendEvent,
  createGenesisErdos,
  getOuroborosPhase,
  parseErdosString,
  hasEvent
} from './ErdosStringManager.js';

export const LAYER_RESONANCE_TICK_SYSTEM_NAME = 'layer-resonance' as const;
export const LAYER_RESONANCE_PRIORITY = TickSystemPriority.WORLD;

/**
 * Chunk state for LayerResonance processing
 */
interface ResonanceChunkState {
  chunkKey: ChunkKey;
  erdos: ErdősString;
  layers: KappaLayers;
}

/**
 * Mutation buffer for atomic updates (Axiom 1: Snapshot-Prinzip)
 */
interface MutationBuffer {
  erdosMutations: Map<ChunkKey, ErdősString>;
  layerMutations: Map<ChunkKey, Partial<KappaLayers>>;
}

export interface LayerResonanceTickSystemOptions {
  readonly tickInterval?: number;
  readonly kingdomCheckInterval?: number;
  readonly legendSpreadInterval?: number;
}

export class LayerResonanceTickSystem implements TickSystem {
  readonly id = LAYER_RESONANCE_TICK_SYSTEM_NAME;
  readonly name = LAYER_RESONANCE_TICK_SYSTEM_NAME;
  readonly priority = LAYER_RESONANCE_PRIORITY;
  readonly category = TickSystemCategory.WORLD;
  enabled = true;

  private readonly tickInterval: number;
  private readonly kingdomCheckInterval: number;
  private readonly legendSpreadInterval: number;
  
  // Active chunks state (snapshot)
  private activeChunks: Map<ChunkKey, ResonanceChunkState> = new Map();
  
  // Pending mutations (applied atomically at tick end)
  private mutationBuffer: MutationBuffer = {
    erdosMutations: new Map(),
    layerMutations: new Map()
  };

  constructor(options: LayerResonanceTickSystemOptions = {}) {
    this.tickInterval = options.tickInterval ?? OUROBOROS_CONFIG.TICK.TICK_INTERVAL;
    this.kingdomCheckInterval = options.kingdomCheckInterval ?? OUROBOROS_CONFIG.TICK.KINGDOM_CHECK_INTERVAL;
    this.legendSpreadInterval = options.legendSpreadInterval ?? OUROBOROS_CONFIG.TICK.LEGEND_SPREAD_INTERVAL;
  }

  /**
   * Register a chunk for resonance processing.
   */
  registerChunk(chunkKey: ChunkKey, erdos: ErdősString, layers: KappaLayers): void {
    this.activeChunks.set(chunkKey, {
      chunkKey,
      erdos,
      layers
    });
  }

  /**
   * Unregister a chunk from resonance processing.
   */
  unregisterChunk(chunkKey: ChunkKey): void {
    this.activeChunks.delete(chunkKey);
    this.mutationBuffer.erdosMutations.delete(chunkKey);
    this.mutationBuffer.layerMutations.delete(chunkKey);
  }

  tick(context: TickSystemContext): void {
    const tickCount = this.extractTickCount(context);
    
    // Skip if not our tick interval
    if (tickCount % this.tickInterval !== 0) return;
    
    // Create snapshot for this tick (Axiom 1: Snapshot-Prinzip)
    const snapshot = new Map(this.activeChunks);
    
    // Clear mutation buffer for new tick
    this.mutationBuffer = {
      erdosMutations: new Map(),
      layerMutations: new Map()
    };
    
    // Process kingdom emergence (slow check)
    if (tickCount % this.kingdomCheckInterval === 0) {
      this.processKingdomEmergence(snapshot, tickCount);
    }
    
    // Process legend spread (medium check)
    if (tickCount % this.legendSpreadInterval === 0) {
      this.processLegendWave(snapshot, tickCount);
    }
    
    // Apply all mutations atomically
    this.applyMutations();
  }

  init?(context?: TickSystemContext): void {
    console.log(`[LayerResonanceTickSystem] Initializing at tick ${context?.tickId ?? 0}`);
  }

  shutdown?(_context?: TickSystemContext): void {
    console.log('[LayerResonanceTickSystem] Shutting down');
    this.activeChunks.clear();
    this.mutationBuffer = {
      erdosMutations: new Map(),
      layerMutations: new Map()
    };
  }

  /**
   * Kingdom Emergence - Axiom 4: Conservation of energy
   * 
   * When: economy > 80000 && memory > 50000 && kingdoms === 0
   * Creates: New kingdom with deterministic ID
   */
  private processKingdomEmergence(
    snapshot: Map<ChunkKey, ResonanceChunkState>,
    tick: TickId
  ): void {
    const config = OUROBOROS_CONFIG.LAYER_RESONANCE;
    
    for (const [key, state] of snapshot) {
      const { erdos, layers } = state;
      
      // Skip if already has kingdom or is fallen
      if (layers.kingdoms > 0) continue;
      if (hasEvent(erdos, OuroborosEventType.FALLEN)) continue;
      
      // Check emergence threshold
      if (layers.economy < config.KINGDOM_EMERGENCE_THRESHOLD) continue;
      if (layers.memory < 50000) continue;
      
      // Determine current phase
      const phase = getOuroborosPhase(erdos);
      if (phase === OuroborosPhase.KINGDOM || phase === OuroborosPhase.WAR) continue;
      
      // Generate deterministic kingdom ID
      const kingdomId = kappa1000Hash(`${key}_${tick}_${KAPPA}`);
      
      // Create new Erdős-String with KINGDOM event
      const newErdos = appendEvent(erdos, OuroborosEventType.KINGDOM, tick, String(kingdomId));
      
      // Buffer mutation (Axiom 1: no mutation during iteration)
      this.bufferMutation(key, newErdos, {
        kingdoms: kingdomId as unknown as KappaInt,
        economy: kAdd(layers.economy, 50000), // Energy flows to kingdom
        memory: kAdd(layers.memory, 30000)    // Social cohesion
      });
      
      console.log(`[LayerResonance] Kingdom emerged at ${key}: ${kingdomId}`);
    }
  }

  /**
   * Legend Wave Propagation - Axiom 5: Field Locality
   * 
   * When: kingdom > 0 && conflict > 0
   * Spreads: 3x3 neighbor influence with XOR/XOR pattern
   */
  private processLegendWave(
    snapshot: Map<ChunkKey, ResonanceChunkState>,
    tick: TickId
  ): void {
    const config = OUROBOROS_CONFIG.LAYER_RESONANCE;
    
    for (const [key, state] of snapshot) {
      const { erdos, layers } = state;
      
      // Skip if no kingdom or no conflict
      if (layers.kingdoms === 0) continue;
      if (layers.conflict === 0) continue;
      
      // Check legend spread threshold
      if (layers.conflict < config.LEGEND_SPREAD_THRESHOLD) continue;
      
      // Generate deterministic legend wavelength
      const legendWavelength = kappa1000Hash(`LEGEND_${layers.kingdoms}`);
      
      // Get 3x3 neighbors (Axiom 5: Feld-Lokalität)
      const neighbors = getNeighborChunkKeys(key);
      
      for (const nKey of neighbors) {
        const nState = snapshot.get(nKey as ChunkKey);
        if (!nState) continue;
        
        const nLayers = nState.layers;
        
        // Skip if neighbor already has a different kingdom (territorial conflict)
        if (nLayers.kingdoms > 0 && nLayers.kingdoms !== layers.kingdoms) continue;
        
        // Buffer mutation with XOR spread (Axiom 4: Conservation)
        const memoryXor = nLayers.memory ^ legendWavelength;
        const conflictAdd = kAdd(nLayers.conflict, 5000); // +5 aggression spread
        
        this.bufferMutation(nKey as ChunkKey, undefined, {
          memory: memoryXor as unknown as KappaInt,
          conflict: conflictAdd
        });
      }
      
      // Self-propagate legend event
      const hasLegend = hasEvent(erdos, OuroborosEventType.LEGEND);
      if (!hasLegend && layers.conflict > 50000) {
        const newErdos = appendEvent(erdos, OuroborosEventType.LEGEND, tick);
        this.bufferMutation(key, newErdos, undefined);
      }
    }
  }

  /**
   * Buffer a mutation for atomic application.
   * Axiom 1: No mutation during iteration.
   */
  private bufferMutation(
    chunkKey: ChunkKey,
    newErdos?: ErdősString,
    layerChanges?: Partial<KappaLayers>
  ): void {
    if (newErdos) {
      this.mutationBuffer.erdosMutations.set(chunkKey, newErdos);
    }
    if (layerChanges) {
      const existing = this.mutationBuffer.layerMutations.get(chunkKey);
      if (existing) {
        this.mutationBuffer.layerMutations.set(chunkKey, { ...existing, ...layerChanges });
      } else {
        this.mutationBuffer.layerMutations.set(chunkKey, layerChanges);
      }
    }
  }

  /**
   * Apply all buffered mutations atomically.
   * Called at end of tick.
   */
  private applyMutations(): void {
    // Apply Erdős-String mutations
    for (const [key, newErdos] of this.mutationBuffer.erdosMutations) {
      const state = this.activeChunks.get(key);
      if (state) {
        this.activeChunks.set(key, {
          ...state,
          erdos: newErdos
        });
      }
    }
    
    // Apply layer mutations
    for (const [key, changes] of this.mutationBuffer.layerMutations) {
      const state = this.activeChunks.get(key);
      if (state) {
        this.activeChunks.set(key, {
          ...state,
          layers: { ...state.layers, ...changes } as KappaLayers
        });
      }
    }
  }

  /**
   * Get current state of a chunk.
   */
  getChunkState(chunkKey: ChunkKey): ResonanceChunkState | undefined {
    return this.activeChunks.get(chunkKey);
  }

  /**
   * Get all active chunk keys.
   */
  getActiveChunkKeys(): ChunkKey[] {
    return Array.from(this.activeChunks.keys());
  }

  /**
   * Get pending mutations count (for debugging).
   */
  getPendingMutationsCount(): number {
    return this.mutationBuffer.erdosMutations.size + this.mutationBuffer.layerMutations.size;
  }

  private extractTickCount(context: TickSystemContext): number {
    if (context.tickId !== undefined) return Number(context.tickId);
    if (context.tick !== undefined) return Number(context.tick);
    if (context.logicalIndex !== undefined) return Number(context.logicalIndex);
    if (context.tickCount !== undefined) return Number(context.tickCount);
    return 0;
  }
}

export const DEFAULT_LAYER_RESONANCE_OPTIONS: LayerResonanceTickSystemOptions = {
  tickInterval: OUROBOROS_CONFIG.TICK.TICK_INTERVAL,
  kingdomCheckInterval: OUROBOROS_CONFIG.TICK.KINGDOM_CHECK_INTERVAL,
  legendSpreadInterval: OUROBOROS_CONFIG.TICK.LEGEND_SPREAD_INTERVAL
};

export function createLayerResonanceTickSystem(
  options: LayerResonanceTickSystemOptions = {}
): LayerResonanceTickSystem {
  return new LayerResonanceTickSystem({
    ...DEFAULT_LAYER_RESONANCE_OPTIONS,
    ...options
  });
}

export function registerLayerResonanceTickSystem(
  options: LayerResonanceTickSystemOptions = {},
  registry: TickSystemRegistry = tickSystemRegistry
): LayerResonanceTickSystem {
  const system = createLayerResonanceTickSystem(options);
  registry.register({
    system,
    dependencies: [],
    tags: ['ouroboros', 'resonance', 'kingdom', 'legend']
  });
  console.log(`[LayerResonanceTickSystem] Registered with priority ${system.priority}`);
  return system;
}

let layerResonanceTickSystemInstance: LayerResonanceTickSystem | null = null;

export function getLayerResonanceTickSystem(
  options: LayerResonanceTickSystemOptions = {}
): LayerResonanceTickSystem {
  if (!layerResonanceTickSystemInstance) {
    layerResonanceTickSystemInstance = createLayerResonanceTickSystem(options);
  }
  return layerResonanceTickSystemInstance;
}