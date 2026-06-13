/**
 * @file server/src/core/language/LanguageOutcomeLearner.ts
 * @description LanguageOutcomeLearner - Event-driven speech→outcome learning.
 *
 * Records speech outcomes and updates lexeme/phrase weights without storing
 * raw text. Only semantic outcomes and weight deltas are persisted.
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All learning derives from stable hashes and KAPPA math
 * - Wall-clock time only in explicitly marked side-channel telemetry
 */

import { KAPPA } from '../are/Kappa.js';
import { stableHash32 } from '../determinism/AREDeterminism.js';
import type {
  SpeechOutcomeEvent,
  SpeechSituation,
  PlayerReaction,
  WorldResult,
  SpeechScore,
  SpeechConsequence,
  KappaInt,
  NpcId,
  PhraseGenome,
} from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import { recordLexemeUsage, type UsageDelta } from './LivingDudenArchive.js';
import { getPhraseGenomeOrFallback } from './ProceduralGrammarEngine.js';

const LEARNER_TAG = 'LANG_OUTCOME_LEARNER_V1';

// =============================================================================
// OUTCOME STORAGE (semantic only, no raw text)
// =============================================================================

interface StoredOutcome {
  readonly eventId: string;
  readonly tick: number;
  readonly npcId: string;
  readonly phraseGenomeId: string;
  readonly usedLexemeIds: readonly string[];
  readonly situation: SpeechSituation;
  readonly playerReaction: PlayerReaction;
  readonly worldResult: WorldResult;
  readonly score: SpeechScore;
  readonly derivedConsequences: readonly SpeechConsequence[];
}

const outcomeHistory: StoredOutcome[] = [];
const OUTCOME_HISTORY_LIMIT = 1000;

// =============================================================================
// WEIGHT UPDATE RULES
// =============================================================================

interface WeightUpdate {
  lexemeId: string;
  deltaSuccessWeight: number;
  deltaRiskPenalty: number;
  reason: string;
}

const WEIGHT_RULES = Object.freeze({
  /** Success weight multiplier for positive outcomes */
  SUCCESS_BOOST: 1.1,
  /** Risk penalty multiplier for negative outcomes */
  RISK_PENALTY: 1.2,
  /** Maximum weight multiplier cap */
  MAX_WEIGHT_MULTIPLIER: 3.0,
  /** Minimum weight before decay */
  MIN_WEIGHT_BEFORE_DECAY: 0.5,
  /** Decay rate per day (in kappa) */
  DECAY_RATE: 0.001,
});

// =============================================================================
// LEARNING ENGINE
// =============================================================================

/**
 * Record speech outcome and update weights.
 * Does NOT store raw text - only semantic outcomes.
 */
export function recordOutcome(outcomeEvent: SpeechOutcomeEvent): void {
  const consequences = deriveConsequences(outcomeEvent);

  const stored: StoredOutcome = Object.freeze({
    eventId: outcomeEvent.eventId,
    tick: outcomeEvent.tick,
    npcId: outcomeEvent.npcId,
    phraseGenomeId: outcomeEvent.phraseGenomeId,
    usedLexemeIds: outcomeEvent.usedLexemeIds,
    situation: outcomeEvent.situation,
    playerReaction: outcomeEvent.playerReaction,
    worldResult: outcomeEvent.worldResult,
    score: outcomeEvent.score,
    derivedConsequences: consequences,
  });

  // Store outcome (ring buffer)
  outcomeHistory.push(stored);
  if (outcomeHistory.length > OUTCOME_HISTORY_LIMIT) {
    outcomeHistory.shift();
  }

  // Update lexeme weights based on consequences
  const updates = computeWeightUpdates(stored, consequences);
  applyWeightUpdates(updates);

  // Update phrase genome stats
  updatePhraseGenomeStats(stored);
}

/**
 * Derive consequences from outcome event.
 * Maps raw reactions to semantic consequence types.
 */
