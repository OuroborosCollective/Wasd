/**
 * WorldBrainScheduler - Phase 10: Thin Shell World Tick Coordinator
 * 
 * The WorldBrainScheduler is the extremely slim coordinator that:
 * 1. Iterates over active chunks (10-Hz tick)
 * 2. Evaluates the 13 logic layers deterministically
 * 3. Computes Erdős-Attraktor (Ω_E) states
 * 4. Aggregates into WorldHash
 * 
 * It does NOT execute domain logic itself - TickSystems do that.
 * The Brain only coordinates and computes attractor states.
 */

import { 
  TickSystem, 
  TickSystemPriority, 
  type TickSystemContext 
} from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';
import { createKappa, type Kappa, type ChunkKey, type StateHash, createStateHash } from './types.js';
import {
  type ChunkLayerState,
  type OmegaAttractorState,
  type WorldBrainSnapshot,
  ChunkLayerIndex,
  LAYER_NAMES,
  ATTRACTOR_TYPES,
  LAYER_THRESHOLDS,
  createEmptyLayerState
} from './ChunkLayerState.js';
import { tickSystemRegistry as registry } from './TickSystemRegistry.js';

/**
 * WorldBrainScheduler evaluates all 13 layers deterministically.
 */
export class WorldBrainScheduler implements TickSystem {
  readonly name = 'world-brain';
  readonly priority = TickSystemPriority.INFRASTRUCTURE;
  enabled = true;
  
  /** Active chunks being tracked */
  private activeChunks: Set<ChunkKey> = new Set();
  
  /** Layer states for all active chunks */
  private layerStates: Map<ChunkKey, ChunkLayerState> = new Map();
  
  /** Current Omega attractor state */
  private omegaE: OmegaAttractorState = {
    attractor_type: ATTRACTOR_TYPES.STABLE,
    strength: createKappa(0),
    primary_layer: ChunkLayerIndex.ECOLOGY,
    last_tick: 0 as any,
    convergence: createKappa(0)
  };
  
  /** Previous world hash for delta calculation */
  private previousWorldHash: StateHash = createStateHash('0'.repeat(64));
  
  /** TICK_INTERVAL_MS - 10-Hz tick rate = 100ms */
  static readonly TICK_INTERVAL_MS = 100;
  
  tick(context: TickSystemContext): void {
    // 1. Get active chunks from registry
    this.updateActiveChunks();
    
    // 2. For each active chunk, evaluate 13 layers
    for (const chunkKey of this.activeChunks) {
      const currentState = this.layerStates.get(chunkKey) ?? createEmptyLayerState();
      
      // 3. Compute layer evaluation
      const evaluation = this.evaluateLayers(chunkKey, currentState);
      
      // 4. Compute Ω_E attractor for this chunk
      const attractor = this.computeOmegaE(evaluation, currentState);
      
      // 5. Update chunk state with attractor influence
      this.updateChunkState(chunkKey, attractor, currentState);
    }
    
    // 6. Aggregate all chunks into world hash
    this.computeWorldHash(context.tickCount);
    
    // 7. Propagate layer changes to neighboring chunks (resonance)
    this.propagateResonance();
  }
  
  /**
   * Update active chunks from TickSystemRegistry.
   */
  private updateActiveChunks(): void {
    // Active chunks are determined by which systems have registered chunks
    // For now, we'll track chunks that have had recent activity
  }
  
  /**
   * Evaluate all 13 layers deterministically.
   */
  private evaluateLayers(chunkKey: ChunkKey, state: ChunkLayerState): LayerEvaluation {
    return {
      ecology: this.evaluateEcology(state),
      economy: this.evaluateEconomy(state),
      npc_vitality: this.evaluateNpcVitality(state),
      trade: this.evaluateTrade(state),
      social_memory: this.evaluateSocialMemory(state),
      politics: this.evaluatePolitics(state),
      aggression: this.evaluateAggression(state),
      conjuncture: this.evaluateConjuncture(state),
      kingdom: this.evaluateKingdom(state),
      faith: this.evaluateFaith(state),
      dungeon: this.evaluateDungeon(state),
      fear: this.evaluateFear(state),
      resurrection: this.evaluateResurrection(state)
    };
  }
  
