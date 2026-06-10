/**
 * PlayerTypes.ts - Autonomous Player Entity Type Definitions
 * 
 * Defines the interfaces for the player:are_ghost_01 autonomous entity,
 * including ThoughtState for thinking logs and Utility Matrix for
 * decision-making using KappaInt-based calculations.
 */

import type { KappaInt, TickId, EntityId } from '../../core/are/types.js';

// =============================================================================
// Entity Identity
// =============================================================================

/** The canonical entity ID for the autonomous digital player */
export const AUTONOMOUS_PLAYER_ID = 'player:are_ghost_01' as EntityId;

// =============================================================================
// Kappa-Integer Based Position (Determinism Requirement)
// =============================================================================

/** 
 * KappaGridPosition - Position on the integer grid.
 * All positions use KappaInt (fixed-point integer) to maintain determinism.
 */
export interface KappaGridPosition {
  readonly x: KappaInt;
  readonly z: KappaInt;
  readonly layer: KappaInt; // Layer index (0-12 for 13 layers)
}

// =============================================================================
// Sports Analytics - Warfront Combat Metrics
// =============================================================================

/**
 * CombatMetrics - Sports analytics data for warfront evaluation.
 * All values are KappaInt for deterministic calculations.
 */
export interface CombatMetrics {
  /** Total attacks attempted */
  attacksAttempted: KappaInt;
  
  /** Successful hits landed */
  hitsLanded: KappaInt;
  
  /** Damage dealt per tick (DPS in KappaInt) */
  dpsAccumulator: KappaInt;
  
  /** Stamina consumed per tick */
  staminaDrainAccumulator: KappaInt;
  
  /** Position changes (movement vectors) */
  positionChanges: KappaInt;
  
  /** Distance moved this evaluation window */
  distanceMoved: KappaInt;
  
  /** Enemies engaged */
  enemiesEngaged: KappaInt;
  
  /** Times successfully fled vs engaged */
  fleeSuccesses: KappaInt;
  fleeFailures: KappaInt;
}

/**
 * CombatAnalytics - Aggregated sports analytics for decision-making.
 */
export interface CombatAnalytics {
  /** Hit ratio: hitsLanded / attacksAttempted (as KappaInt percentage * 1000) */
  hitRatio: KappaInt;
  
  /** Average DPS over evaluation window */
  averageDps: KappaInt;
  
  /** Stamina efficiency: damagePerStaminaUnit */
  staminaEfficiency: KappaInt;
  
  /** Movement pattern: avgDistancePerPositionChange */
  movementEfficiency: KappaInt;
  
  /** Survival rating: fleeSuccesses / (fleeSuccesses + fleeFailures) */
  survivalRating: KappaInt;
  
  /** Aggression index: enemiesEngaged / ticksElapsed */
  aggressionIndex: KappaInt;
}

// =============================================================================
// Utility Matrix for Decision Making
// =============================================================================

/**
 * UtilityScores - Calculated utility scores for each possible action.
 * All scores are KappaInt for deterministic comparison.
 */
export interface UtilityScores {
  /** Score for attacking/combat actions */
  combatScore: KappaInt;
  
  /** Score for diplomatic/negotiation actions */
  diplomacyScore: KappaInt;
  
  /** Score for fleeing/retreating */
  fleeScore: KappaInt;
  
  /** Score for gathering resources */
  gatherScore: KappaInt;
  
  /** Score for exploring new areas */
  exploreScore: KappaInt;
  
  /** Score for resting/recovering */
  restScore: KappaInt;
  
  /** Score for trading/commerce */
  tradeScore: KappaInt;
  
  /** Score for quest progression */
  questScore: KappaInt;
}

/**
 * UtilityWeights - Configurable weights for utility calculation.
 * These weights are deterministic and derived from entity seed.
 */
export interface UtilityWeights {
  healthWeight: KappaInt;        // How much health affects decisions
  staminaWeight: KappaInt;       // How much stamina affects decisions
  proximityWeight: KappaInt;     // Enemy proximity impact
  resourceWeight: KappaInt;      // Resource scarcity impact
  socialWeight: KappaInt;        // NPC/player presence impact
  questProgressWeight: KappaInt;  // Active quest urgency
  safetyMarginWeight: KappaInt;   // Risk tolerance threshold
}

/**
 * DecisionContext - Input state for utility calculation.
 * Contains all environmental factors the entity observes.
 */
export interface DecisionContext {
  /** Current position on Kappa grid */
  position: KappaGridPosition;
  
  /** Current health (KappaInt) */
  health: KappaInt;
  
  /** Maximum health */
  maxHealth: KappaInt;
  
  /** Current stamina (KappaInt) */
  stamina: KappaInt;
  
  /** Maximum stamina */
  maxStamina: KappaInt;
  
  /** Gold/resources */
  gold: KappaInt;
  
  /** Active quest count */
  activeQuests: KappaInt;
  
  /** Nearby enemies detected */
  nearbyEnemies: KappaInt;
  
  /** Enemy average DPS (observed) */
  enemyAverageDps: KappaInt;
  
  /** Time since last combat (ticks) */
  ticksSinceCombat: KappaInt;
  
