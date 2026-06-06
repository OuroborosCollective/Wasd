/**
 * NPCDecisionEngine — Deterministic Utility-Based Decision Making
 * 
 * NPCs evaluate all possible actions and select the highest-scoring one.
 * All decisions are deterministic: same tick + same input = same output.
 * 
 * Decision flow:
 * 1. Gather candidates (all possible actions)
 * 2. Score each action based on context, memory, and personality
 * 3. Select highest-scoring action (with tie-breaker by alphabetical order)
 * 4. Return decision with reason and confidence
 */

import { stableHash32 } from "../../../core/determinism/AREDeterminism.js";
import type {
  NPCDecisionInput,
  NPCDecision,
  NPCActionType,
  NPCMemoryV3,
  NPCWorldSnapshot,
  NPCGoal,
  NPCRelation,
} from "./NPCMemoryV3.js";
import { calculateRelationScore, calculateThreatLevel } from "./NPCMemoryScoring.js";

/**
 * Stable string comparison using hash (deterministic replacement for localeCompare)
 */
function stableStringCompare(a: string, b: string): number {
  return stableHash32(a) - stableHash32(b);
}

// ============================================================================
// Decision Constants
// ============================================================================

const DECISION = {
  // Base scores for actions
  ATTACK_BASE: 20,
  FLEE_BASE: 25,
  TRADE_BASE: 15,
  WORK_BASE: 10,
  SOCIAL_BASE: 8,
  IDLE_BASE: 5,
  PATROL_BASE: 12,
  GATHER_BASE: 10,
  CRAFT_BASE: 10,
  EXPLORE_BASE: 7,
  DEFEND_BASE: 18,
  RAISE_ALARM_BASE: 22,
  HIRE_GUARD_BASE: 15,
  START_CARAVAN_BASE: 14,
  JOIN_GUILD_BASE: 12,
  VOTE_BASE: 10,
  MOVE_CITY_BASE: 8,
  TALK_BASE: 6,

  // Personality modifiers
  HIGH_COURAGE_MULTIPLIER: 1.5,
  HIGH_GREED_MULTIPLIER: 1.3,
  LOW_LOYALTY_THRESHOLD: 30,

  // Relation thresholds
  HOSTILE_THRESHOLD: -30,
  FRIENDLY_THRESHOLD: 30,
  FEAR_THRESHOLD: 60,

  // Context modifiers
  DANGER_MODIFIER: 0.8,
  LOW_HEALTH_THRESHOLD: 0.3,
  LOW_ENERGY_THRESHOLD: 0.3,
  HIGH_WEALTH_THRESHOLD: 80,

  // Goal priority weights
  GOAL_MATCH_BONUS: 15,
  GOAL_MISMATCH_PENALTY: 10,
};

// ============================================================================
// Score Calculation Functions
// ============================================================================

/**
 * Calculate action score based on context
 */
function scoreAction(
  baseScore: number,
  context: {
    memory: NPCMemoryV3;
    world: NPCWorldSnapshot;
    health: number;
    energy: number;
    gold: number;
    nearbyHostiles: number;
    nearbyFriendlies: number;
    threatLevel: number;
    safetyLevel: number;
  }
): number {
  let score = baseScore;

  // Health modifier
  if (context.health < DECISION.LOW_HEALTH_THRESHOLD) {
    score *= 0.5;
  }

  // Energy modifier
  if (context.energy < DECISION.LOW_ENERGY_THRESHOLD) {
    score *= 0.6;
  }

  // Personality: courage
  if (context.memory.identity.courage > 70) {
    score *= DECISION.HIGH_COURAGE_MULTIPLIER;
  }

  // Personality: greed
  if (context.memory.identity.greed > 70) {
    score *= DECISION.HIGH_GREED_MULTIPLIER;
  }

  // Danger level modifier
  score *= (1 - context.threatLevel * DECISION.DANGER_MODIFIER);

  // Safety requirement
  score *= context.safetyLevel;

  return Math.max(0, Math.trunc(score));
}

/**
 * Get top goal from memory
 */
function getTopGoal(memory: NPCMemoryV3): NPCGoal | undefined {
  if (memory.goals.length === 0) return undefined;
  
  return [...memory.goals]
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return stableStringCompare(a.id, b.id);
    })[0];
}

/**
 * Get hostile entities in nearby
 */
function getHostileEntities(
  input: NPCDecisionInput
): Array<{ id: string; name: string; position: { x: number; y: number } }> {
  return input.nearbyEntities.filter((e) => e.hostile);
}