  private evaluateEcology(state: ChunkLayerState): Kappa { return state.ecology; }
  private evaluateEconomy(state: ChunkLayerState): Kappa { return state.economy; }
  private evaluateNpcVitality(state: ChunkLayerState): Kappa { return state.npc_vitality; }
  private evaluateTrade(state: ChunkLayerState): Kappa { return state.trade; }
  private evaluateSocialMemory(state: ChunkLayerState): Kappa { return state.social_memory; }
  private evaluatePolitics(state: ChunkLayerState): Kappa { return state.politics; }
  
  /**
   * Evaluate aggression layer - triggers conflict attractors.
   */
  private evaluateAggression(state: ChunkLayerState): Kappa {
    const aggression = state.aggression;
    
    // Check for aggression spike threshold
    if (aggression > LAYER_THRESHOLDS.AGGRESSION_SPIKE) {
      // Trigger conflict attractor
      return aggression; // Returns current, attractor system handles spike
    }
    
    return aggression;
  }
  
  private evaluateConjuncture(state: ChunkLayerState): Kappa { return state.conjuncture; }
  private evaluateKingdom(state: ChunkLayerState): Kappa { return state.kingdom; }
  private evaluateFaith(state: ChunkLayerState): Kappa { return state.faith; }
  private evaluateDungeon(state: ChunkLayerState): Kappa { return state.dungeon; }
  private evaluateFear(state: ChunkLayerState): Kappa { return state.fear; }
  private evaluateResurrection(state: ChunkLayerState): Kappa { return state.resurrection; }
  
  /**
   * Compute Omega Attractor State (Ω_E) deterministically.
   */
  private computeOmegaE(
    evaluation: LayerEvaluation, 
    state: ChunkLayerState
  ): OmegaAttractorState {
    // Find dominant layer (highest magnitude)
    let maxLayer = ChunkLayerIndex.ECOLOGY;
    let maxValue = evaluation.ecology;
    
    const layers: [ChunkLayerIndex, Kappa][] = [
      [ChunkLayerIndex.ECOLOGY, evaluation.ecology],
      [ChunkLayerIndex.ECONOMY, evaluation.economy],
      [ChunkLayerIndex.NPC_VITALITY, evaluation.npc_vitality],
      [ChunkLayerIndex.TRADE, evaluation.trade],
      [ChunkLayerIndex.SOCIAL_MEMORY, evaluation.social_memory],
      [ChunkLayerIndex.POLITICS, evaluation.politics],
      [ChunkLayerIndex.AGGRESSION, evaluation.aggression],
      [ChunkLayerIndex.CONJUNCTURE, evaluation.conjuncture],
      [ChunkLayerIndex.KINGDOM, evaluation.kingdom],
      [ChunkLayerIndex.FAITH, evaluation.faith],
      [ChunkLayerIndex.DUNGEON, evaluation.dungeon],
      [ChunkLayerIndex.FEAR, evaluation.fear],
      [ChunkLayerIndex.RESURRECTION, evaluation.resurrection]
    ];
    
    for (const [layer, value] of layers) {
      if (value > maxValue) {
        maxValue = value;
        maxLayer = layer;
      }
    }
    
    // Compute convergence (how stable is current attractor)
    const convergence = this.computeConvergence(evaluation);
    
    // Determine attractor type based on dominant layer and thresholds
    let attractor_type: typeof ATTRACTOR_TYPES[keyof typeof ATTRACTOR_TYPES] = ATTRACTOR_TYPES.STABLE;
    
    if (maxLayer === ChunkLayerIndex.TRADE && maxValue > LAYER_THRESHOLDS.TRADE_CITY_THRESHOLD) {
      attractor_type = ATTRACTOR_TYPES.VILLAGE_TO_CITY;
    } else if (maxLayer === ChunkLayerIndex.AGGRESSION && maxValue > LAYER_THRESHOLDS.AGGRESSION_SPIKE) {
      attractor_type = ATTRACTOR_TYPES.AGGRESSION_SPIKE;
    } else if (maxLayer === ChunkLayerIndex.ECONOMY && maxValue < LAYER_THRESHOLDS.ECONOMY_COLLAPSE) {
      attractor_type = ATTRACTOR_TYPES.MARKET_COLLAPSE;
    } else if (maxLayer === ChunkLayerIndex.FAITH && maxValue > LAYER_THRESHOLDS.FAITH_CULT_THRESHOLD) {
      attractor_type = ATTRACTOR_TYPES.CULT_FORMATION;
    } else if (maxLayer === ChunkLayerIndex.DUNGEON && maxValue > LAYER_THRESHOLDS.DUNGEON_SPAWN) {
      attractor_type = ATTRACTOR_TYPES.DUNGEON_EMERGENCE;
    } else if (convergence < LAYER_THRESHOLDS.CONVERGENCE_STABLE) {
      attractor_type = ATTRACTOR_TYPES.EMERGING;
    }
    
    return {
      attractor_type,
      strength: maxValue,
      primary_layer: maxLayer,
      last_tick: 0 as any, // Will be set by caller
      convergence
    };
  }
  
