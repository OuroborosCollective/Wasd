/**
 * ARELORIA CORE: 13-Layer Chunk State
 * 
 * Phase 8-10: World Brain & Emergent Area Logic
 * 
 * Each chunk maintains aggregated state deltas for 13 logic layers.
 * These layers represent emergent world state through causal resonance
 * on the 64,000 x 64,000 Kappa grid.
 * 
 * NO external AI impulses - 100% deterministic emergent behavior.
 */

import type { Kappa, ChunkKey, StateHash, TickId } from './types.js';
import { createKappa } from './types.js';

/**
 * WorldLogicalState - Pure vector state for 2D client visual asset selection.
 * 
 * These vectors are calculated server-side during worldTick and sent to clients
 * for the AutonomousResonanceRouter to deterministically select appropriate visuals.
 * This ensures Server Authority over rendering while enabling client-side creativity.
 */
export interface WorldLogicalState {
  /** Base type for asset matching (e.g., 'npc', 'enemy', 'prop', 'vfx', 'tree', 'wall') */
  baseType: string;
  /** Season vector (e.g., 'spring', 'summer', 'autumn', 'winter', 'neutral') */
  season: string;
  /** Decay level (e.g., 'high', 'medium', 'low', 'none') */
  decayLevel: string;
  /** Culture vector (e.g., 'elven', 'dwarven', 'human', 'arcane', 'universal', 'undead') */
  culture: string;
  /** Optional biome hint (e.g., 'forest', 'swamp', 'mountain', 'dungeon') */
  biome?: string;
  /** Optional environment (e.g., 'indoor', 'outdoor', 'underground') */
  environment?: string;
}

/**
 * Index for the 13 logic layers.
 */
export enum ChunkLayerIndex {
  ECOLOGY = 1,           // Ökologie & Ressourcen
  ECONOMY = 2,            // Ökonomie & Markt
  NPC_VITALITY = 3,      // NPC-Wachstum & Physiologie
  TRADE = 4,             // Handel & Logistik
  SOCIAL_MEMORY = 5,     // Soziales Gedächtnis
  POLITICS = 6,          // Politik & Fraktionen
  AGGRESSION = 7,        // Aggression & Konflikt
  CONJUNCTURE = 8,       // Wirtschaftliche Konjunktur
  KINGDOM = 9,           // Königreiche & Makro-Territorien
  FAITH = 10,            // Glaube & Kult
  DUNGEON = 11,          // Dungeon & Gefahr
  FEAR = 12,             // Angst & Moral
  RESURRECTION = 13      // Wiederauferstehung & Zyklen
}

/**
 * Layer names for debugging/logging.
 */
export const LAYER_NAMES: Record<ChunkLayerIndex, string> = {
  [ChunkLayerIndex.ECOLOGY]: 'ecology',
  [ChunkLayerIndex.ECONOMY]: 'economy',
  [ChunkLayerIndex.NPC_VITALITY]: 'npc_vitality',
  [ChunkLayerIndex.TRADE]: 'trade',
  [ChunkLayerIndex.SOCIAL_MEMORY]: 'social_memory',
  [ChunkLayerIndex.POLITICS]: 'politics',
  [ChunkLayerIndex.AGGRESSION]: 'aggression',
  [ChunkLayerIndex.CONJUNCTURE]: 'conjuncture',
  [ChunkLayerIndex.KINGDOM]: 'kingdom',
  [ChunkLayerIndex.FAITH]: 'faith',
  [ChunkLayerIndex.DUNGEON]: 'dungeon',
  [ChunkLayerIndex.FEAR]: 'fear',
  [ChunkLayerIndex.RESURRECTION]: 'resurrection'
};

/**
 * ChunkLayerState - Aggregated state for all 13 logic layers in a chunk.
 * 
 * Each layer value is a Kappa (fixed-point integer) representing
 * the aggregated state of that layer in this chunk.
 */
export interface ChunkLayerState {
  /** Ökologie & Ressourcen - Naturzustand, Regeneration */
  ecology: Kappa;
  
  /** Ökonomie & Markt - Lokale Preise, Angebot/Nachfrage */
  economy: Kappa;
  
  /** NPC-Wachstum & Physiologie - Energie/Gesundheit Population */
  npc_vitality: Kappa;
  
  /** Handel & Logistik - Routen-Attraktivität, Transport */
  trade: Kappa;
  
  /** Soziales Gedächtnis - Local Memory / Reputation */
  social_memory: Kappa;
  