/**
 * Get friendly entities in nearby
 */
function getFriendlyEntities(
  input: NPCDecisionInput
): Array<{ id: string; name: string; position: { x: number; y: number } }> {
  return input.nearbyEntities.filter((e) => !e.hostile);
}

/**
 * Check if NPC should flee from current threat
 */
function shouldFlee(input: NPCDecisionInput, threatLevel: number): boolean {
  const hostileCount = getHostileEntities(input).length;
  const npcFear = input.memory.identity.courage < 40;
  
  return (
    threatLevel > 0.5 ||
    (hostileCount > 2 && npcFear) ||
    input.health < 0.3
  );
}

// ============================================================================
// Action Scorers
// ============================================================================

/**
 * Score flee action
 */
function scoreFlee(input: NPCDecisionInput): NPCDecision | null {
  const hostiles = getHostileEntities(input);
  if (hostiles.length === 0) return null;

  const context = {
    memory: input.memory,
    world: input.world,
    health: input.health,
    energy: input.energy,
    gold: input.gold,
    nearbyHostiles: hostiles.length,
    nearbyFriendlies: getFriendlyEntities(input).length,
    threatLevel: calculateThreatLevel([], input.npcId),
    safetyLevel: 0.5,
  };

  // Calculate distance to safe zone (simplified)
  const nearestHostile = hostiles[0];
  const distanceScore = nearestHostile
    ? Math.max(0, 50 - Math.sqrt(
        Math.pow(nearestHostile.position.x - input.position.x, 2) +
        Math.pow(nearestHostile.position.y - input.position.y, 2)
      ))
    : 0;

  const baseScore = DECISION.FLEE_BASE + distanceScore;
  const finalScore = scoreAction(baseScore, context);

  return {
    action: "flee",
    targetId: nearestHostile?.id,
    reason: `flee_from:${hostiles.length}:hostiles`,
    score: finalScore,
    confidence: 0.8,
  };
}

/**
 * Score attack action
 */
function scoreAttack(input: NPCDecisionInput): NPCDecision | null {
  const hostiles = getHostileEntities(input);
  if (hostiles.length === 0) return null;

  // High courage required for attack
  if (input.memory.identity.courage < 50) return null;

  const context = {
    memory: input.memory,
    world: input.world,
    health: input.health,
    energy: input.energy,
    gold: input.gold,
    nearbyHostiles: hostiles.length,
    nearbyFriendlies: getFriendlyEntities(input).length,
    threatLevel: calculateThreatLevel([], input.npcId),
    safetyLevel: 0.7,
  };

  // Check combat memory - avoid enemies that hurt us before
  const avoidedEnemies = input.memory.combat.avoidedEnemies;
  const safeHostiles = hostiles.filter((h) => !avoidedEnemies.includes(h.id));

  if (safeHostiles.length === 0) return null;

  const baseScore = DECISION.ATTACK_BASE - hostiles.length * 3;
  const finalScore = scoreAction(baseScore, context);

  return {
    action: "attack",
    targetId: safeHostiles[0]?.id,
    reason: `attack:${safeHostiles[0]?.name ?? "unknown"}`,
    score: finalScore,
    confidence: 0.7,
  };
}

/**
 * Score defend action (guard, protect)
 */
function scoreDefend(input: NPCDecisionInput): NPCDecision | null {
  // Only guards and soldiers should defend
  const validRoles = ["guard", "soldier", "knight", "watchman", "protector"];
  if (!validRoles.includes(input.memory.identity.role.toLowerCase())) {
    return null;
  }

  const hostiles = getHostileEntities(input);
  const friendlies = getFriendlyEntities(input);

  // Defend if there are friendlies to protect
  if (friendlies.length === 0 && hostiles.length === 0) return null;

  const context = {
    memory: input.memory,
    world: input.world,
    health: input.health,
    energy: input.energy,
    gold: input.gold,
    nearbyHostiles: hostiles.length,
    nearbyFriendlies: friendlies.length,
    threatLevel: input.world.dangerLevel,
    safetyLevel: 0.8,
  };

  const baseScore = DECISION.DEFEND_BASE + friendlies.length * 5;
  const finalScore = scoreAction(baseScore, context);

  return {
    action: "defend",
    targetId: friendlies[0]?.id,
    reason: `defend:${friendlies[0]?.name ?? "area"}`,
    score: finalScore,
    confidence: 0.85,
  };
}