  /**
   * Compute convergence factor for attractor stability.
   */
  private computeConvergence(evaluation: LayerEvaluation): Kappa {
    // Average stability across all layers
    const sum = Number(evaluation.ecology) +
      Number(evaluation.economy) +
      Number(evaluation.npc_vitality) +
      Number(evaluation.trade) +
      Number(evaluation.social_memory) +
      Number(evaluation.politics) +
      Number(evaluation.aggression) +
      Number(evaluation.conjuncture) +
      Number(evaluation.kingdom) +
      Number(evaluation.faith) +
      Number(evaluation.dungeon) +
      Number(evaluation.fear) +
      Number(evaluation.resurrection);
    
    const avg = sum / 13;
    return createKappa(Math.min(1000, Math.floor(avg)));
  }
  
  private updateChunkState(chunkKey: ChunkKey, attractor: OmegaAttractorState, currentState: ChunkLayerState): void {
    // Update layer state based on attractor influence
    const newState: ChunkLayerState = { ...currentState };
    
    // Apply attractor effects to layers
    switch (attractor.attractor_type) {
      case ATTRACTOR_TYPES.VILLAGE_TO_CITY:
        newState.trade = attractor.strength;
        newState.kingdom = createKappa(Number(newState.kingdom) + 100);
        break;
      case ATTRACTOR_TYPES.AGGRESSION_SPIKE:
        newState.aggression = attractor.strength;
        newState.fear = createKappa(Number(attractor.strength) / 2);
        break;
      case ATTRACTOR_TYPES.DUNGEON_EMERGENCE:
        newState.dungeon = attractor.strength;
        newState.fear = attractor.strength;
        break;
      // ... other attractor effects
    }
    
    this.layerStates.set(chunkKey, newState);
  }
  
  private computeWorldHash(tickCount: number): void {
    // Deterministic hash incorporating all 13 layers
    let hashInput = `tick:${tickCount}`;
    
    for (const [chunkKey, state] of this.layerStates) {
      hashInput += `|${chunkKey}:${this.serializeLayerState(state)}`;
    }
    
    // In production, use sha256 from ManifestHasher
    this.previousWorldHash = createStateHash(hashInput.split('').map(c => 
      c.charCodeAt(0).toString(16).padStart(2, '0')).join('').padEnd(64, '0').substring(0, 64));
  }
  
