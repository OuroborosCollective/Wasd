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
  ATTRACTOR_TYPES,
  LAYER_THRESHOLDS,
  createEmptyLayerState
} from './ChunkLayerState.js';

export class WorldBrainScheduler implements TickSystem {
  readonly name = 'world-brain';
  readonly priority = TickSystemPriority.INFRASTRUCTURE;
  enabled = true;

  private activeChunks: Set<ChunkKey> = new Set();
  private layerStates: Map<ChunkKey, ChunkLayerState> = new Map();

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
    this.updateActiveChunks();

    for (const chunkKey of this.activeChunks) {
      const currentState = this.layerStates.get(chunkKey) ?? createEmptyLayerState();
      const evaluation = this.evaluateLayers(currentState);
      const attractor = this.computeOmegaE(evaluation);
      this.updateChunkState(chunkKey, attractor, currentState);
      this.omegaE = { ...attractor, last_tick: context.tickCount as any };
    }

    this.computeWorldHash(context.tickCount);
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

  private propagateResonance(): void {
    const sourceEntries = [...this.layerStates.entries()].filter(([chunkKey]) => this.activeChunks.has(chunkKey));

    for (const [chunkKey, state] of sourceEntries) {
      const neighbors = this.get3x3Neighbors(chunkKey);

      for (const neighborKey of neighbors) {
        if (!this.activeChunks.has(neighborKey)) continue;
        const neighborState = this.layerStates.get(neighborKey) ?? createEmptyLayerState();

        if (state.aggression > LAYER_THRESHOLDS.AGGRESSION_SPIKE) {
          const fearDelta = createKappa(Math.floor(Number(state.aggression) * 0.1));
          neighborState.fear = createKappa(Math.min(1000, Number(neighborState.fear) + Number(fearDelta)));
        }

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

  registerChunk(chunkKey: ChunkKey): void {
    this.activeChunks.add(chunkKey);
    if (!this.layerStates.has(chunkKey)) {
      this.layerStates.set(chunkKey, createEmptyLayerState());
    }
  }

  unregisterChunk(chunkKey: ChunkKey): void {
    this.activeChunks.delete(chunkKey);
    this.layerStates.delete(chunkKey);
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