/**
 * Score trade action
 */
function scoreTrade(input: NPCDecisionInput): NPCDecision | null {
  // Merchants and traders prefer trading
  const merchantRoles = ["merchant", "trader", "shopkeeper", "vendor"];
  const isMerchant = merchantRoles.some((r) => 
    input.memory.identity.profession.toLowerCase().includes(r) ||
    input.memory.identity.role.toLowerCase().includes(r)
  );

  const context = {
    memory: input.memory,
    world: input.world,
    health: input.health,
    energy: input.energy,
    gold: input.gold,
    nearbyHostiles: getHostileEntities(input).length,
    nearbyFriendlies: getFriendlyEntities(input).length,
    threatLevel: input.world.dangerLevel,
    safetyLevel: 0.9,
  };

  let baseScore = DECISION.TRADE_BASE;
  
  // Merchants get bonus
  if (isMerchant) {
    baseScore *= 1.5;
  }

  // Low gold increases trade desire
  if (input.gold < 20) {
    baseScore *= 1.3;
  }

  // High gold decreases trade desire
  if (input.gold > DECISION.HIGH_WEALTH_THRESHOLD) {
    baseScore *= 0.7;
  }

  // Check market prices
  const avgPrice = Object.values(input.world.marketPrices).reduce((a, b) => a + b, 0) / 
    Math.max(1, Object.keys(input.world.marketPrices).length);
  if (avgPrice > 50) {
    baseScore *= 1.2; // Good prices = more trading
  }

  const finalScore = scoreAction(baseScore, context);

  return {
    action: "trade",
    reason: isMerchant ? "merchant_trade" : "seeking_trade",
    score: finalScore,
    confidence: isMerchant ? 0.9 : 0.6,
  };
}

/**
 * Score work action
 */
function scoreWork(input: NPCDecisionInput): NPCDecision | null {
  // Everyone can work, but it's baseline
  const context = {
    memory: input.memory,
    world: input.world,
    health: input.health,
    energy: input.energy,
    gold: input.gold,
    nearbyHostiles: getHostileEntities(input).length,
    nearbyFriendlies: getFriendlyEntities(input).length,
    threatLevel: input.world.dangerLevel,
    safetyLevel: 0.8,
  };

  // Low energy = less work
  if (input.energy < DECISION.LOW_ENERGY_THRESHOLD) {
    return null;
  }

  // High wealth = less work motivation
  const baseScore = input.gold > DECISION.HIGH_WEALTH_THRESHOLD 
    ? DECISION.WORK_BASE * 0.5 
    : DECISION.WORK_BASE;

  const finalScore = scoreAction(baseScore, context);

  return {
    action: "work",
    reason: `work_in:${input.memory.identity.homeRegionId}`,
    score: finalScore,
    confidence: 0.7,
  };
}

/**
 * Score patrol action
 */
function scorePatrol(input: NPCDecisionInput): NPCDecision | null {
  // Guards and soldiers patrol
  const validRoles = ["guard", "soldier", "watchman", "ranger", "knight"];
  if (!validRoles.some((r) => input.memory.identity.role.toLowerCase().includes(r))) {
    return null;
  }

  const context = {
    memory: input.memory,
    world: input.world,
    health: input.health,
    energy: input.energy,
    gold: input.gold,
    nearbyHostiles: getHostileEntities(input).length,
    nearbyFriendlies: getFriendlyEntities(input).length,
    threatLevel: input.world.dangerLevel,
    safetyLevel: 0.7,
  };

  // High danger = more patrol urgency
  const baseScore = DECISION.PATROL_BASE + input.world.dangerLevel * 10;

  const finalScore = scoreAction(baseScore, context);

  return {
    action: "patrol",
    reason: `patrol:${input.memory.identity.homeRegionId}`,
    score: finalScore,
    confidence: 0.8,
  };
}

/**
 * Score social action
 */
function scoreSocial(input: NPCDecisionInput): NPCDecision | null {
  const friendlies = getFriendlyEntities(input);
  if (friendlies.length === 0) return null;

  const context = {
    memory: input.memory,
    world: input.world,
    health: input.health,
    energy: input.energy,
    gold: input.gold,
    nearbyHostiles: getHostileEntities(input).length,
    nearbyFriendlies: friendlies.length,
    threatLevel: input.world.dangerLevel,
    safetyLevel: 0.9,
  };

  const baseScore = DECISION.SOCIAL_BASE + friendlies.length * 2;
  const finalScore = scoreAction(baseScore, context);

  return {
    action: "social",
    targetId: friendlies[0]?.id,
    reason: `socialize_with:${friendlies[0]?.name ?? "unknown"}`,
    score: finalScore,
    confidence: 0.6,
  };
}