function deriveConsequences(event: SpeechOutcomeEvent): readonly SpeechConsequence[] {
  const consequences: SpeechConsequence[] = [];
  const { playerReaction, worldResult } = event;

  // Player reaction consequences
  if (playerReaction.helped) consequences.push('caused_help');
  if (playerReaction.traded) consequences.push('caused_trade');
  if (playerReaction.attackedNpc) consequences.push('caused_aggression');
  if (playerReaction.acceptedQuest) consequences.push('caused_quest_accept');
  if (playerReaction.declinedQuest) consequences.push('caused_quest_decline');

  // Trust changes
  if (worldResult.reputationChanged > createKappaInt(0)) {
    consequences.push('caused_trust_gain');
  } else if (worldResult.reputationChanged < createKappaInt(0)) {
    consequences.push('caused_trust_loss');
  }

  // Fear
  if (playerReaction.showedDisrespect || playerReaction.attackedNpc) {
    consequences.push('caused_fear');
  }

  // Information flow
  if (playerReaction.showedRespect && event.situation.intent === 'teach') {
    consequences.push('caused_information');
  }

  // Rumor spread (when trust is low but curiosity is high)
  if (
    event.situation.intent === 'rumor_share' &&
    playerReaction.showedRespect &&
    event.situation.trust < createKappaInt(0.5)
  ) {
    consequences.push('caused_rumor_spread');
  }

  // No consequence marker
  if (consequences.length === 0) {
    consequences.push('no_consequence');
  }

  return Object.freeze(consequences);
}

/**
 * Compute weight updates based on consequences.
 * Deterministic: same consequences → same updates.
 */
function computeWeightUpdates(
  stored: StoredOutcome,
  consequences: readonly SpeechConsequence[]
): WeightUpdate[] {
  const updates: WeightUpdate[] = [];
  const isSuccessful = isSuccessfulOutcome(stored);

  for (const lexemeId of stored.usedLexemeIds) {
    let deltaSuccessWeight = 0;
    let deltaRiskPenalty = 0;
    let reason = '';

    if (isSuccessful) {
      deltaSuccessWeight = computeSuccessBoost(stored, consequences);
      reason = 'successful_speech';
    } else {
      deltaRiskPenalty = computeRiskPenalty(stored, consequences);
      reason = 'failed_speech';
    }

    updates.push({
      lexemeId,
      deltaSuccessWeight,
      deltaRiskPenalty,
      reason,
    });
  }

  return updates;
}

/**
 * Determine if outcome was successful.
 */
function isSuccessfulOutcome(stored: StoredOutcome): boolean {
  const { playerReaction, worldResult, score } = stored;

  // Quest acceptance is always good
  if (playerReaction.acceptedQuest) return true;

  // Trade is good
  if (playerReaction.traded) return true;

  // Help is good
  if (playerReaction.helped) return true;

  // Positive reputation change is good
  if (worldResult.reputationChanged > createKappaInt(0.1)) return true;

  // Positive score is good
  if (score.finalKappa > createKappaInt(1.0)) return true;

  // Aggression is bad
  if (playerReaction.attackedNpc) return false;

  // Trust loss is bad
  if (worldResult.reputationChanged < createKappaInt(-0.1)) return false;

  // Default to failure if nothing positive happened
  return false;
}

/**
 * Compute success weight boost.
 */
function computeSuccessBoost(
  _stored: StoredOutcome,
  consequences: readonly SpeechConsequence[]
): number {
  let boost = 0;

  for (const consequence of consequences) {
    switch (consequence) {
      case 'caused_quest_accept':
        boost += 0.15;
        break;
      case 'caused_trade':
        boost += 0.10;
        break;
      case 'caused_help':
        boost += 0.08;
        break;
      case 'caused_trust_gain':
        boost += 0.05;
        break;
      case 'caused_information':
        boost += 0.06;
        break;
      case 'caused_rumor_spread':
        boost += 0.03;
        break;
      case 'no_consequence':
        boost += 0.01;
        break;
    }
  }

  return boost;
}

/**
 * Compute risk penalty for failed speech.
 */
function computeRiskPenalty(
  _stored: StoredOutcome,
  consequences: readonly SpeechConsequence[]
): number {
  let penalty = 0;

  for (const consequence of consequences) {
    switch (consequence) {
      case 'caused_aggression':
        penalty += 0.20;
        break;
      case 'caused_quest_decline':
        penalty += 0.10;
        break;
      case 'caused_trust_loss':
        penalty += 0.08;
        break;
      case 'caused_fear':
        penalty += 0.12;
        break;
    }
  }

  return penalty;
}

/**
 * Apply weight updates to lexemes.
 */
