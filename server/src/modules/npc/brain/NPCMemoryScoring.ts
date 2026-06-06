/**
 * NPCMemoryScoring — Deterministic Memory Importance Calculation
 * 
 * NPCs don't remember everything equally. This module calculates
 * how important each memory is based on:
 * - Personal relevance (was I involved?)
 * - Emotional weight (how impactful was it?)
 * - Recency (how fresh is this memory?)
 * - Repetition (has this happened before?)
 * - Faction relevance (is my faction involved?)
 * 
 * All calculations are deterministic and tick-based.
 */

import { stableHash32 } from "../../../core/determinism/AREDeterminism.js";
import type {
  NPCObservation,
  NPCMemoryV3,
  NPCEpisodicMemory,
  MemoryScore,
  NPCRelation,
  WorldMemoryEventType,
} from "./NPCMemoryV3.js";

// ============================================================================
// Score Calculation Constants
// ============================================================================

const SCORING = {
  // Personal relevance weights
  TARGET_SELF: 10,
  ACTOR_SELF: 8,
  HOME_REGION: 5,
  SAME_CITY: 4,
  SAME_FACTION: 3,
  OTHER: 1,

  // Emotional weight multiplier
  EMOTIONAL_MULTIPLIER: 2,

  // Recency decay rate (per tick)
  RECENCY_DECAY_RATE: 0.001,

  // Repetition bonus cap
  REPETITION_MAX_BONUS: 5,
  REPETITION_BONUS_PER_OCCURRENCE: 1,

  // Faction relevance bonus
  FACTION_MATCH_BONUS: 6,

  // Minimum score threshold for memory storage
  MIN_SCORE_THRESHOLD: 3,

  // Score normalization range
  MAX_SCORE: 100,
  MIN_SCORE: 0,
};

// ============================================================================
// Score Calculation
// ============================================================================

/**
 * Calculate the importance score for an observation for a specific NPC
 */
export function scoreMemory(
  observation: NPCObservation,
  npcMemory: NPCMemoryV3,
  currentTick: number
): MemoryScore {
  const npcId = npcMemory.identity.npcId;

  // Personal relevance
  const personalRelevance = calculatePersonalRelevance(observation, npcId, npcMemory);

  // Emotional weight (absolute impact value)
  const emotionalWeight = Math.abs(observation.impact);

  // Recency (higher for recent events)
  const recency = calculateRecency(observation.tick, currentTick);

  // Repetition (how many times has this type of event happened?)
  const repetition = calculateRepetition(observation, npcMemory);

  // Faction relevance
  const factionRelevance = calculateFactionRelevance(observation, npcMemory);

  // Final score calculation
  const finalScore = Math.min(
    SCORING.MAX_SCORE,
    Math.max(
      SCORING.MIN_SCORE,
      Math.trunc(
        personalRelevance * SCORING.EMOTIONAL_MULTIPLIER +
        emotionalWeight * SCORING.EMOTIONAL_MULTIPLIER +
        factionRelevance +
        Math.min(repetition * SCORING.REPETITION_BONUS_PER_OCCURRENCE, SCORING.REPETITION_MAX_BONUS) +
        recency * 2
      )
    )
  );

  return {
    importance: observation.impact,
    emotionalWeight,
    recency,
    repetition,
    personalRelevance,
    factionRelevance,
    finalScore,
  };
}

/**
 * Calculate personal relevance of an observation to an NPC
 */
function calculatePersonalRelevance(
  observation: NPCObservation,
  npcId: string,
  npcMemory: NPCMemoryV3
): number {
  // NPC is the target (highest relevance)
  if (observation.targetId === npcId) {
    return SCORING.TARGET_SELF;
  }

  // NPC is the actor (very high relevance)
  if (observation.actorId === npcId) {
    return SCORING.ACTOR_SELF;
  }

  // NPC's home region
  if (observation.regionId === npcMemory.identity.homeRegionId) {
    return SCORING.HOME_REGION;
  }

  // NPC's home city
  if (
    npcMemory.identity.homeCityId &&
    observation.cityId === npcMemory.identity.homeCityId
  ) {
    return SCORING.SAME_CITY;
  }

  // NPC's faction
  if (
    npcMemory.faction.factionId &&
    observation.factionId === npcMemory.faction.factionId
  ) {
    return SCORING.SAME_FACTION;
  }

  return SCORING.OTHER;
}

/**
 * Calculate recency score (more recent = higher score)
 */
function calculateRecency(tick: number, currentTick: number): number {
  const ticksAgo = currentTick - tick;
  
  // Very recent (within 100 ticks)
  if (ticksAgo <= 100) {
    return 10 - ticksAgo / 10;
  }
  
  // Recent (within 1000 ticks)
  if (ticksAgo <= 1000) {
    return 5 - (ticksAgo - 100) / 200;
  }
  
  // Older events decay
  return Math.max(0, 2 - (ticksAgo - 1000) / 1000);
}

