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
 * 
 * AXIOM COMPLIANCE:
 * - Absolute Kausalität: No in-tick feedback loops
 * - Nomock-Theorem: All state derived from deterministic calculation
 * - Zeitstempel-Integrität: Tick-based timing only
 * - Ouroboros-Prinzip: State archived before chunk removal
 * - Feld-Lokalität: Resonance only affects 3x3 neighborhood
 */

import { 
  TickSystem, 
  TickSystemPriority, 
  type TickSystemContext 
} from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';
import { createKappa, type Kappa, type ChunkKey, type StateHash, createStateHash, type TickId } from './types.js';
import {
  type ChunkLayerState,
  type OmegaAttractorState,
  type WorldBrainSnapshot,
  ChunkLayerIndex,
  ATTRACTOR_TYPES,
  LAYER_THRESHOLDS,
  createEmptyLayerState
} from './ChunkLayerState.js';
import { 
  hashChunkKappa1000, 
  KAPPA_LAYER_CONSTANTS,
  type KappaLayers,
  type KappaLayerKey,
  createKappaLayers,
  cloneKappaLayers
} from './KappaLayers.js';

interface HistoryEntry {
  tick: TickId;
  chunkKey: ChunkKey;
  layers: KappaLayers;
  hash: StateHash;
}

export class WorldBrainScheduler implements TickSystem {
  readonly name = 'world-brain';
  readonly priority = TickSystemPriority.INFRASTRUCTURE;
  enabled = true;

  private activeChunks: Set<ChunkKey> = new Set();
  private layerStates: Map<ChunkKey, ChunkLayerState> = new Map();
  
  // AXIOM 4: Ouroboros-Prinzip - History archive for state reconstruction
  private historyArchive: HistoryEntry[] = [];
  
  // Current tick for hash computation
  private currentTick: TickId = 0 as TickId;

  private omegaE: OmegaAttractorState = {
    attractor_type: ATTRACTOR_TYPES.STABLE,
    strength: createKappa(0),
    primary_layer: ChunkLayerIndex.ECOLOGY,
    last_tick: 0 as any,
    convergence: createKappa(0)
  };

  private previousWorldHash: StateHash = createStateHash('0'.repeat(64));

  static readonly TICK_INTERVAL_MS = 100;

  tick(context: TickSystemContext): void {
    // AXIOM 3: Zeitstempel-Integrität - Use tick-based time, not wall-clock
    this.currentTick = (context.tickCount ?? 0) as TickId;
    
    // AXIOM 1: Absolute Kausalität - Create immutable snapshot before iteration
    const activeChunkKeys = Object.freeze([...this.activeChunks].sort());

    this.updateActiveChunks();

    for (const chunkKey of activeChunkKeys) {
      const currentState = this.layerStates.get(chunkKey) ?? createEmptyLayerState();
      const evaluation = this.evaluateLayers(currentState);
      const attractor = this.computeOmegaE(evaluation);
      this.updateChunkState(chunkKey, attractor, currentState);
      this.omegaE = { ...attractor, last_tick: context.tickCount as any };
    }

    this.computeWorldHash(context.tickCount);
    
    // AXIOM 1 & 5: Snapshot-based resonance propagation (no mutation during iteration)
    this.propagateResonance();
  }

  private updateActiveChunks(): void {
    // Active chunks are explicitly registered through registerChunk().
  }

  private evaluateLayers(state: ChunkLayerState): LayerEvaluation {
    return {
      ecology: state.ecology,
      economy: state.economy,
      npc_vitality: state.npc_vitality,
      trade: state.trade,
      social_memory: state.social_memory,
      politics: state.politics,
      aggression: state.aggression,
      conjuncture: state.conjuncture,
      kingdom: state.kingdom,
      faith: state.faith,
      dungeon: state.dungeon,
      fear: state.fear,
      resurrection: state.resurrection
    };
  }

