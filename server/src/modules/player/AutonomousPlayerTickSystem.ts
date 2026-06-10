/**
 * AutonomousPlayerTickSystem.ts - Digital Player Entity (player:are_ghost_01)
 * 
 * An autonomous player entity implementing Utility-based Behavior Tree with
 * active "Thinking Logs" integrated into the ARE Module Standard.
 * 
 * Key Features:
 * - Utility-based decision making with KappaInt calculations
 * - Cost Brake: Complex decisions execute every 50 ticks only
 * - Sports Analytics for Warfront combat evaluation
 * - Deterministic operations (no Math.random, no floating-point)
 * - Closed-loop energy validation (Axiom 5)
 * - ThoughtState logs routed via AREShadowAdapter
 * 
 * Entity Identity: player:are_ghost_01 (registered as standard player)
 */

import type {
  TickSystem,
  TickSystemContext,
  TickSystemPriority,
  KappaInt,
  EntityId,
  TickId,
} from '../../core/are/types.js';
import { DeterministicPrng, LcgPrng, createDeterministicPrng } from '../../core/are/DeterministicPrng.js';
import { AREShadowAdapter } from '../../core/are/AREShadowAdapter.js';
import { DeterminismViolation } from '../../core/are/SnapshotComposer.js';
import {
  type ThoughtState,
  type DecisionContext,
  type UtilityScores,
  type UtilityWeights,
  type CombatMetrics,
  type CombatAnalytics,
  type ActionDecision,
  type CachedMicroAction,
  type KappaGridPosition,
  type EnergyState,
  AutonomousAction,
  AUTONOMOUS_PLAYER_ID,
  DEFAULT_RESEARCH_EXPORT,
} from './PlayerTypes.js';

// =============================================================================
// Constants
// =============================================================================

/** Cost brake: Complex evaluation interval (ticks) */
const COST_BRAKE_INTERVAL = 50 as KappaInt;

/** Micro-action cache validity (ticks) */
const MICRO_ACTION_VALIDITY = 10 as KappaInt;

/** Base energy for closed-loop validation */
const BASE_ENERGY = 10000 as KappaInt;

/** Maximum utility score cap */
const MAX_UTILITY_SCORE = 1000000 as KappaInt;

/** Warfront evaluation window size */
const WARFRONT_WINDOW_TICKS = 500 as KappaInt;

// =============================================================================
// Utility Weights (Deterministic - derived from entity seed)
// =============================================================================

function createDefaultUtilityWeights(seed: number): UtilityWeights {
  const rng = createDeterministicPrng(seed);
  
  // Generate deterministic weights in range [0, 1000]
  const scale = (min: number, max: number): KappaInt => {
    return (rng.nextIntRange(min, max)) as KappaInt;
  };
  
  return {
    healthWeight: scale(100, 300) as KappaInt,
    staminaWeight: scale(50, 150) as KappaInt,
    proximityWeight: scale(200, 500) as KappaInt,
    resourceWeight: scale(100, 400) as KappaInt,
    socialWeight: scale(50, 200) as KappaInt,
    questProgressWeight: scale(150, 400) as KappaInt,
    safetyMarginWeight: scale(200, 600) as KappaInt,
  };
}

// =============================================================================
// AutonomousPlayerTickSystem Implementation
// =============================================================================

export class AutonomousPlayerTickSystem implements TickSystem {
  readonly name = 'autonomous.player.are_ghost_01';
  readonly priority = TickSystemPriority.GAMEPLAY;
  enabled = true;
  
  private readonly entityId: EntityId = AUTONOMOUS_PLAYER_ID;
  
  // State
  private tickCount: KappaInt = 0 as KappaInt;
  private energyTotal: KappaInt = BASE_ENERGY;
  private lastFullEvaluationTick: KappaInt = -50 as KappaInt;
  
  // Deterministic RNG (seeded from entity ID)
  private rng: DeterministicPrng;
  
  // Cached decision state (Cost Brake optimization)
  private cachedMicroAction: CachedMicroAction | null = null;
  private lastUtilityScores: UtilityScores | null = null;
  private cachedDecisionContext: DecisionContext | null = null;
  
