/**
 * PlaytestFeedback model
 * Feedback loop from playtesting sessions
 */
import type { LeadSegment } from '../types/index.js';

/**
 * Tracks playtest feedback and engagement metrics
 */
export interface PlaytestFeedback {
  /** Associated lead ID */
  lead_id: string;
  /** Number of playtest sessions attended */
  session_count: number;
  /** Total playtime in minutes */
  total_playtime_minutes: number;
  /** Number of bug reports submitted */
  bug_reports_submitted: number;
  /** Overall usefulness score (0-100) */
  useful_feedback_score: number;
  /** Days since last session (retention metric) */
  retention_days: number;
  /** Whether converted to regular player */
  converted_to_player: boolean;
  /** Whether converted to supporter */
  converted_to_supporter: boolean;
}

/**
 * Create default playtest feedback
 */
export function createDefaultPlaytestFeedback(leadId: string): PlaytestFeedback {
  return {
    lead_id: leadId,
    session_count: 0,
    total_playtime_minutes: 0,
    bug_reports_submitted: 0,
    useful_feedback_score: 0,
    retention_days: 0,
    converted_to_player: false,
    converted_to_supporter: false,
  };
}

/**
 * Validate playtest feedback
 */
export function validatePlaytestFeedback(
  feedback: PlaytestFeedback
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!feedback.lead_id || typeof feedback.lead_id !== 'string') {
    errors.push('lead_id is required and must be a string');
  }

  const numericFields: (keyof Omit<PlaytestFeedback, 'lead_id' | 'converted_to_player' | 'converted_to_supporter'>)[] = [
    'session_count',
    'total_playtime_minutes',
    'bug_reports_submitted',
    'useful_feedback_score',
    'retention_days',
  ];

  for (const field of numericFields) {
    const value = feedback[field];
    if (typeof value !== 'number' || value < 0) {
      errors.push(`${field} must be a non-negative number`);
    }
  }

  if (feedback.useful_feedback_score > 100) {
    errors.push('useful_feedback_score must be between 0 and 100');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate tester quality score from feedback
 */
export function calculateTesterQualityScore(feedback: PlaytestFeedback): number {
  if (feedback.session_count === 0) {
    return 0;
  }

  // Weighted formula based on engagement metrics
  const sessionsScore = Math.min(30, feedback.session_count * 5);
  const playtimeScore = Math.min(25, feedback.total_playtime_minutes / 10);
  const bugReportsScore = Math.min(25, feedback.bug_reports_submitted * 5);
  const feedbackScore = (feedback.useful_feedback_score / 100) * 20;

  return Math.round(sessionsScore + playtimeScore + bugReportsScore + feedbackScore);
}

/**
 * Check if tester should be invited to future tests
 */
export function shouldInviteToFutureTests(feedback: PlaytestFeedback): boolean {
  const qualityScore = calculateTesterQualityScore(feedback);
  return qualityScore >= 40 || feedback.bug_reports_submitted >= 3;
}

/**
 * Get tester tier based on feedback
 */
export function getTesterTier(
  feedback: PlaytestFeedback
): 'inactive' | 'casual' | 'regular' | 'elite' {
  if (feedback.session_count === 0) {
    return 'inactive';
  }

  const qualityScore = calculateTesterQualityScore(feedback);

  if (qualityScore >= 80) {
    return 'elite';
  }
  if (qualityScore >= 50) {
    return 'regular';
  }
  return 'casual';
}

/**
 * Calculate conversion likelihood score
 */
export function calculateConversionLikelihood(feedback: PlaytestFeedback): number {
  if (feedback.converted_to_player) {
    return 100;
  }

  const retentionScore = Math.min(30, feedback.retention_days * 3);
  const engagementScore = Math.min(40, feedback.session_count * 5);
  const qualityScore = (calculateTesterQualityScore(feedback) / 100) * 30;

  return Math.round(retentionScore + engagementScore + qualityScore);
}