  /** Layer difficulty (0-12 scale) */
  currentLayerDifficulty: KappaInt;
  
  /** Ally presence count */
  nearbyAllies: KappaInt;
  
  /** Resource density in current area */
  resourceDensity: KappaInt;
}

// =============================================================================
// Thought State - Thinking Log Output
// =============================================================================

/**
 * ActionDecision - The chosen action and reasoning.
 */
export interface ActionDecision {
  /** The primary action taken */
  action: AutonomousAction;
  
  /** The utility score that won */
  winningScore: KappaInt;
  
  /** Secondary action if primary fails */
  fallbackAction: AutonomousAction;
  
  /** Reasoning for decision (deterministic string) */
  reasoning: string;
  
  /** Tick when decision was made */
  decisionTick: TickId;
}

/**
 * AutonomousAction - Enumeration of possible autonomous actions.
 */
export enum AutonomousAction {
  COMBAT_ATTACK = 'combat_attack',
  COMBAT_DEFEND = 'combat_defend',
  DIPLOMACY_INITIATE = 'diplomacy_initiate',
  DIPLOMACY_NEGOTIATE = 'diplomacy_negotiate',
  FLEE_TACTICAL = 'flee_tactical',
  FLEE_EMERGENCY = 'flee_emergency',
  GATHER_RESOURCE = 'gather_resource',
  EXPLORE_NEW_AREA = 'explore_new_area',
  REST_RECOVER = 'rest_recover',
  TRADE_COMMERCE = 'trade_commerce',
  QUEST_ACCEPT = 'quest_accept',
  QUEST_COMPLETE = 'quest_complete',
  IDLE_WAIT = 'idle_wait',
  MOVE_POSITION = 'move_position',
}

/**
 * ThoughtState - Full cognitive state for external logging via AREShadowAdapter.
 * This is the output that gets routed to the shadow log stream.
 */
export interface ThoughtState {
  /** Entity this thought belongs to */
  entityId: EntityId;
  
  /** Current tick */
  tick: TickId;
  
  /** Input state snapshot */
  inputState: DecisionContext;
  
  /** Calculated utility scores */
  utilityScores: UtilityScores;
  
  /** Weights used in calculation */
  weights: UtilityWeights;
  
  /** Sports analytics at decision time */
  combatAnalytics: CombatAnalytics;
  
  /** The chosen action */
  decision: ActionDecision;
  
  /** Energy state at decision time (for closed-loop validation) */
  energyState: EnergyState;
  
  /** Determinism validation flag */
  isDeterministic: boolean;
  
  /** Timestamp for external sync (not used in calculations) */
  externalTimestamp?: number;
  
  /** Research export target path */
  exportPath?: string;
}

/**
 * EnergyState - For closed-loop constant validation (Axiom 5).
 */
export interface EnergyState {
  /** Total entity energy */
  totalEnergy: KappaInt;
  
  /** Energy delta from previous tick */
  deltaEnergy: KappaInt;
  
  /** Energy input this tick */
  energyIn: KappaInt;
  
  /** Energy output this tick */
  energyOut: KappaInt;
  
  /** Closed-loop constant check (sum should remain constant) */
  isEnergyBalanced: boolean;
}

// =============================================================================
// Behavior Tree Node Types
// =============================================================================

/**
 * BehaviorTreeNode - Base type for utility-based behavior tree.
 */
export interface BehaviorTreeNode {
  /** Node identifier */
  id: string;
  
  /** Parent node ID (null for root) */
  parentId: string | null;
  
  /** Children node IDs */
  children: string[];
  
  /** Utility threshold to select this node */
  utilityThreshold: KappaInt;
  
  /** Node priority (higher = more preferred) */
  priority: KappaInt;
}

/**
 * CachedMicroAction - Lightweight action for intermediate ticks.
 * Used during cost-brake intervals when full evaluation is skipped.
 */
export interface CachedMicroAction {
  /** Action to execute */
  action: AutonomousAction;
  
  /** Remaining uses before re-evaluation needed */
  remainingUses: KappaInt;
  
  /** Target position if movement action */
  targetPosition?: KappaGridPosition;
  
  /** Validity tick - after this tick, re-evaluate */
  validUntilTick: TickId;
}

// =============================================================================
// Google Drive Export Configuration
// =============================================================================

/**
 * ResearchExportConfig - Configuration for external Google Drive sync.
 */
export interface ResearchExportConfig {
  /** Google Drive folder ID for research leads */
  folderId: string;
  
  /** Service account email for authentication */
  serviceAccountEmail?: string;
  
  /** Target email for notifications */
  notificationEmail: string;
  
  /** Export format (json, csv, markdown) */
  exportFormat: 'json' | 'csv' | 'markdown';
  
  /** Batch size for exports */
  batchSize: number;
}

/**
 * Default research export configuration for projectouroboroscollective@gmail.com
 */
export const DEFAULT_RESEARCH_EXPORT: ResearchExportConfig = {
  folderId: '1OvGU-bMY4bXDCaq7LiIgG6XaP3_Iif1N',
  notificationEmail: 'projectouroboroscollective@gmail.com',
  exportFormat: 'json',
  batchSize: 50,
};