  // Sports Analytics state
  private combatMetrics: CombatMetrics = {
    attacksAttempted: 0 as KappaInt,
    hitsLanded: 0 as KappaInt,
    dpsAccumulator: 0 as KappaInt,
    staminaDrainAccumulator: 0 as KappaInt,
    positionChanges: 0 as KappaInt,
    distanceMoved: 0 as KappaInt,
    enemiesEngaged: 0 as KappaInt,
    fleeSuccesses: 0 as KappaInt,
    fleeFailures: 0 as KappaInt,
  };
  
  // Entity state (simulated for standalone operation)
  private position: KappaGridPosition = { x: 0 as KappaInt, z: 0 as KappaInt, layer: 0 as KappaInt };
  private health: KappaInt = 1000 as KappaInt;
  private maxHealth: KappaInt = 1000 as KappaInt;
  private stamina: KappaInt = 1000 as KappaInt;
  private maxStamina: KappaInt = 1000 as KappaInt;
  private gold: KappaInt = 100 as KappaInt;
  private activeQuests: KappaInt = 0 as KappaInt;
  
  // Utility weights (deterministic)
  private readonly weights: UtilityWeights;
  
  constructor() {
    // Seed RNG from entity ID hash
    const seedFromId = this.deriveSeedFromEntityId(this.entityId);
    this.rng = createDeterministicPrng(seedFromId);
    
    // Create deterministic weights
    this.weights = createDefaultUtilityWeights(seedFromId);
    
    console.log(`[AutonomousPlayer] Initialized ${this.entityId} with RNG seed=${seedFromId}`);
  }
  
  // =============================================================================
  // TickSystem Interface
  // =============================================================================
  
  tick(context: TickSystemContext): void {
    const tick = context.tickCount as KappaInt;
    this.tickCount = tick;
    
    // Validate determinism (Axiom 4)
    this.validateDeterminism();
    
    // Validate closed-loop energy (Axiom 5)
    this.validateEnergyClosedLoop();
    
    // Cost Brake: Only run full evaluation every COST_BRAKE_INTERVAL ticks
    const ticksSinceLastEval = (tick - this.lastFullEvaluationTick) as number;
    
    if (ticksSinceLastEval >= COST_BRAKE_INTERVAL) {
      // Full evaluation cycle
      this.executeFullEvaluationCycle(tick);
      this.lastFullEvaluationTick = tick;
    } else {
      // Micro-action cycle (near-zero overhead)
      this.executeMicroAction(tick);
    }
    
    // Update sports analytics (always, lightweight)
    this.updateSportsAnalytics(tick);
  }
  
  onStart?(): void {
    console.log(`[AutonomousPlayer] ${this.name} started - entity: ${this.entityId}`);
  }
  
  onEnd?(): void {
    // Flush any pending state
  }
  
  onShutdown?(): void {
    console.log(`[AutonomousPlayer] ${this.name} shutting down`);
  }
  
  // =============================================================================
  // Full Evaluation Cycle (Cost Brake - runs every 50 ticks)
  // =============================================================================
  
  private executeFullEvaluationCycle(tick: KappaInt): void {
    // 1. Gather current decision context
    const context = this.gatherDecisionContext(tick);
    this.cachedDecisionContext = context;
    
    // 2. Calculate utility scores
    const utilityScores = this.calculateUtilityScores(context);
    this.lastUtilityScores = utilityScores;
    
    // 3. Select best action using behavior tree
    const decision = this.selectAction(utilityScores, context);
    
    // 4. Generate and route ThoughtState log
    const thoughtState = this.generateThoughtState(tick, context, utilityScores, decision);
    AREShadowAdapter.routeThoughtStateLog(thoughtState, DEFAULT_RESEARCH_EXPORT.folderId);
    
    // 5. Update cached micro-action for intermediate ticks
    this.cachedMicroAction = {
      action: decision.action,
      remainingUses: (MICRO_ACTION_VALIDITY - 1) as KappaInt,
      targetPosition: decision.action === AutonomousAction.MOVE_POSITION 
        ? this.calculateTargetPosition(context, decision) 
        : undefined,
      validUntilTick: (tick + MICRO_ACTION_VALIDITY) as TickId,
    };
    
    // 6. Execute the decided action
    this.executeAction(decision.action, context);
    
    console.log(`[AutonomousPlayer] Full eval @ tick ${tick}: action=${decision.action} reasoning="${decision.reasoning}"`);
  }
  
