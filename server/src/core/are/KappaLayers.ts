/**
 * KappaLayers - Unified 13-Layer Definition for ARE System
 * 
 * Phase 8-10: World Brain & Emergent Area Logic
 * 
 * This file provides the single source of truth for all 13 layer names
 * used across the ARE system. It resolves the naming inconsistency between:
 * - ChunkLayerState (ecology, economy, npc_vitality, trade, social_memory, politics, 
 *                   aggression, conjuncture, kingdom, faith, dungeon, fear, resurrection)
 * - IARELogicLayers (ecology, market, physiology, trade, memory, politics,
 *                   conflict, economy, kingdoms, faith, dungeon, fear, cycles)
 * 
 * The canonical names use the IARELogicLayers naming convention as the standard.
 */

import type { KappaInt, ChunkKey, TickId, StateHash } from './types.js';
import { createStateHash } from './StateHash.js';

/**
 * 13 canonical layer names (Kappa1000 scaled)
 * These names are used consistently across all ARE components
 */
export const KAPPA_LAYER_NAMES = {
  ecology: 'ecology',        // Ökologie & Ressourcen
  market: 'market',          // Markt & Preise
  physiology: 'physiology',  // NPC-Energie/Gesundheit
  trade: 'trade',            // Handel & Routen
  memory: 'memory',          // Soziales Gedächtnis
  politics: 'politics',      // Politik & Fraktionen
  conflict: 'conflict',      // Aggression & Konflikt
  economy: 'economy',        // Wirtschaftliche Konjunktur
  kingdoms: 'kingdoms',      // Königreiche & Territorien
  faith: 'faith',            // Glaube & Kult
  dungeon: 'dungeon',        // Dungeon & Gefahr
  fear: 'fear',              // Angst & Moral
  cycles: 'cycles'           // Wiederauferstehung & Zyklen
} as const;

export type KappaLayerKey = keyof typeof KAPPA_LAYER_NAMES;

/**
 * Canonical 13-layer interface for ARE logic
 * All layer values are KappaInt (fixed-point integers, K=1000)
 */
export interface KappaLayers {
  readonly ecology: KappaInt;
  readonly market: KappaInt;
  readonly physiology: KappaInt;
  readonly trade: KappaInt;
  readonly memory: KappaInt;
  readonly politics: KappaInt;
  readonly conflict: KappaInt;
  readonly economy: KappaInt;
  readonly kingdoms: KappaInt;
  readonly faith: KappaInt;
  readonly dungeon: KappaInt;
  readonly fear: KappaInt;
  readonly cycles: KappaInt;
}

/**
 * Layer mapping from legacy ChunkLayerState names to canonical names
 * Used for converting between the two systems
 */
export const LEGACY_LAYER_MAPPING: Record<string, KappaLayerKey> = {
  // ChunkLayerState -> KappaLayerKey
  'ecology': 'ecology',
  'economy': 'economy',          // conjuncture in ChunkLayerState
  'npc_vitality': 'physiology',
  'trade': 'trade',
  'social_memory': 'memory',
  'politics': 'politics',
  'aggression': 'conflict',
  'conjuncture': 'economy',
  'kingdom': 'kingdoms',
  'faith': 'faith',
  'dungeon': 'dungeon',
  'fear': 'fear',
  'resurrection': 'cycles'
};

/**
 * Create empty KappaLayers with all layers initialized to 0
 */
export function createEmptyKappaLayers(): KappaLayers {
  return Object.freeze({
    ecology: 0 as KappaInt,
    market: 0 as KappaInt,
    physiology: 0 as KappaInt,
    trade: 0 as KappaInt,
    memory: 0 as KappaInt,
    politics: 0 as KappaInt,
    conflict: 0 as KappaInt,
    economy: 0 as KappaInt,
    kingdoms: 0 as KappaInt,
    faith: 0 as KappaInt,
    dungeon: 0 as KappaInt,
    fear: 0 as KappaInt,
    cycles: 0 as KappaInt
  });
}

/**
 * Create KappaLayers with specified initial values
 */
export function createKappaLayers(values: Partial<Record<KappaLayerKey, number>>): KappaLayers {
  return Object.freeze({
    ecology: (values.ecology ?? 0) as KappaInt,
    market: (values.market ?? 0) as KappaInt,
    physiology: (values.physiology ?? 0) as KappaInt,
    trade: (values.trade ?? 0) as KappaInt,
    memory: (values.memory ?? 0) as KappaInt,
    politics: (values.politics ?? 0) as KappaInt,
    conflict: (values.conflict ?? 0) as KappaInt,
    economy: (values.economy ?? 0) as KappaInt,
    kingdoms: (values.kingdoms ?? 0) as KappaInt,
    faith: (values.faith ?? 0) as KappaInt,
    dungeon: (values.dungeon ?? 0) as KappaInt,
    fear: (values.fear ?? 0) as KappaInt,
    cycles: (values.cycles ?? 0) as KappaInt
  });
}

/**
 * Get all layer values as an array for iteration
 */
export function getKappaLayerValues(layers: KappaLayers): KappaInt[] {
  return Object.values(KAPPA_LAYER_NAMES).map(key => layers[key]);
}

/**
 * Clone KappaLayers (returns mutable copy)
 */