/**
 * Calculate repetition score (how many similar events?)
 */
function calculateRepetition(
  observation: NPCObservation,
  npcMemory: NPCMemoryV3
): number {
  const count = npcMemory.episodic.filter(
    (mem) =>
      mem.type === observation.type &&
      mem.actorId === observation.actorId
  ).length;

  return count;
}

/**
 * Calculate faction relevance
 */
function calculateFactionRelevance(
  observation: NPCObservation,
  npcMemory: NPCMemoryV3
): number {
  if (
    observation.factionId &&
    observation.factionId === npcMemory.faction.factionId
  ) {
    return SCORING.FACTION_MATCH_BONUS;
  }
  return 0;
}

// ============================================================================
// Memory Filtering and Selection
// ============================================================================

/**
 * Check if observation should be stored as memory
 */
export function shouldStoreMemory(
  observation: NPCObservation,
  npcMemory: NPCMemoryV3,
  currentTick: number
): boolean {
  const score = scoreMemory(observation, npcMemory, currentTick);
  return score.finalScore >= SCORING.MIN_SCORE_THRESHOLD;
}

/**
 * Convert observation to episodic memory with score
 */
export function observationToEpisodic(
  observation: NPCObservation,
  npcMemory: NPCMemoryV3,
  currentTick: number
): NPCEpisodicMemory {
  const score = scoreMemory(observation, npcMemory, currentTick);
  
  return {
    id: observation.id,
    tick: observation.tick,
    type: observation.type,
    actorId: observation.actorId,
    actorName: observation.actorName,
    targetId: observation.targetId,
    targetName: observation.targetName,
    regionId: observation.regionId,
    cityId: observation.cityId,
    factionId: observation.factionId,
    guildId: observation.guildId,
    impact: observation.impact,
    tags: observation.tags,
    payload: observation.payload,
    score: score.finalScore,
    emotionalWeight: score.emotionalWeight,
  };
}

/**
 * Get top N memories by score
 */
export function getTopMemories(
  episodic: NPCEpisodicMemory[],
  count: number = 10
): NPCEpisodicMemory[] {
  return [...episodic]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, count);
}

/**
 * Get memories by type
 */
export function getMemoriesByType(
  episodic: NPCEpisodicMemory[],
  type: WorldMemoryEventType
): NPCEpisodicMemory[] {
  return episodic.filter((mem) => mem.type === type);
}

/**
 * Get memories involving specific entity
 */
export function getMemoriesInvolvingEntity(
  episodic: NPCEpisodicMemory[],
  entityId: string
): NPCEpisodicMemory[] {
  return episodic.filter(
    (mem) => mem.actorId === entityId || mem.targetId === entityId
  );
}

// ============================================================================
// Relation Score Calculation
// ============================================================================

/**
 * Calculate relation score for display/debugging
 */
export function calculateRelationScore(relation: NPCRelation): number {
  // Weighted combination of relation components
  const trustWeight = 0.3;
  const fearWeight = 0.2;
  const respectWeight = 0.2;
  const moraleWeight = 0.3;

  // Fear reduces overall score
  const fearPenalty = relation.fear / 100 * 0.3;

  const score =
    (relation.trust / 100 * trustWeight) +
    ((100 - relation.fear) / 100 * fearWeight) +
    (relation.respect / 100 * respectWeight) +
    ((relation.morale + 100) / 200 * moraleWeight) -
    fearPenalty;

  return Math.max(0, Math.min(1, score));
}

/**
 * Determine relation disposition
 */
export function getRelationDisposition(relation: NPCRelation): "friendly" | "neutral" | "hostile" {
  const score = calculateRelationScore(relation);
  
  if (score >= 0.6) return "friendly";
  if (score <= 0.3) return "hostile";
  return "neutral";
}

// ============================================================================
// Fear and Threat Assessment
// ============================================================================

/**
 * Calculate threat level from observations
 */
export function calculateThreatLevel(
  observations: NPCObservation[],
  npcId: string
): number {
  const relevantObs = observations.filter(
    (obs) => obs.targetId === npcId || obs.actorId === npcId
  );

  if (relevantObs.length === 0) return 0;

  const negativeEvents = relevantObs.filter((obs) => obs.impact < 0);
  const attackEvents = relevantObs.filter(
    (obs) => obs.type === "player_attack" || obs.type === "combat_lost"
  );

  // Threat = negative events + attack frequency
  const negativeScore = negativeEvents.length * 2;
  const attackScore = attackEvents.length * 5;

  return Math.min(1, (negativeScore + attackScore) / 20);
}