  private serializeLayerState(state: ChunkLayerState): string {
    return [
      state.ecology, state.economy, state.npc_vitality, state.trade,
      state.social_memory, state.politics, state.aggression, state.conjuncture,
      state.kingdom, state.faith, state.dungeon, state.fear, state.resurrection
    ].join(',');
  }
  
  /**
   * Propagate layer changes to neighboring chunks (causal resonance).
   * Changes in one chunk affect adjacent chunks deterministically.
   */
  private propagateResonance(): void {
    const resonanceFactor = createKappa(50); // 5% propagation
    
    for (const [chunkKey, state] of this.layerStates) {
      // Get 3x3 neighboring chunks
      const neighbors = this.get3x3Neighbors(chunkKey);
      
      for (const neighborKey of neighbors) {
        const neighborState = this.layerStates.get(neighborKey) ?? createEmptyLayerState();
        
        // Propagate aggression to neighbors (fear resonance)
        if (state.aggression > LAYER_THRESHOLDS.AGGRESSION_SPIKE) {
          const fearDelta = createKappa(Math.floor(Number(state.aggression) * 0.1));
          neighborState.fear = createKappa(Math.min(1000, Number(neighborState.fear) + Number(fearDelta)));
        }
        
        // Propagate trade attractiveness
        if (state.trade > LAYER_THRESHOLDS.TRADE_CITY_THRESHOLD) {
          const tradeDelta = createKappa(Math.floor(Number(state.trade) * 0.05));
          neighborState.trade = createKappa(Math.min(1000, Number(neighborState.trade) + Number(tradeDelta)));
        }
        
        this.layerStates.set(neighborKey, neighborState);
      }
    }
  }
  
  private get3x3Neighbors(chunkKey: ChunkKey): ChunkKey[] {
    const [cx, cz] = chunkKey.split(':').map(Number);
    const neighbors: ChunkKey[] = [];
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        neighbors.push(`${cx + dx}:${cz + dz}` as ChunkKey);
      }
    }
    
    return neighbors;
  }
  
  /**
   * Register a chunk as active.
   */
  registerChunk(chunkKey: ChunkKey): void {
    this.activeChunks.add(chunkKey);
    if (!this.layerStates.has(chunkKey)) {
      this.layerStates.set(chunkKey, createEmptyLayerState());
    }
  }
  
  /**
   * Unregister a chunk (when no longer active).
   */
  unregisterChunk(chunkKey: ChunkKey): void {
    this.activeChunks.delete(chunkKey);
  }
  
  /**
   * Get current world brain snapshot.
   */
  getSnapshot(): WorldBrainSnapshot {
    return {
      tick: 0 as any, // Will be set by caller
      active_chunks: Array.from(this.activeChunks),
      layer_states: new Map(this.layerStates),
      omega_e: this.omegaE,
      world_hash: this.previousWorldHash
    };
  }
  
  /**
   * Get layer state for a specific chunk.
   */
  getChunkLayerState(chunkKey: ChunkKey): ChunkLayerState | undefined {
    return this.layerStates.get(chunkKey);
  }
  
  onStart(): void {
    console.log('[WorldBrainScheduler] Started - 13-layer brain active');
  }
  
  onShutdown(): void {
    console.log('[WorldBrainScheduler] Shutdown - finalizing state');
  }
}

interface LayerEvaluation {
  ecology: Kappa;
  economy: Kappa;
  npc_vitality: Kappa;
  trade: Kappa;
  social_memory: Kappa;
  politics: Kappa;
  aggression: Kappa;
  conjuncture: Kappa;
  kingdom: Kappa;
  faith: Kappa;
  dungeon: Kappa;
  fear: Kappa;
  resurrection: Kappa;
}

/**
 * Register WorldBrainScheduler with the global registry.
 */
export function registerWorldBrainScheduler(): WorldBrainScheduler {
  const system = new WorldBrainScheduler();
  
  tickSystemRegistry.register({
    system,
    dependencies: [], // Infrastructure - no dependencies
    tags: ['world-brain', 'infrastructure', 'emergence']
  });
  
  return system;
}