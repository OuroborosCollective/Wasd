/**
 * IARELogicLayers - ARE-Logic Layer Interface for Phase 8
 * 
 * 13 deterministic logic layers for emergent world state.
 * All values are KappaInt (fixed-point integers, K=1000).
 * NO floating point numbers allowed.
 * 
 * Conservation law: ∑ Are = const
 */

import type { KappaInt } from './types.js';

/**
 * IARELogicLayers - 13 ARE-Logic Layers for deterministic world state.
 * 
 * Each layer represents an emergent aspect of world state:
 * - ecology: Natural resources and regeneration
 * - market: Local prices, supply/demand
 * - physiology: NPC energy/health population
 * - trade: Route attractiveness, transport
 * - memory: Local reputation/social memory
 * - politics: Territorial influence
 * - conflict: Warfront spikes
 * - economy: Structural growth
 * - kingdoms: Strategic value
 * - faith: Ideological faction tension
 * - dungeon: Monster spawn probability
 * - fear: Local NPC security need
 * - cycles: Deterministic resource cycle
 */
export interface IARELogicLayers {
  /** Ökologie & Ressourcen - Natural state */
  readonly ecology: KappaInt;
  
  /** Markt - Local prices, supply/demand */
  readonly market: KappaInt;
  
  /** Physiologie - NPC energy/health population */
  readonly physiology: KappaInt;
  
  /** Handel - Route attractiveness */
  readonly trade: KappaInt;
  
  /** Memory - Local reputation/social memory */
  readonly memory: KappaInt;
  
  /** Politik - Territorial influence */
  readonly politics: KappaInt;
  
  /** Konflikt - Warfront spikes */
  readonly conflict: KappaInt;
  
  /** Ökonomie - Structural growth */
  readonly economy: KappaInt;
  
  /** Königreiche - Strategic value */
  readonly kingdoms: KappaInt;
  
  /** Glaube - Ideological faction tension */
  readonly faith: KappaInt;
  
  /** Dungeon - Monster spawn probability */
  readonly dungeon: KappaInt;
  
  /** Angst - Local NPC security need */
  readonly fear: KappaInt;
  
  /** Zyklen - Deterministic resource cycle */
  readonly cycles: KappaInt;
}

/**
 * Layer names for the 13 ARE-Logic layers.
 */
export const IARE_LAYER_NAMES = {
  ecology: 'ecology',
  market: 'market',
  physiology: 'physiology',
  trade: 'trade',
  memory: 'memory',
  politics: 'politics',
  conflict: 'conflict',
  economy: 'economy',
  kingdoms: 'kingdoms',
  faith: 'faith',
  dungeon: 'dungeon',
  fear: 'fear',
  cycles: 'cycles'
} as const;

/**
 * Create empty IARELogicLayers with all layers initialized to 0.
 */
export function createEmptyIARELogicLayers(): IARELogicLayers {
  return {
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
  };
}

/**
 * Get all layer values as an array for iteration.
 */
export function getLayerValues(layers: IARELogicLayers): KappaInt[] {
  return [
    layers.ecology,
    layers.market,
    layers.physiology,
    layers.trade,
    layers.memory,
    layers.politics,
    layers.conflict,
    layers.economy,
    layers.kingdoms,
    layers.faith,
    layers.dungeon,
    layers.fear,
    layers.cycles
  ];
}

/**
 * Layer validation constants.
 */
export const LAYER_CONSTANTS = {
  /** Total conservation sum for ∑ Are = const */
  CONST_ARE_TOTAL: 0 as KappaInt,
  
  /** Maximum value per layer (1000 Kappa = 1 world unit) */
  LAYER_MAX: 1000 as KappaInt,
  
  /** Number of layers */
  LAYER_COUNT: 13
} as const;