/**
 * RiskSignals model
 * Safety layer for community protection
 */
import type { LeadSegment } from '../types/index.js';

/**
 * Tracks risk indicators for a lead
 */
export interface RiskSignals {
  /** Suspected bot account */
  suspected_bot: boolean;
  /** Spam risk score (0-100) */
  spam_risk: number;
  /** Toxicity risk score (0-100) */
  toxicity_risk: number;
  /** Ban evasion risk score (0-100) */
  ban_evasion_risk: number;
  /** Duplicate risk score (0-100) */
  duplicate_risk: number;
  /** Human-readable risk notes */
  notes: string[];
}

/**
 * Create default risk signals (no risk)
 */
export function createDefaultRiskSignals(): RiskSignals {
  return {
    suspected_bot: false,
    spam_risk: 0,
    toxicity_risk: 0,
    ban_evasion_risk: 0,
    duplicate_risk: 0,
    notes: [],
  };
}

/**
 * Validate risk signals
 */
export function validateRiskSignals(signals: RiskSignals): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof signals.suspected_bot !== 'boolean') {
    errors.push('suspected_bot must be a boolean');
  }

  const riskFields: (keyof Omit<RiskSignals, 'suspected_bot' | 'notes'>)[] = [
    'spam_risk',
    'toxicity_risk',
    'ban_evasion_risk',
    'duplicate_risk',
  ];

  for (const field of riskFields) {
    const value = signals[field];
    if (typeof value !== 'number' || value < 0 || value > 100) {
      errors.push(`${field} must be a number between 0 and 100`);
    }
  }

  if (!Array.isArray(signals.notes)) {
    errors.push('notes must be an array');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate overall risk score
 */
export function calculateOverallRisk(signals: RiskSignals): number {
  // Weighted average with bot flag as automatic high risk
  if (signals.suspected_bot) {
    return 100;
  }

  return Math.round(
    signals.spam_risk * 0.2 +
      signals.toxicity_risk * 0.4 +
      signals.ban_evasion_risk * 0.2 +
      signals.duplicate_risk * 0.2
  );
}

/**
 * Get risk level classification
 */
export function getRiskLevel(signals: RiskSignals): 'low' | 'medium' | 'high' | 'critical' {
  if (signals.suspected_bot) {
    return 'critical';
  }

  const overall = calculateOverallRisk(signals);

  if (overall >= 80) {
    return 'high';
  }
  if (overall >= 50) {
    return 'medium';
  }
  return 'low';
}

/**
 * Check if lead should be automatically blocked
 */
export function shouldAutoBlock(signals: RiskSignals): boolean {
  return signals.suspected_bot || signals.toxicity_risk >= 80 || signals.ban_evasion_risk >= 80;
}

/**
 * Add a risk note
 */
export function addRiskNote(signals: RiskSignals, note: string): RiskSignals {
  return {
    ...signals,
    notes: [...signals.notes, note],
  };
}

/**
 * Update individual risk scores
 */
export function updateRiskScore(
  signals: RiskSignals,
  riskType: 'spam_risk' | 'toxicity_risk' | 'ban_evasion_risk' | 'duplicate_risk',
  value: number
): RiskSignals {
  return {
    ...signals,
    [riskType]: Math.max(0, Math.min(100, value)),
  };
}