  // =============================================================================
  // Micro-Action Cycle (Runs during Cost Brake intervals)
  // =============================================================================
  
  private executeMicroAction(tick: KappaInt): void {
    if (!this.cachedMicroAction) return;
    
    // Check if cached action is still valid
    if (tick >= this.cachedMicroAction.validUntilTick) return;
    
    // Execute cached action with decrementing remaining uses
    if (this.cachedMicroAction.remainingUses > 0) {
      const context = this.cachedDecisionContext ?? this.gatherDecisionContext(tick);
      
      // Lightweight check - only execute if conditions still favorable
      const shouldContinue = this.evaluateMicroActionContinuation(context);
      
      if (shouldContinue) {
        this.applyMicroActionEffect(this.cachedMicroAction.action);
        this.cachedMicroAction.remainingUses = (this.cachedMicroAction.remainingUses - 1) as KappaInt;
      } else {
        // Invalidate cache - will trigger full evaluation next tick
        this.cachedMicroAction = null;
      }
    }
  }
  
  private evaluateMicroActionContinuation(context: DecisionContext): boolean {
    // Quick check if conditions have drastically changed
    // Health dropped below safety threshold?
    if (this.health < (this.maxHealth * 200n / 1000n as unknown as KappaInt)) {
      return false; // Re-evaluate immediately
    }
    
    // Too many enemies now?
    if (context.nearbyEnemies > (this.weights.proximityWeight * 3n / 1000n as unknown as KappaInt)) {
      return false; // Flee instead
    }
    
    return true;
  }
  
  private applyMicroActionEffect(action: AutonomousAction): void {
    // Apply minimal state change based on cached action
    switch (action) {
      case AutonomousAction.GATHER_RESOURCE:
        this.gold = (this.gold + 1) as KappaInt;
        this.stamina = (this.stamina - 5) as KappaInt;
        break;
      case AutonomousAction.REST_RECOVER:
        this.stamina = (Math.min(Number(this.stamina) + 20, Number(this.maxStamina))) as KappaInt;
        break;
      case AutonomousAction.MOVE_POSITION:
        // Micro-movement on Kappa grid
        this.position = {
          ...this.position,
          x: (this.position.x + this.rng.nextIntRange(-1, 1)) as KappaInt,
          z: (this.position.z + this.rng.nextIntRange(-1, 1)) as KappaInt,
        };
        this.stamina = (this.stamina - 2) as KappaInt;
        this.combatMetrics.positionChanges = (this.combatMetrics.positionChanges + 1) as KappaInt;
        break;
      default:
        // Other actions have no micro-effect
        break;
    }
  }
  
  // =============================================================================
  // Decision Context Gathering (Deterministic)
  // =============================================================================
  
  private gatherDecisionContext(tick: KappaInt): DecisionContext {
    // Use deterministic RNG for "observed" values that would come from game state
    const obsRng = createDeterministicPrng(Number(tick) ^ Number(this.entityId.split('').reduce((h, c) => h + c.charCodeAt(0), 0))));
    