/**
 * Calculate safety level
 */
export function calculateSafetyLevel(
  npcMemory: NPCMemoryV3,
  threatLevel: number
): number {
  // Base safety from combat memory
  const combatWins = npcMemory.combat.victories;
  const combatLosses = npcMemory.combat.defeats;
  
  // Win ratio
  const totalCombats = combatWins + combatLosses;
  const winRatio = totalCombats > 0 ? combatWins / totalCombats : 0.5;

  // Combine with current threat
  const baseSafety = 0.3 + winRatio * 0.5;
  const finalSafety = baseSafety - threatLevel * 0.5;

  return Math.max(0, Math.min(1, finalSafety));
}

// ============================================================================
// Memory Processing
// ============================================================================

/**
 * Apply new observations to NPC memory
 */
export function applyObservationsToMemory(
  memory: NPCMemoryV3,
  observations: NPCObservation[],
  currentTick: number
): NPCMemoryV3 {
  const updatedMemory = { ...memory };
  
  for (const obs of observations) {
    if (shouldStoreMemory(obs, memory, currentTick)) {
      const episodic = observationToEpisodic(obs, memory, currentTick);
      updatedMemory.episodic = [...updatedMemory.episodic, episodic];
    }
  }

  // Limit episodic memory size
  if (updatedMemory.episodic.length > 256) {
    updatedMemory.episodic = updatedMemory.episodic
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 256);
  }

  return updatedMemory;
}

/**
 * Update relations based on observations
 */
export function updateRelationsFromObservation(
  relations: Record<string, NPCRelation>,
  observation: NPCObservation,
  currentTick: number
): Record<string, NPCRelation> {
  const updatedRelations = { ...relations };

  // Update actor relation
  if (observation.actorId) {
    const actorRelation = updatedRelations[observation.actorId] ?? {
      entityId: observation.actorId,
      entityType: "player" as const,
      trust: 0,
      fear: 0,
      respect: 0,
      greed: 0,
      morale: 0,
      interactions: 0,
      lastInteractionTick: 0,
      positiveInteractions: 0,
      negativeInteractions: 0,
    };

    const isPositive = observation.impact > 0;
    
    actorRelation.trust += isPositive ? 5 : -5;
    actorRelation.trust = Math.max(-100, Math.min(100, actorRelation.trust));
    
    actorRelation.morale += isPositive ? 3 : -3;
    actorRelation.morale = Math.max(-100, Math.min(100, actorRelation.morale));
    
    actorRelation.fear += observation.impact < 0 ? Math.abs(observation.impact) * 2 : 0;
    actorRelation.fear = Math.min(100, actorRelation.fear);
    
    actorRelation.interactions++;
    actorRelation.lastInteractionTick = currentTick;
    
    if (isPositive) {
      actorRelation.positiveInteractions++;
    } else {
      actorRelation.negativeInteractions++;
    }

    updatedRelations[observation.actorId] = actorRelation;
  }

  // Update target relation
  if (observation.targetId) {
    const targetRelation = updatedRelations[observation.targetId] ?? {
      entityId: observation.targetId,
      entityType: "player" as const,
      trust: 0,
      fear: 0,
      respect: 0,
      greed: 0,
      morale: 0,
      interactions: 0,
      lastInteractionTick: 0,
      positiveInteractions: 0,
      negativeInteractions: 0,
    };

    const isPositive = observation.impact > 0;
    
    targetRelation.trust += isPositive ? 5 : -5;
    targetRelation.trust = Math.max(-100, Math.min(100, targetRelation.trust));
    
    targetRelation.morale += isPositive ? 3 : -3;
    targetRelation.morale = Math.max(-100, Math.min(100, targetRelation.morale));
    
    targetRelation.fear += observation.impact < 0 ? Math.abs(observation.impact) * 2 : 0;
    targetRelation.fear = Math.min(100, targetRelation.fear);
    
    targetRelation.interactions++;
    targetRelation.lastInteractionTick = currentTick;
    
    if (isPositive) {
      targetRelation.positiveInteractions++;
    } else {
      targetRelation.negativeInteractions++;
    }

    updatedRelations[observation.targetId] = targetRelation;
  }

  return updatedRelations;
}

/**
 * Calculate memory hash for replay verification
 */
export function calculateMemoryFingerprint(memory: NPCMemoryV3): string {
  const components = [
    memory.identity.npcId,
    memory.episodic.length,
    memory.episodic.slice(-10).map((e) => `${e.type}:${e.tick}:${e.impact}`).join("|"),
    Object.keys(memory.relations).length,
    JSON.stringify(
      Object.entries(memory.learning.actionScores)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, 10)
    ),
  ];

  const hash = stableHash32(components.join("||"));
  return hash.toString(16).padStart(8, "0");
}