/**
 * Score explore action
 */
function scoreExplore(input: NPCDecisionInput): NPCDecision | null {
  // Only if not too dangerous
  if (input.world.dangerLevel > 0.5) return null;

  const context = {
    memory: input.memory,
    world: input.world,
    health: input.health,
    energy: input.energy,
    gold: input.gold,
    nearbyHostiles: getHostileEntities(input).length,
    nearbyFriendlies: getFriendlyEntities(input).length,
    threatLevel: input.world.dangerLevel,
    safetyLevel: 0.6,
  };

  const baseScore = DECISION.EXPLORE_BASE;
  const finalScore = scoreAction(baseScore, context);

  return {
    action: "explore",
    reason: `explore_region:${input.world.regionId}`,
    score: finalScore,
    confidence: 0.5,
  };
}

/**
 * Score raise alarm action
 */
function scoreRaiseAlarm(input: NPCDecisionInput): NPCDecision | null {
  const hostiles = getHostileEntities(input);
  
  // Only raise alarm if there's a real threat
  if (hostiles.length === 0) return null;

  // Guards and soldiers can raise alarm
  const validRoles = ["guard", "soldier", "watchman", "knight", "town_crier"];
  if (!validRoles.some((r) => input.memory.identity.role.toLowerCase().includes(r))) {
    return null;
  }

  const context = {
    memory: input.memory,
    world: input.world,
    health: input.health,
    energy: input.energy,
    gold: input.gold,
    nearbyHostiles: hostiles.length,
    nearbyFriendlies: getFriendlyEntities(input).length,
    threatLevel: 1,
    safetyLevel: 0.9,
  };

  const baseScore = DECISION.RAISE_ALARM_BASE + hostiles.length * 5;
  const finalScore = scoreAction(baseScore, context);

  return {
    action: "raise_alarm",
    reason: `alarm:${hostiles.length}:hostiles_detected`,
    score: finalScore,
    confidence: 0.95,
  };
}

/**
 * Score hire guard action
 */
function scoreHireGuard(input: NPCDecisionInput): NPCDecision | null {
  // Only if scared and have gold
  if (input.gold < 30) return null;

  // Check fear level from relations
  const avgFear = Object.values(input.memory.relations)
    .reduce((sum, r) => sum + r.fear, 0) / Math.max(1, Object.keys(input.memory.relations).length);

  if (avgFear < DECISION.FEAR_THRESHOLD) return null;

  const context = {
    memory: input.memory,
    world: input.world,
    health: input.health,
    energy: input.energy,
    gold: input.gold,
    nearbyHostiles: getHostileEntities(input).length,
    nearbyFriendlies: getFriendlyEntities(input).length,
    threatLevel: input.world.dangerLevel,
    safetyLevel: 0.5,
  };

  const baseScore = DECISION.HIRE_GUARD_BASE + avgFear / 10;
  const finalScore = scoreAction(baseScore, context);

  return {
    action: "hire_guard",
    reason: `hire_guard:fear:${avgFear.toFixed(0)}`,
    score: finalScore,
    confidence: 0.7,
  };
}

/**
 * Score idle action (default fallback)
 */
function scoreIdle(input: NPCDecisionInput): NPCDecision {
  const context = {
    memory: input.memory,
    world: input.world,
    health: input.health,
    energy: input.energy,
    gold: input.gold,
    nearbyHostiles: getHostileEntities(input).length,
    nearbyFriendlies: getFriendlyEntities(input).length,
    threatLevel: input.world.dangerLevel,
    safetyLevel: 0.6,
  };

  const baseScore = DECISION.IDLE_BASE;
  const finalScore = scoreAction(baseScore, context);

  return {
    action: "idle",
    reason: "no_better_action_available",
    score: finalScore,
    confidence: 0.3,
  };
}

// ============================================================================
// Main Decision Function
// ============================================================================

/**
 * Decide NPC action deterministically
 */
