import type { ChunkKey, StateHash, TickId, Kappa, KappaInt } from './types.js';
import { createKappa, createStateHash } from './types.js';
import {
  ATTRACTOR_TYPES,
  ChunkLayerIndex,
  type ChunkLayerState,
  type OmegaAttractorState,
  type WorldBrainSnapshot,
} from './ChunkLayerState.js';
import type { IARELogicLayers } from './IARELogicLayers.js';
import {
  createLayerPersistenceEvent,
  type LayerPersistenceQueue,
} from './LayerPersistenceQueue.js';
import {
  deriveCanonicalLayerSeed,
  type CanonicalLayerSeedResult,
} from './CanonicalLayerSeed.js';
import { deriveCanonicalWorldgenSeedSignals } from './CanonicalLayerSeedSignals.js';
import type {
  WorldBrainCanonicalStatePort,
  WorldBrainDelta,
  WorldBrainReplaySink,
} from './WorldBrainTickSystem.js';

const ZERO_STATE_HASH = createStateHash('0'.repeat(64));

function toKappa(value: KappaInt): Kappa {
  return createKappa(Number(value));
}

function toKappaInt(value: Kappa): KappaInt {
  return Number(value) as KappaInt;
}

export function chunkLayerStateToIARELayers(state: ChunkLayerState): IARELogicLayers {
  return Object.freeze({
    ecology: toKappaInt(state.ecology),
    market: toKappaInt(state.economy),
    physiology: toKappaInt(state.npc_vitality),
    trade: toKappaInt(state.trade),
    memory: toKappaInt(state.social_memory),
    politics: toKappaInt(state.politics),
    conflict: toKappaInt(state.aggression),
    economy: toKappaInt(state.conjuncture),
    kingdoms: toKappaInt(state.kingdom),
    faith: toKappaInt(state.faith),
    dungeon: toKappaInt(state.dungeon),
    fear: toKappaInt(state.fear),
    cycles: toKappaInt(state.resurrection),
  });
}

export function iareLayersToChunkLayerState(layers: IARELogicLayers): ChunkLayerState {
  return {
    ecology: toKappa(layers.ecology),
    economy: toKappa(layers.market),
    npc_vitality: toKappa(layers.physiology),
    trade: toKappa(layers.trade),
    social_memory: toKappa(layers.memory),
    politics: toKappa(layers.politics),
    aggression: toKappa(layers.conflict),
    conjuncture: toKappa(layers.economy),
    kingdom: toKappa(layers.kingdoms),
    faith: toKappa(layers.faith),
    dungeon: toKappa(layers.dungeon),
    fear: toKappa(layers.fear),
    resurrection: toKappa(layers.cycles),
  };
}

function cloneChunkLayerState(state: ChunkLayerState): ChunkLayerState {
  return iareLayersToChunkLayerState(chunkLayerStateToIARELayers(state));
}