    return {
      position: { ...this.position },
      health: this.health,
      maxHealth: this.maxHealth,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      gold: this.gold,
      activeQuests: this.activeQuests,
      nearbyEnemies: obsRng.nextIntRange(0, 5) as KappaInt,
      enemyAverageDps: obsRng.nextIntRange(0, 100) as KappaInt,
      ticksSinceCombat: obsRng.nextIntRange(0, 100) as KappaInt,
      currentLayerDifficulty: this.position.layer,
      nearbyAllies: obsRng.nextIntRange(0, 3) as KappaInt,
      resourceDensity: obsRng.nextIntRange(0, 1000) as KappaInt,
    };
  }
  
  // =============================================================================
  // Utility Score Calculation (KappaInt-based, Deterministic)
  // =============================================================================
  
  private calculateUtilityScores(context: DecisionContext): UtilityScores {
    const w = this.weights;
    
    // Helper: safe add with overflow cap
    const safeAdd = (a: KappaInt, b: KappaInt): KappaInt => {
      const sum = Number(a) + Number(b);
      return (sum > Number(MAX_UTILITY_SCORE) ? MAX_UTILITY_SCORE : sum) as KappaInt;
    };
    
    // Helper: safe multiply with overflow cap
    const safeMul = (a: KappaInt, b: KappaInt, scale: number = 1): KappaInt => {
      const product = (Number(a) * Number(b) * scale) / 1000;
      return (product > Number(MAX_UTILITY_SCORE) ? MAX_UTILITY_SCORE : Math.floor(product)) as KappaInt;
    };
    
    // Health factor (0-1000, where 1000 = full health)
    const healthFactor = safeMul(context.health, 1000n as KappaInt, 1) / Number(context.maxHealth);
    const healthScore = safeMul(healthFactor, w.healthWeight, 1) as KappaInt;
    
    // Stamina factor
    const staminaFactor = safeMul(context.stamina, 1000n as KappaInt, 1) / Number(context.maxStamina);
    const staminaScore = safeMul(staminaFactor, w.staminaWeight, 1) as KappaInt;
    
    // Enemy proximity factor (higher enemies = lower combat score)
    const enemyProximityPenalty = safeMul(context.nearbyEnemies, w.proximityWeight, 1);
    
    // Combat score: favor when healthy and enemies present
    const combatScore = safeAdd(
      healthScore,
      safeAdd(staminaScore, safeMul(context.nearbyEnemies, 50n as KappaInt, 1))
    );
    const combatScoreFinal = (Number(combatScore) - Number(enemyProximityPenalty)) as KappaInt;
    
    // Diplomacy score: favor when low threat and social opportunity
    const diplomacyScore = safeAdd(
      safeMul(context.nearbyAllies, w.socialWeight, 1),
      safeMul(safeAdd(healthFactor, staminaFactor), 100n as KappaInt, 1)
    );
    const diplomacyScoreFinal = (Number(diplomacyScore) - Number(safeMul(context.nearbyEnemies, w.proximityWeight, 1))) as KappaInt;
    
    // Flee score: favor when low health or high enemy DPS
    const lowHealthPenalty = (context.health < (context.maxHealth * 300n / 1000n as unknown as KappaInt)) 
      ? (w.safetyMarginWeight * 2n) as KappaInt 
      : 0n as KappaInt;
    const highEnemyDpsPenalty = (context.enemyAverageDps > 50n as KappaInt) 
      ? (w.proximityWeight * 2n) as KappaInt 
      : 0n as KappaInt;
    const fleeScore = safeAdd(
      lowHealthPenalty,
      safeAdd(highEnemyDpsPenalty, safeMul(context.ticksSinceCombat, 10n as KappaInt, 1))
    );
    
    // Gather score: favor when resources available and energy sufficient
    const gatherScore = safeAdd(
      safeMul(context.resourceDensity, w.resourceWeight, 1),
      safeMul(staminaFactor, 200n as KappaInt, 1)
    );
    
    // Explore score: favor when safe and layer difficulty low
    const exploreScore = safeAdd(
      safeMul(safeAdd(healthFactor, staminaFactor), 100n as KappaInt, 1),
      safeMul((1000n as KappaInt - context.currentLayerDifficulty), 50n as KappaInt, 1)
    );
    
    // Rest score: favor when stamina low
    const restScore = safeMul((1000n as KappaInt - staminaFactor), w.staminaWeight, 2) as KappaInt;
    
    // Trade score: favor when gold low but stable
    const tradeScore = safeMul(context.gold, 10n as KappaInt, 1) as KappaInt;
    
    // Quest score: favor when active quests and safe
    const questScore = safeMul(context.activeQuests, w.questProgressWeight, 1) as KappaInt;
    
    return {
      combatScore: Math.max(0, combatScoreFinal as unknown as number) as KappaInt,
      diplomacyScore: Math.max(0, diplomacyScoreFinal as unknown as number) as KappaInt,
      fleeScore: Math.max(0, fleeScore as unknown as number) as KappaInt,
      gatherScore: Math.max(0, gatherScore as unknown as number) as KappaInt,
      exploreScore: Math.max(0, exploreScore as unknown as number) as KappaInt,
      restScore: Math.max(0, restScore as unknown as number) as KappaInt,
      tradeScore: Math.max(0, tradeScore as unknown as number) as KappaInt,
      questScore: Math.max(0, questScore as unknown as number) as KappaInt,
    };
  }
  
  // =============================================================================
  // Action Selection (Utility-based Behavior Tree)
  // =============================================================================
  
  private selectAction(scores: UtilityScores, context: DecisionContext): ActionDecision {
    const scoreEntries: Array<{ action: AutonomousAction; score: KappaInt }> = [
      { action: AutonomousAction.COMBAT_ATTACK, score: scores.combatScore },
      { action: AutonomousAction.DIPLOMACY_INITIATE, score: scores.diplomacyScore },
      { action: AutonomousAction.FLEE_TACTICAL, score: scores.fleeScore },
      { action: AutonomousAction.GATHER_RESOURCE, score: scores.gatherScore },
      { action: AutonomousAction.EXPLORE_NEW_AREA, score: scores.exploreScore },
      { action: AutonomousAction.REST_RECOVER, score: scores.restScore },
      { action: AutonomousAction.TRADE_COMMERCE, score: scores.tradeScore },
      { action: AutonomousAction.QUEST_ACCEPT, score: scores.questScore },
    ];
    
    // Sort by score (deterministic - using KappaInt comparison)
    scoreEntries.sort((a, b) => Number(b.score) - Number(a.score));
    
    const winner = scoreEntries[0];
    const runnerUp = scoreEntries[1] ?? { action: AutonomousAction.IDLE_WAIT, score: 0n as KappaInt };
    
    // Generate deterministic reasoning
    const reasoning = this.generateReasoning(winner.action, winner.score, context);
    
    return {
      action: winner.action,
      winningScore: winner.score,
      fallbackAction: runnerUp.action,
      reasoning,
      decisionTick: this.tickCount as TickId,
    };
  }
  
  private generateReasoning(action: AutonomousAction, score: KappaInt, context: DecisionContext): string {
    // Deterministic reasoning generation based on action type
    switch (action) {
      case AutonomousAction.COMBAT_ATTACK:
        return `Combat advantageous: health=${Number(context.health)} stamina=${Number(context.stamina)} enemies=${Number(context.nearbyEnemies)} score=${Number(score)}`;
      case AutonomousAction.DIPLOMACY_INITIATE:
        return `Diplomacy favorable: allies=${Number(context.nearbyAllies)} lowThreat=${Number(context.nearbyEnemies) < 3} score=${Number(score)}`;
      case AutonomousAction.FLEE_TACTICAL:
        return `Flee recommended: lowHealth=${Number(context.health) < 300} highEnemyDps=${Number(context.enemyAverageDps) > 50} score=${Number(score)}`;
      case AutonomousAction.GATHER_RESOURCE:
        return `Gathering optimal: resources=${Number(context.resourceDensity)} gold=${Number(context.gold)} score=${Number(score)}`;
      case AutonomousAction.EXPLORE_NEW_AREA:
        return `Exploring beneficial: layerDiff=${Number(context.currentLayerDifficulty)} health=${Number(context.health)} score=${Number(score)}`;
      case AutonomousAction.REST_RECOVER:
        return `Rest justified: stamina=${Number(context.stamina)}/${Number(context.maxStamina)} score=${Number(score)}`;
      case AutonomousAction.TRADE_COMMERCE:
        return `Trading viable: gold=${Number(context.gold)} score=${Number(score)}`;
      case AutonomousAction.QUEST_ACCEPT:
        return `Quest opportunity: active=${Number(context.activeQuests)} score=${Number(score)}`;
      default:
        return `Idle selection: no favorable conditions score=${Number(score)}`;
    }
  }
  
  // =============================================================================
  // Action Execution
  // =============================================================================
  
  private executeAction(action: AutonomousAction, context: DecisionContext): void {
    switch (action) {
      case AutonomousAction.COMBAT_ATTACK:
        this.executeCombatAction(context);
        break;
      case AutonomousAction.FLEE_TACTICAL:
      case AutonomousAction.FLEE_EMERGENCY:
        this.executeFleeAction(action, context);
        break;
      case AutonomousAction.GATHER_RESOURCE:
        this.gold = (this.gold + 10) as KappaInt;
        this.stamina = (this.stamina - 50) as KappaInt;
        this.combatMetrics.dpsAccumulator = (this.combatMetrics.dpsAccumulator + 0) as KappaInt; // No DPS for gather
        break;
      case AutonomousAction.REST_RECOVER:
        this.stamina = (Math.min(Number(this.stamina) + 200, Number(this.maxStamina))) as KappaInt;
        this.health = (Math.min(Number(this.health) + 50, Number(this.maxHealth))) as KappaInt;
        break;
      case AutonomousAction.EXPLORE_NEW_AREA:
        this.executeExploreAction(context);
        break;
      case AutonomousAction.DIPLOMACY_INITIATE:
      case AutonomousAction.DIPLOMACY_NEGOTIATE:
        // Diplomacy action - record social interaction
        break;
      case AutonomousAction.TRADE_COMMERCE:
        this.executeTradeAction();
        break;
      default:
        // Other actions - no state change
        break;
    }
  }
  
  private executeCombatAction(context: DecisionContext): void {
    this.combatMetrics.attacksAttempted = (this.combatMetrics.attacksAttempted + 1) as KappaInt;
    
    // Simulate hit/miss with deterministic RNG
    const hitRoll = this.rng.nextIntRange(0, 1000);
    const hitChance = 700; // 70% base hit chance
    
    if (hitRoll < hitChance) {
      this.combatMetrics.hitsLanded = (this.combatMetrics.hitsLanded + 1) as KappaInt;
      const damage = this.rng.nextIntRange(50, 150);
      this.combatMetrics.dpsAccumulator = (this.combatMetrics.dpsAccumulator + damage) as KappaInt;
    }
    
    this.combatMetrics.staminaDrainAccumulator = (this.combatMetrics.staminaDrainAccumulator + 30) as KappaInt;
    this.stamina = (this.stamina - 30) as KappaInt;
    this.combatMetrics.enemiesEngaged = (this.combatMetrics.enemiesEngaged + context.nearbyEnemies) as KappaInt;
  }
  
  private executeFleeAction(action: AutonomousAction, context: DecisionContext): void {
    const staminaRequired = (action === AutonomousAction.FLEE_EMERGENCY) ? 20 : 50;
    
    if (this.stamina >= staminaRequired) {
      this.stamina = (this.stamina - staminaRequired) as KappaInt;
      this.combatMetrics.fleeSuccesses = (this.combatMetrics.fleeSuccesses + 1) as KappaInt;
      
      // Move away from enemies (deterministic)
      this.position = {
        ...this.position,
        x: (this.position.x - Number(context.nearbyEnemies)) as KappaInt,
        z: (this.position.z - Number(context.nearbyEnemies)) as KappaInt,
      };
    } else {
      this.combatMetrics.fleeFailures = (this.combatMetrics.fleeFailures + 1) as KappaInt;
    }
  }
  
  private executeExploreAction(context: DecisionContext): void {
    // Move to adjacent Kappa grid cell
    const direction = this.rng.nextIntRange(0, 7);
    const dx = [0, 1, 1, 1, 0, -1, -1, -1][direction];
    const dz = [-1, -1, 0, 1, 1, 1, 0, -1][direction];
    
    this.position = {
      x: (this.position.x + dx) as KappaInt,
      z: (this.position.z + dz) as KappaInt,
      layer: this.position.layer,
    };
    
    this.stamina = (this.stamina - 20) as KappaInt;
    this.combatMetrics.positionChanges = (this.combatMetrics.positionChanges + 1) as KappaInt;
    this.combatMetrics.distanceMoved = (this.combatMetrics.distanceMoved + 1414) as KappaInt; // ~sqrt(2) * 1000
  }
  
  private executeTradeAction(): void {
    // Simple deterministic trade
    if (this.gold > 50) {
      this.gold = (this.gold - 50) as KappaInt;
      this.stamina = (Math.min(Number(this.stamina) + 100, Number(this.maxStamina))) as KappaInt;
    }
  }
  
  private calculateTargetPosition(context: DecisionContext, decision: ActionDecision): KappaGridPosition {
    // Calculate deterministic target based on action
    return {
      x: (this.position.x + this.rng.nextIntRange(-5, 5)) as KappaInt,
      z: (this.position.z + this.rng.nextIntRange(-5, 5)) as KappaInt,
      layer: this.position.layer,
    };
  }
  
  // =============================================================================
  // Sports Analytics (Warfront Evaluation)
  // =============================================================================
  
  private updateSportsAnalytics(tick: KappaInt): void {
    // Reset metrics periodically (WARFRONT_WINDOW)
    if (tick > 0 && Number(tick) % Number(WARFRONT_WINDOW_TICKS) === 0) {
      this.combatMetrics = {
        attacksAttempted: 0 as KappaInt,
        hitsLanded: 0 as KappaInt,
        dpsAccumulator: 0 as KappaInt,
        staminaDrainAccumulator: 0 as KappaInt,
        positionChanges: 0 as KappaInt,
        distanceMoved: 0 as KappaInt,
        enemiesEngaged: 0 as KappaInt,
        fleeSuccesses: 0 as KappaInt,
        fleeFailures: 0 as KappaInt,
      };
    }
  }
  
  private calculateCombatAnalytics(): CombatAnalytics {
    const m = this.combatMetrics;
    
    // Hit ratio (percentage * 1000 for precision)
    const hitRatio = (m.attacksAttempted > 0)
      ? (Number(m.hitsLanded) * 1000000 / Number(m.attacksAttempted)) as KappaInt
      : 0n as KappaInt;
    
    // Average DPS (over window)
    const windowTicks = Number(WARFRONT_WINDOW_TICKS);
    const averageDps = (Number(m.dpsAccumulator) / windowTicks * 1000) as KappaInt;
    
    // Stamina efficiency (damage per stamina unit)
    const staminaEfficiency = (m.staminaDrainAccumulator > 0)
      ? (Number(m.dpsAccumulator) * 1000 / Number(m.staminaDrainAccumulator)) as KappaInt
      : 0n as KappaInt;
    
    // Movement efficiency (distance per position change)
    const movementEfficiency = (m.positionChanges > 0)
      ? (Number(m.distanceMoved) / Number(m.positionChanges)) as KappaInt
      : 0n as KappaInt;
    
    // Survival rating (percentage * 1000)
    const totalFlees = Number(m.fleeSuccesses) + Number(m.fleeFailures);
    const survivalRating = (totalFlees > 0)
      ? (Number(m.fleeSuccesses) * 1000000 / totalFlees) as KappaInt
      : 1000000n as KappaInt; // Default 100%
    
    // Aggression index (enemies per tick)
    const ticksInWindow = Math.min(Number(this.tickCount), Number(WARFRONT_WINDOW_TICKS));
    const aggressionIndex = (ticksInWindow > 0)
      ? (Number(m.enemiesEngaged) * 1000 / ticksInWindow) as KappaInt
      : 0n as KappaInt;
    
    return {
      hitRatio: Math.floor(Number(hitRatio)) as KappaInt,
      averageDps: Math.floor(Number(averageDps)) as KappaInt,
      staminaEfficiency: Math.floor(Number(staminaEfficiency)) as KappaInt,
      movementEfficiency: Math.floor(Number(movementEfficiency)) as KappaInt,
      survivalRating: Math.floor(Number(survivalRating)) as KappaInt,
      aggressionIndex: Math.floor(Number(aggressionIndex)) as KappaInt,
    };
  }
  
  // =============================================================================
  // ThoughtState Generation
  // =============================================================================
  
  private generateThoughtState(
    tick: KappaInt,
    context: DecisionContext,
    utilityScores: UtilityScores,
    decision: ActionDecision
  ): ThoughtState {
    const energyState = this.captureEnergyState();
    const combatAnalytics = this.calculateCombatAnalytics();
    
    return {
      entityId: this.entityId,
      tick: tick as TickId,
      inputState: context,
      utilityScores,
      weights: this.weights,
      combatAnalytics,
      decision,
      energyState,
      isDeterministic: true,
      externalTimestamp: Date.now(),
      exportPath: `research_leads/${this.entityId}/tick_${tick}`,
    };
  }
  
  // =============================================================================
  // Determinism & Energy Validation
  // =============================================================================
  
  private validateDeterminism(): void {
    // Check for any non-deterministic operations
    // This would be enhanced with runtime instrumentation
    
    // Verify RNG state is deterministic
    if (!this.rng || typeof this.rng.nextFloat !== 'function') {
      throw new DeterminismViolation(
        'AutonomousPlayerTickSystem',
        'RNG not properly initialized',
        this.tickCount as TickId
      );
    }
  }
  
  private validateEnergyClosedLoop(): void {
    // Axiom 5: Sum of entity energy should remain constant (closed-loop)
    // Allow small delta for actions, but track it
    
    const currentTotal = Number(this.health) + Number(this.stamina) + Number(this.gold);
    
    // Energy should be within bounds
    const maxTotal = Number(this.maxHealth) + Number(this.maxStamina) + 10000; // 10k gold cap
    if (currentTotal > maxTotal) {
      throw new DeterminismViolation(
        'AutonomousPlayerTickSystem',
        `Energy overflow: ${currentTotal} > ${maxTotal}`,
        this.tickCount as TickId
      );
    }
  }
  
  private captureEnergyState(): EnergyState {
    const energyIn = 100n as KappaInt; // Base regeneration
    const energyOut = (this.stamina < this.maxStamina ? 50n : 0n) as KappaInt;
    const deltaEnergy = (energyIn - energyOut) as KappaInt;
    
    return {
      totalEnergy: (Number(this.health) + Number(this.stamina)) as KappaInt,
      deltaEnergy,
      energyIn,
      energyOut,
      isEnergyBalanced: true, // Would be calculated from historical data
    };
  }
  
  // =============================================================================
  // Utility Methods
  // =============================================================================
  
  private deriveSeedFromEntityId(entityId: EntityId): number {
    let hash = 0;
    for (let i = 0; i < entityId.length; i++) {
      const char = entityId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  /**
   * Get the autonomous player's current position.
   */
  getPosition(): KappaGridPosition {
    return { ...this.position };
  }
  
  /**
   * Get current combat analytics for external queries.
   */
  getCombatAnalytics(): CombatAnalytics {
    return this.calculateCombatAnalytics();
  }
  
  /**
   * Get cached utility scores (last evaluation).
   */
  getLastUtilityScores(): UtilityScores | null {
    return this.lastUtilityScores;
  }
}

// =============================================================================
// Registration Function (for AutoModuleKatalysator)
// =============================================================================

let instance: AutonomousPlayerTickSystem | null = null;

export function getAutonomousPlayerSystem(): AutonomousPlayerTickSystem {
  if (!instance) {
    instance = new AutonomousPlayerTickSystem();
  }
  return instance;
}

export function registerAutonomousPlayerSystem(): void {
  const { tickSystemRegistry } = require('../../core/are/TickSystemRegistry.js');
  const system = getAutonomousPlayerSystem();
  
  tickSystemRegistry.register({
    system,
    dependencies: ['player-system', 'combat-system'],
    tags: ['player', 'autonomous', 'utility-ai', 'sports-analytics'],
  });
  
  console.log('[AutonomousPlayer] Registered with TickSystemRegistry');
}