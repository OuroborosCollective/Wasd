/**
 * Deterministic Scoring Engine
 * Provides reproducible scoring calculations based on game tick and ruleset version
 * Part of the Ouroboros ARE (Arelorian Runtime Engine) compatibility layer
 */
import type { Lead } from '../models/Lead.js';
import type { LeadScores } from '../models/LeadScores.js';
import { calculateFinalScore } from '../models/LeadScores.js';
import { SCORE_WEIGHTS, RULESET_VERSION, KAPPA_CONSTANT, GENESIS_STATE_HASH } from '../types/index.js';

/**
 * Deterministic scoring context for audit trail
 */
export interface ScoringRunContext {
  tick: number;
  seed: string;
  ruleset_version: string;
  kappa: number;
  state_hash_before: string;
  state_hash_after: string;
  scoring_input_hash: string;
  scoring_output_hash: string;
}

/**
 * Result of a scoring run
 */
export interface ScoringRunResult {
  lead: Lead;
  context: ScoringRunContext;
  qualified: boolean;
  reason: string;
}

/**
 * Simple hash function for deterministic state hashing
 * Uses djb2 algorithm for consistent results across runs
 */
export function deterministicHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Calculate state hash from lead data
 */
export function calculateLeadStateHash(lead: Lead): string {
  const stateComponents = [
    lead.lead_id,
    lead.display_name,
    lead.final_score.toString(),
    lead.segment,
    lead.scores.activity_score.toString(),
    lead.scores.mmorpg_fit_score.toString(),
    lead.scores.android_fit_score.toString(),
    lead.scores.browser_game_fit_score.toString(),
    lead.scores.social_reach_score.toString(),
    lead.scores.tester_quality_score.toString(),
    lead.scores.toxicity_risk_score.toString(),
    lead.scores.retention_potential_score.toString(),
  ];

  const stateString = stateComponents.join('|');
  return deterministicHash(stateString);
}

/**
 * Calculate input hash for scoring run
 */
export function calculateScoringInputHash(leadId: string, scores: LeadScores): string {
  const input = [
    leadId,
    scores.activity_score.toString(),
    scores.mmorpg_fit_score.toString(),
    scores.android_fit_score.toString(),
    scores.browser_game_fit_score.toString(),
    scores.social_reach_score.toString(),
    scores.tester_quality_score.toString(),
    scores.toxicity_risk_score.toString(),
    scores.retention_potential_score.toString(),
  ].join('|');

  return deterministicHash(input);
}

/**
 * Score a lead deterministically
 */
export function scoreLead(
  lead: Lead,
  scores: Partial<LeadScores>,
  tick: number,
  seed: string = 'default'
): ScoringRunResult {
  // Calculate hashes for audit trail
  const stateHashBefore = calculateLeadStateHash(lead);
  const newScores = { ...lead.scores, ...scores };
  const scoringInputHash = calculateScoringInputHash(lead.lead_id, newScores);

  // Calculate final score using deterministic weights
  const finalScore = calculateFinalScore(newScores);

  // Determine qualification
  const qualified = finalScore >= SCORE_WEIGHTS.ACTIVITY * 100;
  let reason = '';

  if (finalScore < 50) {
    reason = 'Below minimum qualifying score of 50';
  } else if (newScores.toxicity_risk_score >= 80) {
    reason = 'Toxicity risk too high';
  }

  // Create updated lead
  const updatedLead: Lead = {
    ...lead,
    scores: newScores,
    final_score: finalScore,
    scoring_context: {
      tick,
      seed,
      ruleset_version: RULESET_VERSION,
      kappa: KAPPA_CONSTANT,
      state_hash_before: stateHashBefore,
      state_hash_after: null, // Will be calculated after
    },
    updated_at: tick,
  };

  // Calculate final state hash
  const stateHashAfter = calculateLeadStateHash(updatedLead);
  if (updatedLead.scoring_context) {
    updatedLead.scoring_context.state_hash_after = stateHashAfter;
  }

  // Create scoring context for audit
  const context: ScoringRunContext = {
    tick,
    seed,
    ruleset_version: RULESET_VERSION,
    kappa: KAPPA_CONSTANT,
    state_hash_before: stateHashBefore,
    state_hash_after: stateHashAfter,
    scoring_input_hash: scoringInputHash,
    scoring_output_hash: deterministicHash(`${lead.lead_id}:${finalScore}:${tick}`),
  };

  return { lead: updatedLead, context, qualified, reason };
}

/**
 * Batch score multiple leads
 */
export function scoreLeadBatch(
  leads: Lead[],
  scoringFn: (lead: Lead) => Partial<LeadScores>,
  tick: number,
  seed: string = 'batch'
): ScoringRunResult[] {
  return leads.map((lead, index) => {
    const seedWithIndex = `${seed}:${index}`;
    return scoreLead(lead, scoringFn(lead), tick, seedWithIndex);
  });
}

/**
 * Validate scoring context matches expected values
 */
export function validateScoringContext(
  context: ScoringRunContext,
  expectedTick: number,
  expectedVersion: string = RULESET_VERSION
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (context.tick !== expectedTick) {
    errors.push(`Tick mismatch: expected ${expectedTick}, got ${context.tick}`);
  }

  if (context.ruleset_version !== expectedVersion) {
    errors.push(
      `Ruleset version mismatch: expected ${expectedVersion}, got ${context.ruleset_version}`
    );
  }

  if (!context.state_hash_before || !context.state_hash_after) {
    errors.push('Missing state hashes in context');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Replay a scoring run with the same parameters
 * Useful for verifying deterministic behavior
 */
export function replayScoringRun(
  lead: Lead,
  scores: Partial<LeadScores>,
  originalContext: ScoringRunContext
): { matches: boolean; discrepancies: string[] } {
  const result = scoreLead(lead, scores, originalContext.tick, originalContext.seed);

  const discrepancies: string[] = [];

  if (result.context.scoring_output_hash !== originalContext.scoring_output_hash) {
    discrepancies.push('Output hash mismatch - scoring is not deterministic');
  }

  if (result.context.scoring_input_hash !== originalContext.scoring_input_hash) {
    discrepancies.push('Input hash mismatch - scoring parameters changed');
  }

  return {
    matches: discrepancies.length === 0,
    discrepancies,
  };
}