export function decideNPCAction(input: NPCDecisionInput): NPCDecision {
  const candidates: NPCDecision[] = [];

  // Collect all possible action candidates
  const actions = [
    scoreFlee,
    scoreAttack,
    scoreDefend,
    scoreTrade,
    scoreWork,
    scorePatrol,
    scoreSocial,
    scoreExplore,
    scoreRaiseAlarm,
    scoreHireGuard,
  ];

  for (const scorer of actions) {
    const decision = scorer(input);
    if (decision) {
      candidates.push(decision);
    }
  }

  // Add idle as fallback
  candidates.push(scoreIdle(input));

  // Sort by score (descending), then by action name (ascending) for determinism
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return stableStringCompare(a.action, b.action);
  });

  // Return highest scoring action
  return candidates[0] ?? {
    action: "idle",
    reason: "fallback",
    score: 0,
    confidence: 0,
  };
}

/**
 * Get decision context for scoring
 */
export function buildDecisionContext(input: NPCDecisionInput): {
  memory: NPCMemoryV3;
  world: NPCWorldSnapshot;
  health: number;
  energy: number;
  gold: number;
  nearbyHostiles: number;
  nearbyFriendlies: number;
  threatLevel: number;
  safetyLevel: number;
} {
  return {
    memory: input.memory,
    world: input.world,
    health: input.health,
    energy: input.energy,
    gold: input.gold,
    nearbyHostiles: input.nearbyEntities.filter((e) => e.hostile).length,
    nearbyFriendlies: input.nearbyEntities.filter((e) => !e.hostile).length,
    threatLevel: calculateThreatLevel([], input.npcId),
    safetyLevel: 0.7,
  };
}

/**
 * Apply learning from action outcome
 */
export function applyActionOutcome(
  memory: NPCMemoryV3,
  action: NPCActionType,
  contextKey: string,
  outcomeScore: number,
  tick: number
): NPCMemoryV3 {
  const actionKey = `action:${action}`;
  
  const oldActionScore = memory.learning.actionScores[actionKey] ?? 0;
  const oldContextScore = memory.learning.contextScores[contextKey] ?? 0;

  // Exponential moving average with 0.85 retention
  const nextActionScore = Math.trunc(oldActionScore * 0.85 + outcomeScore * 0.15);
  const nextContextScore = Math.trunc(oldContextScore * 0.85 + outcomeScore * 0.15);

  const updatedLearning = {
    ...memory.learning,
    actionScores: {
      ...memory.learning.actionScores,
      [actionKey]: nextActionScore,
    },
    contextScores: {
      ...memory.learning.contextScores,
      [contextKey]: nextContextScore,
    },
    successfulActions: outcomeScore > 0
      ? {
          ...memory.learning.successfulActions,
          [actionKey]: (memory.learning.successfulActions[actionKey] ?? 0) + 1,
        }
      : memory.learning.successfulActions,
    failedActions: outcomeScore < 0
      ? {
          ...memory.learning.failedActions,
          [actionKey]: (memory.learning.failedActions[actionKey] ?? 0) + 1,
        }
      : memory.learning.failedActions,
    lastOutcomeTick: tick,
    totalActions: memory.learning.totalActions + 1,
    totalSuccesses: outcomeScore > 0 
      ? memory.learning.totalSuccesses + 1 
      : memory.learning.totalSuccesses,
  };

  return {
    ...memory,
    learning: updatedLearning,
  };
}

/**
 * Calculate outcome score from action result
 */
export function calculateOutcomeScore(
  action: NPCActionType,
  result: {
    success: boolean;
    damageDealt?: number;
    damageTaken?: number;
    goldGained?: number;
    goldSpent?: number;
    socialGain?: number;
  }
): number {
  let score = 0;

  if (result.success) score += 10;
  if (result.damageDealt) score += Math.min(5, result.damageDealt / 10);
  if (result.damageTaken) score -= Math.min(5, result.damageTaken / 10);
  if (result.goldGained) score += Math.min(5, result.goldGained / 20);
  if (result.goldSpent) score -= Math.min(3, result.goldSpent / 30);
  if (result.socialGain) score += Math.min(4, result.socialGain);

  return Math.max(-10, Math.min(10, score));
}

/**
 * Get best action for context based on learning
 */
export function getLearnedBestAction(
  memory: NPCMemoryV3,
  contextKey: string
): NPCActionType | null {
  const contextScore = memory.learning.contextScores[contextKey];
  if (contextScore === undefined) return null;

  // Find action with highest score
  let bestAction: NPCActionType | null = null;
  let bestScore = -Infinity;

  for (const [key, score] of Object.entries(memory.learning.actionScores)) {
    if (key.startsWith("action:")) {
      const action = key.slice(7) as NPCActionType;
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }
  }

  return bestAction;
}