function applyWeightUpdates(updates: WeightUpdate[]): void {
  for (const update of updates) {
    // Get current usage stats to determine success/failure ratio
    const usageDelta: UsageDelta = {};

    if (update.deltaSuccessWeight > 0) {
      usageDelta.playerReactionSuccess = 1;
    } else if (update.deltaRiskPenalty > 0) {
      usageDelta.playerReactionFailure = 1;
    }

    // Apply usage tracking
    recordLexemeUsage(update.lexemeId, usageDelta);

    // Side-channel telemetry for weight changes (not truth path)
    emitWeightChangeTelemetry(update);
  }
}

/**
 * Emit weight change telemetry (side-channel only).
 */
function emitWeightChangeTelemetry(update: WeightUpdate): void {
  // This would emit to a telemetry system
  // Wall-clock time acceptable here as this is observability only
  if (process.env.NODE_ENV === 'development') {
    // console.debug(`[WEIGHT_UPDATE] ${update.lexemeId}: +${update.deltaSuccessWeight}/-${update.deltaRiskPenalty} (${update.reason})`);
  }
}

/**
 * Update phrase genome outcome statistics.
 */
function updatePhraseGenomeStats(stored: StoredOutcome): void {
  const genome = getPhraseGenomeOrFallback(stored.phraseGenomeId);
  if (!genome) return;

  const isSuccess = isSuccessfulOutcome(stored);

  // This would update the phrase genome's outcomeStats
  // Implementation depends on PhraseGenomeRegistry
}

// =============================================================================
// OUTCOME QUERY (for NPC decision making)
// =============================================================================

/**
 * Get recent outcomes for an NPC.
 */
export function getRecentOutcomesForNpc(
  npcId: string,
  limit = 10
): readonly StoredOutcome[] {
  const npcOutcomes = outcomeHistory
    .filter((o) => o.npcId === npcId)
    .slice(-limit);
  return npcOutcomes;
}

/**
 * Get outcomes for a specific phrase genome.
 */
export function getOutcomesForGenome(
  genomeId: string,
  limit = 20
): readonly StoredOutcome[] {
  const genomeOutcomes = outcomeHistory
    .filter((o) => o.phraseGenomeId === genomeId)
    .slice(-limit);
  return genomeOutcomes;
}

/**
 * Get successful outcomes for concept.
 */
export function getSuccessfulOutcomesForConcept(
  concept: string,
  limit = 20
): readonly StoredOutcome[] {
  // This would need lexeme→concept mapping
  // For now, return empty
  return [];
}

/**
 * Calculate success rate for lexeme.
 */
export function getLexemeSuccessRate(lexemeId: string): number {
  // Get outcomes using this lexeme
  const lexemeOutcomes = outcomeHistory.filter((o) =>
    o.usedLexemeIds.includes(lexemeId)
  );

  if (lexemeOutcomes.length === 0) return 0.5; // Default neutral

  const successes = lexemeOutcomes.filter((o) => isSuccessfulOutcome(o)).length;
  return successes / lexemeOutcomes.length;
}

/**
 * Get average score for phrase genome.
 */
export function getGenomeAverageScore(genomeId: string): KappaInt {
  const genomeOutcomes = outcomeHistory.filter(
    (o) => o.phraseGenomeId === genomeId
  );

  if (genomeOutcomes.length === 0) {
    return createKappaInt(1.0); // Default neutral
  }

  const totalScore = genomeOutcomes.reduce(
    (sum, o) => sum + Number(o.score.finalKappa),
    0
  );
  return createKappaInt(totalScore / (genomeOutcomes.length * KAPPA));
}

// =============================================================================
// LEARNING INSIGHTS (for NPC decision support)
// =============================================================================

export interface LearningInsight {
  concept: string;
  bestLexemeId: string;
  successRate: number;
  totalUses: number;
  recommendedWeight: number;
}

/**
 * Get learning insights for concepts.
 * Used by DialogueDecisionKernel to select best lexemes.
 */
export function getInsightsForConcepts(
  concepts: readonly string[],
  limit = 5
): readonly LearningInsight[] {
  // This is a simplified implementation
  // Real implementation would query lexeme→concept mappings
  return [];
}

/**
 * Clear outcome history (for testing).
 */
export function clearOutcomeHistory(): void {
  outcomeHistory.length = 0;
}

/**
 * Get outcome history size.
 */
export function getOutcomeHistorySize(): number {
  return outcomeHistory.length;
}