function hashRuntimeSnapshot(tick: TickId, layerStates: Map<ChunkKey, ChunkLayerState>): StateHash {
  const parts = [...layerStates.entries()]
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
    .map(([chunkKey, state]) => `${String(chunkKey)}:${Object.values(chunkLayerStateToIARELayers(state)).join(',')}`)
    .join('|');

  let hash = 0x811c9dc5;
  const input = `tick:${Number(tick)}|${parts}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  const hex = hash.toString(16).padStart(8, '0');
  return createStateHash(hex.repeat(8).slice(0, 64));
}

function createStableOmega(tick: TickId): OmegaAttractorState {
  return Object.freeze({
    attractor_type: ATTRACTOR_TYPES.STABLE,
    strength: createKappa(0),
    primary_layer: ChunkLayerIndex.ECOLOGY,
    last_tick: tick,
    convergence: createKappa(0),
  });
}

export interface RuntimeWorldBrainStatePortOptions {
  readonly worldSeed?: string | number | null;
}

/**
 * Runtime state owner for WorldBrainTickSystem.
 *
 * It is not a fake adapter: registerChunk/unregisterChunk mutate the actual
 * active chunk set used by WorldBrainTickSystem, while deltas commit back into
 * the same layer-state map that backs getWorldBrainSnapshot().
 */
export class RuntimeWorldBrainStatePort implements WorldBrainCanonicalStatePort {
  private readonly activeChunks = new Set<ChunkKey>();
  private readonly layerStates = new Map<ChunkKey, ChunkLayerState>();
  private readonly seedRecords = new Map<ChunkKey, CanonicalLayerSeedResult>();
  private currentTick = 0 as TickId;
  private worldHash: StateHash = ZERO_STATE_HASH;
  private omegaE: OmegaAttractorState = createStableOmega(0 as TickId);

  constructor(private readonly options: RuntimeWorldBrainStatePortOptions = {}) {}

  listActiveChunkKeys(): readonly ChunkKey[] {
    return Object.freeze([...this.activeChunks].sort((a, b) => String(a).localeCompare(String(b))));
  }

  readChunkLayers(chunkKey: ChunkKey): IARELogicLayers | null {
    const state = this.layerStates.get(chunkKey);
    return state ? chunkLayerStateToIARELayers(state) : null;
  }

  commitWorldBrainDelta(delta: WorldBrainDelta): void {
    this.currentTick = delta.tick;
    this.activeChunks.add(delta.chunkKey);
    this.layerStates.set(delta.chunkKey, iareLayersToChunkLayerState(delta.nextLayers));
    this.worldHash = hashRuntimeSnapshot(delta.tick, this.layerStates);
    this.omegaE = Object.freeze({
      attractor_type: delta.attractor.type,
      strength: createKappa(Number(delta.attractor.strength)),
      primary_layer: layerKeyToChunkLayerIndex(delta.attractor.primaryLayer),
      last_tick: delta.tick,
      convergence: createKappa(Number(delta.attractor.convergence)),
    });
  }

  registerChunk(chunkKey: ChunkKey): void {
    this.activeChunks.add(chunkKey);
    if (!this.layerStates.has(chunkKey)) {
      const signals = deriveCanonicalWorldgenSeedSignals({
        worldSeed: this.options.worldSeed,
        chunkKey,
        activationTick: this.currentTick,
      });
      const seed = deriveCanonicalLayerSeed({
        worldSeed: this.options.worldSeed,
        chunkKey,
        activationTick: this.currentTick,
        signals,
      });
      this.seedRecords.set(chunkKey, seed);
      this.layerStates.set(chunkKey, iareLayersToChunkLayerState(seed.layers));
    }
    this.worldHash = hashRuntimeSnapshot(this.currentTick, this.layerStates);
  }

  unregisterChunk(chunkKey: ChunkKey): void {
    this.activeChunks.delete(chunkKey);
    this.layerStates.delete(chunkKey);
    this.seedRecords.delete(chunkKey);
    this.worldHash = hashRuntimeSnapshot(this.currentTick, this.layerStates);
  }

  getCanonicalSeedRecord(chunkKey: ChunkKey): CanonicalLayerSeedResult | null {
    return this.seedRecords.get(chunkKey) ?? null;
  }

  getSnapshot(): WorldBrainSnapshot {
    return Object.freeze({
      tick: this.currentTick,
      active_chunks: [...this.listActiveChunkKeys()],
      layer_states: new Map([...this.layerStates.entries()].map(([key, value]) => [key, cloneChunkLayerState(value)])),
      omega_e: this.omegaE,
      world_hash: this.worldHash,
    });
  }
}

export class LayerPersistenceWorldBrainReplaySink implements WorldBrainReplaySink {
  constructor(private readonly queue: LayerPersistenceQueue) {}

  recordWorldBrainDelta(delta: WorldBrainDelta): void {
    this.queue.enqueue(createLayerPersistenceEvent(
      delta.chunkKey,
      delta.tick,
      delta.nextLayers,
      delta.nextHash,
    ));
  }
}

function layerKeyToChunkLayerIndex(layer: keyof IARELogicLayers): ChunkLayerIndex {
  switch (layer) {
    case 'ecology': return ChunkLayerIndex.ECOLOGY;
    case 'market': return ChunkLayerIndex.ECONOMY;
    case 'physiology': return ChunkLayerIndex.NPC_VITALITY;
    case 'trade': return ChunkLayerIndex.TRADE;
    case 'memory': return ChunkLayerIndex.SOCIAL_MEMORY;
    case 'politics': return ChunkLayerIndex.POLITICS;
    case 'conflict': return ChunkLayerIndex.AGGRESSION;
    case 'economy': return ChunkLayerIndex.CONJUNCTURE;
    case 'kingdoms': return ChunkLayerIndex.KINGDOM;
    case 'faith': return ChunkLayerIndex.FAITH;
    case 'dungeon': return ChunkLayerIndex.DUNGEON;
    case 'fear': return ChunkLayerIndex.FEAR;
    case 'cycles': return ChunkLayerIndex.RESURRECTION;
    default: {
      const unreachable: never = layer;
      throw new Error(`Unsupported world-brain layer: ${String(unreachable)}`);
    }
  }
}