export function cloneKappaLayers(layers: KappaLayers): KappaLayers {
  return {
    ecology: layers.ecology,
    market: layers.market,
    physiology: layers.physiology,
    trade: layers.trade,
    memory: layers.memory,
    politics: layers.politics,
    conflict: layers.conflict,
    economy: layers.economy,
    kingdoms: layers.kingdoms,
    faith: layers.faith,
    dungeon: layers.dungeon,
    fear: layers.fear,
    cycles: layers.cycles
  };
}

/**
 * Layer constants for ARE calculations
 */
export const KAPPA_LAYER_CONSTANTS = {
  /** Sum of all layers when initialized at midpoint (13 * 500 = 6500) */
  LAYER_SUM_MIDPOINT: 6500 as KappaInt,
  
  /** Maximum value per layer (1000 Kappa = 1 world unit) */
  LAYER_MAX: 1000 as KappaInt,
  
  /** Number of layers */
  LAYER_COUNT: 13,
  
  /** Midpoint value for convergence calculation */
  LAYER_MIDPOINT: 500 as KappaInt,
  
  /** Threshold for conflict spike */
  CONFLICT_SPIKE_THRESHOLD: 750 as KappaInt,
  
  /** Threshold for trade city transition */
  TRADE_CITY_THRESHOLD: 800 as KappaInt,
  
  /** Threshold for dungeon spawn */
  DUNGEON_SPAWN_THRESHOLD: 800 as KappaInt,
  
  /** Threshold for faith cult formation */
  FAITH_CULT_THRESHOLD: 700 as KappaInt,
  
  /** Threshold for market collapse */
  MARKET_COLLAPSE_THRESHOLD: 200 as KappaInt,
  
  /** Stable convergence threshold */
  CONVERGENCE_STABLE: 950 as KappaInt
} as const;

/**
 * Kappa1000 integer hash function using FNV-1a
 * Returns a 32-bit unsigned integer hash
 */
export function kappa1000Hash(input: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Hash a chunk with Kappa1000 integer for verification
 * Produces a deterministic 64-character StateHash
 */
export function hashChunkKappa1000(chunkKey: ChunkKey, layers: KappaLayers, tick: TickId): StateHash {
  // Deterministically sort layer names for consistent hashing
  const sortedLayerNames = Object.keys(KAPPA_LAYER_NAMES).sort() as KappaLayerKey[];
  
  const parts: string[] = [
    `tick:${tick}`,
    `chunk:${chunkKey}`
  ];
  
  for (const layerName of sortedLayerNames) {
    const value = layers[layerName];
    parts.push(`${layerName}:${value}`);
  }
  
  const input = parts.join('|');
  const hashHex = kappa1000Hash(input).toString(16).padStart(8, '0');
  
  // Extend to 64-character StateHash by repeating the 8-char hex
  return createStateHash((hashHex.repeat(8)).slice(0, 64));
}

/**
 * Verify a chunk hash against expected value
 */
export function verifyChunkKappaHash(
  chunkKey: ChunkKey, 
  layers: KappaLayers, 
  tick: TickId, 
  expectedHash: StateHash
): boolean {
  const computed = hashChunkKappa1000(chunkKey, layers, tick);
  return computed === expectedHash;
}

/**
 * Compute checksum (sum) of all layers
 * Used for conservation law validation: ∑ Are = const
 */
export function checksumKappaLayers(layers: KappaLayers): KappaInt {
  let sum = 0 as KappaInt;
  for (const layerName of Object.keys(KAPPA_LAYER_NAMES) as KappaLayerKey[]) {
    sum = (sum + layers[layerName]) as KappaInt;
  }
  return sum;
}

/**
 * Convert legacy ChunkLayerState to canonical KappaLayers
 */
export function fromChunkLayerState(legacy: Record<string, number>): KappaLayers {
  return Object.freeze({
    ecology: (legacy['ecology'] ?? 0) as KappaInt,
    market: (legacy['market'] ?? legacy['economy'] ?? 0) as KappaInt,
    physiology: (legacy['physiology'] ?? legacy['npc_vitality'] ?? 0) as KappaInt,
    trade: (legacy['trade'] ?? 0) as KappaInt,
    memory: (legacy['memory'] ?? legacy['social_memory'] ?? 0) as KappaInt,
    politics: (legacy['politics'] ?? 0) as KappaInt,
    conflict: (legacy['conflict'] ?? legacy['aggression'] ?? 0) as KappaInt,
    economy: (legacy['economy'] ?? legacy['conjuncture'] ?? 0) as KappaInt,
    kingdoms: (legacy['kingdoms'] ?? legacy['kingdom'] ?? 0) as KappaInt,
    faith: (legacy['faith'] ?? 0) as KappaInt,
    dungeon: (legacy['dungeon'] ?? 0) as KappaInt,
    fear: (legacy['fear'] ?? 0) as KappaInt,
    cycles: (legacy['cycles'] ?? legacy['resurrection'] ?? 0) as KappaInt
  });
}

/**
 * Convert canonical KappaLayers to legacy ChunkLayerState format
 */
export function toChunkLayerState(layers: KappaLayers): Record<string, number> {
  return {
    ecology: Number(layers.ecology),
    economy: Number(layers.economy),
    npc_vitality: Number(layers.physiology),
    trade: Number(layers.trade),
    social_memory: Number(layers.memory),
    politics: Number(layers.politics),
    aggression: Number(layers.conflict),
    conjuncture: Number(layers.economy),
    kingdom: Number(layers.kingdoms),
    faith: Number(layers.faith),
    dungeon: Number(layers.dungeon),
    fear: Number(layers.fear),
    resurrection: Number(layers.cycles)
  };
}