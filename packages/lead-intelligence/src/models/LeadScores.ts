/**
 * LeadScores model
 * Deterministic scoring components for lead qualification
 * All scores are in range [0, 100]
 */
import { SCORE_WEIGHTS } from '../types/index.js';

/**
 * Individual score components for a lead
 */
export interface LeadScores {
  /** Activity level on gaming platforms (0-100) */
  activity_score: number;
  /** Fit score for MMORPG gameplay (0-100) */
  mmorpg_fit_score: number;
  /** Fit score for Android/mobile play (0-100) */
  android_fit_score: number;
  /** Fit score for browser-based gaming (0-100) */
  browser_game_fit_score: number;
  /** Social reach and influence (0-100) */
  social_reach_score: number;
  /** Quality as a tester (0-100) */
  tester_quality_score: number;
  /** Risk of being toxic (0-100, higher = more risky) */
  toxicity_risk_score: number;
  /** Likelihood of retention (0-100) */
  retention_potential_score: number;
}

/**
 * Create default lead scores (neutral values)
 */
export function createDefaultLeadScores(): LeadScores {
  return {
    activity_score: 0,
    mmorpg_fit_score: 0,
    android_fit_score: 0,
    browser_game_fit_score: 0,
    social_reach_score: 0,
    tester_quality_score: 0,
    toxicity_risk_score: 0,
    retention_potential_score: 0,
  };
}

/**
 * Validate score bounds
 */
export function validateLeadScores(scores: LeadScores): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const scoreFields: (keyof LeadScores)[] = [
    'activity_score',
    'mmorpg_fit_score',
    'android_fit_score',
    'browser_game_fit_score',
    'social_reach_score',
    'tester_quality_score',
    'toxicity_risk_score',
    'retention_potential_score',
  ];

  for (const field of scoreFields) {
    const value = scores[field];
    if (typeof value !== 'number' || value < 0 || value > 100) {
      errors.push(`${field} must be a number between 0 and 100, got ${value}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate weighted final score from components
 * Uses deterministic weights from SCORE_WEIGHTS
 */
export function calculateFinalScore(scores: LeadScores): number {
  const total =
    scores.activity_score * SCORE_WEIGHTS.ACTIVITY +
    scores.mmorpg_fit_score * SCORE_WEIGHTS.MMORPG_FIT +
    scores.android_fit_score * SCORE_WEIGHTS.ANDROID_FIT +
    scores.browser_game_fit_score * SCORE_WEIGHTS.BROWSER_GAME_FIT +
    scores.social_reach_score * SCORE_WEIGHTS.SOCIAL_REACH +
    scores.tester_quality_score * SCORE_WEIGHTS.TESTER_QUALITY +
    scores.toxicity_risk_score * SCORE_WEIGHTS.TOXICITY_RISK +
    scores.retention_potential_score * SCORE_WEIGHTS.RETENTION_POTENTIAL;

  // Round to 2 decimal places for deterministic output
  return Math.round(total * 100) / 100;
}

/**
 * Get score summary with final calculation
 */
export function getScoreSummary(scores: LeadScores): {
  scores: LeadScores;
  final_score: number;
  is_high_quality: boolean;
  risk_level: 'low' | 'medium' | 'high';
} {
  const final_score = calculateFinalScore(scores);

  return {
    scores,
    final_score,
    is_high_quality: final_score >= 70,
    risk_level:
      scores.toxicity_risk_score >= 70
        ? 'high'
        : scores.toxicity_risk_score >= 40
          ? 'medium'
          : 'low',
  };
}

/**
 * Score thresholds for qualification
 */
export const SCORE_THRESHOLDS = {
  MIN_QUALIFYING_SCORE: 50,
  HIGH_QUALITY_THRESHOLD: 70,
  EXCEPTIONAL_THRESHOLD: 85,
  TOXICITY_BAN_THRESHOLD: 80,
} as const;