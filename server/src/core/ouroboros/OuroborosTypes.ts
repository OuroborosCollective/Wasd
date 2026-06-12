/**
 * OuroborosTypes - Ouroboros Emergence System Type Definitions
 * 
 * Phase 11: Ouroboros Grand Unification with ARE-Logic
 * 
 * Key Axioms:
 * - Axiom 1: Snapshot-Prinzip (keine Mutation während Iteration)
 * - Axiom 2: Nomock-Theorem (keine Mocks, keine Stubs, keine Zeitquellen)
 * - Axiom 3: Zeitstempel-Integrität (tick-basiert, nicht wall-clock)
 * - Axiom 4: Informations-Erhaltung (Energie geht nicht verloren)
 * - Axiom 5: Feld-Lokalität (Information breitet sich kausal aus)
 * 
 * All types use KappaInt (fixed-point integers, K=1000).
 * NO floating point numbers allowed in simulation logic.
 */

import type { KappaInt, ChunkKey, TickId, StateHash } from '../are/types.js';
import type { KappaLayerKey } from '../are/KappaLayers.js';

/**
 * ErdősString - Compressed interaction history string
 * 
 * Stores compressed event log as a pipe-separated string.
 * Used for deterministic state reconstruction without state-bloat.
 * 
 * Format: CHUNKKEY|TICK:EVENT|TICK:EVENT|...
 * Example: "0:0|100:SETTLE|500:WAR|1200:FALLEN"
 */
export interface ErdősString {
  readonly chunkKey: ChunkKey;
  readonly events: string;  // Pipe-separated event log
  readonly lastTick: TickId;
}

/**
 * ErdősRecord - Stored record for persistence
 * 
 * Minimal state storage - only Erdős-Strings and tick count.
 * Layers are recomputed deterministically on load.
 */
export interface ErdősRecord {
  readonly chunkKey: ChunkKey;
  readonly erdosString: string;
  readonly lastTick: TickId;
}

/**
 * LayerResonanceConfig - Thresholds for emergent phenomena
 * 
 * All thresholds in KappaInt (fixed-point, K=1000)
 */
export interface LayerResonanceConfig {
  /** economy > 80.0 (80000) && memory > 50.0 (50000) && kingdoms === 0 */
  readonly KINGDOM_EMERGENCE_THRESHOLD: KappaInt;
  
  /** conflict > 0 && kingdoms > 0 */
  readonly LEGEND_SPREAD_THRESHOLD: KappaInt;
  
  /** conflict > 100.0 (100000) && kingdoms > 0 */
  readonly OUROBOROS_FALL_THRESHOLD: KappaInt;
  
  /** 3x3 neighbor spread radius */
  readonly RESURRECTION_RADIUS: number;
  
  /** cycles > 100.0 (100000) triggers resurrection wave */
  readonly RESURRECTION_THRESHOLD: KappaInt;
}

/**
 * OuroborosEventType - Event types in Erdős-Strings
 */
export enum OuroborosEventType {
  /** Settlement emergence */
  SETTLE = 'SETTLE',
  
  /** Kingdom formation */
  KINGDOM = 'KINGDOM',
  
  /** War/conflict event */
  WAR = 'WAR',
  
  /** Civilization fall (Ouroboros cycle) */
  FALLEN = 'FALLEN',
  
  /** Dungeon spawn from mythos energy */
  DUNGEON = 'DUNGEON',
  
  /** Resurrection wave */
  RESURRECT = 'RESURRECT',
  
  /** Legend propagation */
  LEGEND = 'LEGEND',
  
  /** Trade route established */
  TRADE = 'TRADE',
  
  /** Faith/cult formation */
  FAITH = 'FAITH'
}

/**
 * ParsedErdősEvent - Parsed event from Erdős-String
 */
export interface ParsedErdősEvent {
  readonly tick: TickId;
  readonly type: OuroborosEventType;
  readonly data?: string;
}

/**
 * OuroborosPhase - Current phase in Ouroboros cycle
 */
export enum OuroborosPhase {
  /** Initial state, no history */
  WILD = 'WILD',
  
  /** Settlement exists */
  SETTLED = 'SETTLED',
  
  /** Kingdom formed */
  KINGDOM = 'KINGDOM',
  
  /** War/conflict phase */
  WAR = 'WAR',
  
  /** Civilization fallen, dungeon active */
  FALLEN = 'FALLEN',
  
  /** Resurrection in progress */
  RESURRECT = 'RESURRECT'
}

/**
 * OuroborosChunkState - Full Ouroboros state for a chunk
 */
export interface OuroborosChunkState {
  readonly chunkKey: ChunkKey;
  readonly erdosString: ErdősString;
  readonly phase: OuroborosPhase;
  readonly mythosSeed: number;  // Dungeon seed after FALLEN
}