  /** Politik & Fraktionen - Territorialer Einfluss */
  politics: Kappa;
  
  /** Aggression & Konflikt - Warfront-Spikes */
  aggression: Kappa;
  
  /** Wirtschaftliche Konjunktur - Strukturaufbau, Wachstum */
  conjuncture: Kappa;
  
  /** Königreiche & Makro-Territorien - Strategischer Wert */
  kingdom: Kappa;
  
  /** Glaube & Kult - Ideologische Fraktions-Spannungen */
  faith: Kappa;
  
  /** Dungeon & Gefahr - Monster-Spawn-Wahrscheinlichkeit */
  dungeon: Kappa;
  
  /** Angst & Moral - Lokales NPC-Sicherheitsbedürfnis */
  fear: Kappa;
  
  /** Wiederauferstehung & Zyklen - Deterministischer Ressourcencycle */
  resurrection: Kappa;
}

/**
 * Create an empty ChunkLayerState with all layers initialized to 0.
 */
export function createEmptyLayerState(): ChunkLayerState {
  const zero = createKappa(0);
  return {
    ecology: zero,
    economy: zero,
    npc_vitality: zero,
    trade: zero,
    social_memory: zero,
    politics: zero,
    aggression: zero,
    conjuncture: zero,
    kingdom: zero,
    faith: zero,
    dungeon: zero,
    fear: zero,
    resurrection: zero
  };
}

/**
 * Layer delta - change from previous to current state.
 */
export interface LayerDelta {
  layer_index: ChunkLayerIndex;
  previous_value: Kappa;
  current_value: Kappa;
  delta_magnitude: Kappa; // |current - previous|
}

/**
 * Omega Attractor State (Ω_E)
 * 
 * Represents the deterministic attractor state that the chunk
 * has stabilized to in the closed recursive information field.
 */
export interface OmegaAttractorState {
  /** Attractor type identifier */
  attractor_type: string;
  
  /** Attractor strength (0-1 normalized) */
  strength: Kappa;
  
  /** Primary influenced layer */
  primary_layer: ChunkLayerIndex;
  
  /** Timestamp of last attractor update */
  last_tick: TickId;
  
  /** Convergence factor - how close to stable attractor */
  convergence: Kappa;
}

/**
 * World Brain Snapshot - Full state of all active chunks.
 * 
 * Phase 8: Aggregates 13-layer deltas from 3x3 chunk grid into WorldHash.
 */
export interface WorldBrainSnapshot {
  /** Current tick */
  tick: TickId;
  
  /** Active chunk keys in this snapshot */
  active_chunks: ChunkKey[];
  
  /** Layer states keyed by chunk */
  layer_states: Map<ChunkKey, ChunkLayerState>;
  
  /** Current Omega attractor state */
  omega_e: OmegaAttractorState;
  
  /** Deterministic world hash incorporating all 13 layers */
  world_hash: StateHash;
}

/**
 * Layer persistence event for write-behind queue.
 */
export interface LayerPersistenceEvent {
  chunk_key: ChunkKey;
  layer_index: ChunkLayerIndex;
  previous_state: ChunkLayerState;
  new_state: ChunkLayerState;
  delta_hash: StateHash;
  tick: TickId;
}

/**
 * Constants for layer evaluation thresholds.
 */
export const LAYER_THRESHOLDS = {
  /** Aggression spike threshold */
  AGGRESSION_SPIKE: createKappa(750),
  
  /** Trade attractiveness for village->city transition */
  TRADE_CITY_THRESHOLD: createKappa(800),
  
  /** Danger probability for dungeon spawn */
  DUNGEON_SPAWN: createKappa(800),
  
  /** Faith tension for cult formation */
  FAITH_CULT_THRESHOLD: createKappa(700),
  
  /** Economy collapse threshold */
  ECONOMY_COLLAPSE: createKappa(200),
  
  /** Convergence stable threshold */
  CONVERGENCE_STABLE: createKappa(950)
} as const;

/**
 * Attractor type constants.
 */
export const ATTRACTOR_TYPES = {
  VILLAGE_TO_CITY: 'village_to_city',
  AGGRESSION_SPIKE: 'aggression_spike',
  MARKET_COLLAPSE: 'market_collapse',
  CULT_FORMATION: 'cult_formation',
  DUNGEON_EMERGENCE: 'dungeon_emergence',
  STABLE: 'stable',
  EMERGING: 'emerging'
} as const;