  private computeOmegaE(evaluation: LayerEvaluation): OmegaAttractorState {
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

    const convergence = this.computeConvergence(evaluation);
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
      last_tick: 0 as any,
      convergence
    };
  }

  private computeConvergence(evaluation: LayerEvaluation): Kappa {
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
    const newState: ChunkLayerState = { ...currentState };

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
    }

    this.layerStates.set(chunkKey, newState);
  }

  private computeWorldHash(tickCount: number): void {
    let hashInput = `tick:${tickCount}`;

    for (const [chunkKey, state] of this.layerStates) {
      hashInput += `|${chunkKey}:${this.serializeLayerState(state)}`;
    }

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
   * AXIOM 1 & 5 COMPLIANT: propagateResonance()
   * 
   * - AXIOM 1 (Absolute Kausalität): NO mutation during iteration
   *   Deltas are collected first, then applied after iteration completes
   * - AXIOM 5 (Feld-Lokalität): Only 3x3 neighborhood (8 direct neighbors)
   *   Resonanz does NOT propagate beyond immediate neighbors
   */
  private propagateResonance(): void {
    // 1. Create immutable snapshot of current states (AXIOM 1)
    const snapshot = new Map(this.layerStates);
    
    // 2. Collect resonance deltas (no mutation during iteration)
    const resonanceDeltas: Array<{
      chunkKey: ChunkKey;
      layer: keyof ChunkLayerState;
      delta: number;
    }> = [];
    
    for (const chunkKey of this.activeChunks) {
      const state = snapshot.get(chunkKey);
      if (!state) continue;
      
      const neighbors = this.get3x3Neighbors(chunkKey);
      
      for (const neighborKey of neighbors) {
        if (!this.activeChunks.has(neighborKey)) continue;
        
        // AXIOM 5: Feld-Lokalität - only process direct 3x3 neighbors
        this.computeResonanceDelta(state, resonanceDeltas, chunkKey, neighborKey);
      }
    }
    
    // 3. Apply deltas AFTER iteration completes (AXIOM 1)
    for (const delta of resonanceDeltas) {
      const currentState = this.layerStates.get(delta.chunkKey);
      if (currentState) {
        const currentValue = Number(currentState[delta.layer as keyof ChunkLayerState] ?? 0);
        const newValue = Math.max(0, Math.min(1000, currentValue + delta.delta));
        currentState[delta.layer as keyof ChunkLayerState] = createKappa(newValue);
      }
    }
  }

  /**
   * Compute resonance delta from source to target chunk
   * AXIOM 5: Feld-Lokalität - Only direct neighbors are affected
   */
  private computeResonanceDelta(
    sourceState: ChunkLayerState,
    deltas: Array<{ chunkKey: ChunkKey; layer: keyof ChunkLayerState; delta: number }>,
    sourceKey: ChunkKey,
    targetKey: ChunkKey
  ): void {
    // Conflict -> Fear resonance
    if (sourceState.aggression > KAPPA_LAYER_CONSTANTS.CONFLICT_SPIKE_THRESHOLD) {
      const conflictExcess = Number(sourceState.aggression) - KAPPA_LAYER_CONSTANTS.CONFLICT_SPIKE_THRESHOLD;
      const fearDelta = Math.floor(conflictExcess * 0.01); // 1% of excess
      if (fearDelta > 0) {
        deltas.push({ chunkKey: targetKey, layer: 'fear', delta: fearDelta });
      }
    }
    
    // High trade -> Trade propagation
    if (sourceState.trade > KAPPA_LAYER_CONSTANTS.TRADE_CITY_THRESHOLD) {
      const tradeExcess = Number(sourceState.trade) - KAPPA_LAYER_CONSTANTS.TRADE_CITY_THRESHOLD;
      const tradeDelta = Math.floor(tradeExcess * 0.005); // 0.5% of excess
      if (tradeDelta > 0) {
        deltas.push({ chunkKey: targetKey, layer: 'trade', delta: tradeDelta });
      }
    }
  }

  private get3x3Neighbors(chunkKey: ChunkKey): ChunkKey[] {
    const [cx, cz] = String(chunkKey).split(':').map(Number);
    const neighbors: ChunkKey[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        neighbors.push(`${cx + dx}:${cz + dz}` as ChunkKey);
      }
    }

    return neighbors;
  }

  registerChunk(chunkKey: ChunkKey): void {
    this.activeChunks.add(chunkKey);
    if (!this.layerStates.has(chunkKey)) {
      this.layerStates.set(chunkKey, createEmptyLayerState());
    }
  }

  /**
   * AXIOM 4: Ouroboros-Prinzip
   * Archives layer state to history BEFORE removal
   * Enables state reconstruction for replay/verification
   */
  unregisterChunk(chunkKey: ChunkKey): void {
    const state = this.layerStates.get(chunkKey);
    if (state) {
      // Convert to canonical KappaLayers for consistent hashing
      const kappaLayers = createKappaLayers({
        ecology: Number(state.ecology),
        market: Number(state.economy), // conjuncture -> economy
        physiology: Number(state.npc_vitality),
        trade: Number(state.trade),
        memory: Number(state.social_memory),
        politics: Number(state.politics),
        conflict: Number(state.aggression),
        economy: Number(state.conjuncture),
        kingdoms: Number(state.kingdom),
        faith: Number(state.faith),
        dungeon: Number(state.dungeon),
        fear: Number(state.fear),
        cycles: Number(state.resurrection)
      });
      
      // Archive state with Kappa1000 hash
      const hash = hashChunkKappa1000(chunkKey, kappaLayers, this.currentTick);
      this.historyArchive.push({
        tick: this.currentTick,
        chunkKey,
        layers: kappaLayers,
        hash
      });
      
      // Limit history size to prevent memory bloat
      if (this.historyArchive.length > 10000) {
        this.historyArchive = this.historyArchive.slice(-10000);
      }
    }
    
    this.activeChunks.delete(chunkKey);
    this.layerStates.delete(chunkKey);
  }

  /**
   * Reconstruct layer state from history for a specific tick
   * AXIOM 4: Ouroboros-Prinzip - enables state reconstruction
   */
  reconstructState(chunkKey: ChunkKey, targetTick: TickId): KappaLayers | null {
    for (let i = this.historyArchive.length - 1; i >= 0; i--) {
      const entry = this.historyArchive[i];
      if (entry.chunkKey === chunkKey && entry.tick <= targetTick) {
        return entry.layers;
      }
    }
    return null;
  }

  getSnapshot(): WorldBrainSnapshot {
    return {
      tick: 0 as any,
      active_chunks: Array.from(this.activeChunks),
      layer_states: new Map(this.layerStates),
      omega_e: this.omegaE,
      world_hash: this.previousWorldHash
    };
  }

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

export function registerWorldBrainScheduler(): WorldBrainScheduler {
  const system = new WorldBrainScheduler();

  tickSystemRegistry.register({
    system,
    dependencies: [],
    tags: ['world-brain', 'infrastructure', 'emergence']
  });

  return system;
}