/**
 * LootDrop - Diablo-style deterministic loot
 */
export interface LootDrop {
  readonly baseType: string;
  readonly rarity: LootRarity;
  readonly prefix: string;
  readonly suffix: string;
  readonly statBonus: KappaInt;
}

/**
 * Loot rarity tiers
 */
export enum LootRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

/**
 * OuroborosLootConfig - Loot generation thresholds
 */
export interface OuroborosLootConfig {
  readonly COMMON_THRESHOLD: number;  // 0-700: 70%
  readonly RARE_THRESHOLD: number;    // 700-900: 20%
  readonly EPIC_THRESHOLD: number;   // 900-980: 8%
  readonly LEGENDARY_THRESHOLD: number; // 980-1000: 2%
}

/**
 * NPCSemanticsConfig - Semantic generation configuration
 */
export interface NPCSemanticsConfig {
  /** Base mood threshold for dialogue */
  readonly MOOD_THRESHOLD: KappaInt;
  
  /** Need threshold for quest emergence */
  readonly NEED_THRESHOLD: KappaInt;
  
  /** Memory influence on speech */
  readonly MEMORY_INFLUENCE: KappaInt;
  
  /** Conflict influence on speech */
  readonly CONFLICT_INFLUENCE: KappaInt;
}

/**
 * SemanticVector - Mood/need vector for NPC semantics
 */
export interface SemanticVector {
  readonly mood: KappaInt;   // memory - conflict
  readonly need: KappaInt;  // economy - market
  readonly urgency: KappaInt;
}

/**
 * OuroborosWatchdogConfig - State verification configuration
 */
export interface OuroborosWatchdogConfig {
  readonly VERIFY_INTERVAL: number;
  readonly HASH_CHECK_ENABLED: boolean;
}

/**
 * ChunkVerification - Client state verification result
 */
export interface ChunkVerification {
  readonly chunkKey: ChunkKey;
  readonly clientHash: StateHash;
  readonly serverHash: StateHash;
  readonly isValid: boolean;
  readonly tick: TickId;
}

/**
 * GenesisRecord - Record for cold-start reconstruction
 */
export interface GenesisRecord {
  readonly chunkKey: ChunkKey;
  readonly erdosString: string;
  readonly tickCount: TickId;
}

/**
 * OuroborosTickConfig - Tick system configuration
 */
export interface OuroborosTickConfig {
  readonly TICK_INTERVAL: number;
  readonly KINGDOM_CHECK_INTERVAL: number;
  readonly LEGEND_SPREAD_INTERVAL: number;
  readonly OUROBOROS_CHECK_INTERVAL: number;
  readonly RESURRECTION_INTERVAL: number;
}

/**
 * Default Ouroboros configuration values
 */
export const OUROBOROS_CONFIG: Readonly<{
  LAYER_RESONANCE: LayerResonanceConfig;
  LOOT: OuroborosLootConfig;
  SEMANTICS: NPCSemanticsConfig;
  WATCHDOG: OuroborosWatchdogConfig;
  TICK: OuroborosTickConfig;
}> = Object.freeze({
  LAYER_RESONANCE: Object.freeze({
    KINGDOM_EMERGENCE_THRESHOLD: 80000 as KappaInt,  // economy > 80.0
    LEGEND_SPREAD_THRESHOLD: 0 as KappaInt,
    OUROBOROS_FALL_THRESHOLD: 100000 as KappaInt,   // conflict > 100.0
    RESURRECTION_RADIUS: 1,                          // 3x3 neighbors
    RESURRECTION_THRESHOLD: 100000 as KappaInt      // cycles > 100.0
  }),
  
  LOOT: Object.freeze({
    COMMON_THRESHOLD: 700,
    RARE_THRESHOLD: 900,
    EPIC_THRESHOLD: 980,
    LEGENDARY_THRESHOLD: 1000
  }),
  
  SEMANTICS: Object.freeze({
    MOOD_THRESHOLD: 0 as KappaInt,
    NEED_THRESHOLD: 0 as KappaInt,
    MEMORY_INFLUENCE: 300 as KappaInt,
    CONFLICT_INFLUENCE: 500 as KappaInt
  }),
  
  WATCHDOG: Object.freeze({
    VERIFY_INTERVAL: 100,
    HASH_CHECK_ENABLED: true
  }),
  
  TICK: Object.freeze({
    TICK_INTERVAL: 10,
    KINGDOM_CHECK_INTERVAL: 100,
    LEGEND_SPREAD_INTERVAL: 50,
    OUROBOROS_CHECK_INTERVAL: 100,
    RESURRECTION_INTERVAL: 100
  })
});

/**
 * Layer vector for semantic computation
 */
export interface OuroborosLayerVector {
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