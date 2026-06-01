/**
 * Lead model - The main entity tying all components together
 * This is the primary data structure for the Lead Intelligence System
 */
import type { Platform, LeadSegment, TaskStatus, TaskType } from '../types/index.js';
import { createDefaultInterestSignals, type PlayerInterestSignals } from './PlayerInterestSignals.js';
import { createLeadSource, type LeadSource } from './LeadSource.js';
import { createDefaultLeadScores, type LeadScores, calculateFinalScore } from './LeadScores.js';
import { createDefaultOutreachState, type OutreachState, canAttemptContact } from './OutreachState.js';
import { createDefaultConsentState, type ConsentState } from './ConsentState.js';
import { createDefaultRiskSignals, type RiskSignals } from './RiskSignals.js';
import { createDefaultPlaytestFeedback, type PlaytestFeedback } from './PlaytestFeedback.js';

/**
 * Platform identifier for a lead
 */
export interface PlatformIdentifier {
  platform: Platform;
  identifier: string;
  verified: boolean;
}

/**
 * Agent task for workflow processing
 */
export interface AgentTask {
  task_id: string;
  task_type: TaskType;
  status: TaskStatus;
  lead_id: string;
  created_at: number;
  completed_at: number | null;
  error_message: string | null;
  result_data: Record<string, unknown>;
}

/**
 * Deterministic scoring context for reproducibility
 */
export interface DeterministicScoringContext {
  /** Current game tick */
  tick: number;
  /** Seed for deterministic operations */
  seed: string;
  /** Ruleset version for scoring weights */
  ruleset_version: string;
  /** Kappa constant for the game */
  kappa: number;
  /** State hash before scoring */
  state_hash_before: string | null;
  /** State hash after scoring */
  state_hash_after: string | null;
}

/**
 * The main Lead entity combining all components
 */
export interface Lead {
  /** Unique lead identifier */
  lead_id: string;
  /** Primary display name */
  display_name: string;
  /** Email address if available */
  email: string | null;
  /** Platform identifiers for this lead */
  identifiers: PlatformIdentifier[];
  /** Interest signals */
  interest_signals: PlayerInterestSignals;
  /** Lead source and attribution */
  lead_source: LeadSource;
  /** Scoring data */
  scores: LeadScores;
  /** Final calculated score */
  final_score: number;
  /** Assigned segment */
  segment: LeadSegment;
  /** Outreach state */
  outreach_state: OutreachState;
  /** Consent state for GDPR */
  consent_state: ConsentState;
  /** Risk signals */
  risk_signals: RiskSignals;
  /** Playtest feedback */
  playtest_feedback: PlaytestFeedback;
  /** Agent task queue */
  tasks: AgentTask[];
  /** Deterministic scoring context */
  scoring_context: DeterministicScoringContext | null;
  /** Creation tick */
  created_at: number;
  /** Last update tick */
  updated_at: number;
}

/**
 * Create a new lead with default values
 */
export function createLead(
  leadId: string,
  displayName: string,
  source: LeadSource,
  tick: number = 0
): Lead {
  return {
    lead_id: leadId,
    display_name: displayName,
    email: null,
    identifiers: [],
    interest_signals: createDefaultInterestSignals(),
    lead_source: source,
    scores: createDefaultLeadScores(),
    final_score: 0,
    segment: 'low_priority',
    outreach_state: createDefaultOutreachState(),
    consent_state: createDefaultConsentState(),
    risk_signals: createDefaultRiskSignals(),
    playtest_feedback: createDefaultPlaytestFeedback(leadId),
    tasks: [],
    scoring_context: null,
    created_at: tick,
    updated_at: tick,
  };
}

/**
 * Generate deterministic lead ID from platform and identifier
 */
export function generateDeterministicLeadId(platform: Platform, identifier: string): string {
  let hash = 0;
  const input = `${platform}:${identifier}`;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `LEAD-${platform.toUpperCase().slice(0, 3)}-${hexHash}`;
}

/**
 * Validate lead
 */
export function validateLead(lead: Lead): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!lead.lead_id || typeof lead.lead_id !== 'string') {
    errors.push('lead_id is required and must be a string');
  }

  if (!lead.display_name || typeof lead.display_name !== 'string') {
    errors.push('display_name is required and must be a string');
  }

  if (lead.email !== null && typeof lead.email !== 'string') {
    errors.push('email must be a string or null');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if lead qualifies for outreach
 */
export function canOutreach(lead: Lead): boolean {
  // Check consent
  if (!lead.consent_state.can_contact) {
    return false;
  }

  // Check not blocked
  if (lead.segment === 'blocked') {
    return false;
  }

  // Check minimum score threshold
  if (lead.final_score < 50) {
    return false;
  }

  // Check outreach state
  return canAttemptContact(lead.outreach_state);
}

/**
 * Get lead priority for queue ordering
 */
export function getLeadPriority(lead: Lead): number {
  // Higher score + lower risk = higher priority
  const scoreFactor = lead.final_score / 100;
  const riskFactor = 1 - lead.risk_signals.toxicity_risk / 100;
  const consentFactor = lead.consent_state.has_consent ? 1 : 0.5;

  return scoreFactor * riskFactor * consentFactor * 100;
}

/**
 * Add platform identifier to lead
 */
export function addPlatformIdentifier(
  lead: Lead,
  platform: Platform,
  identifier: string,
  verified: boolean = false
): Lead {
  return {
    ...lead,
    identifiers: [
      ...lead.identifiers,
      { platform, identifier, verified },
    ],
    updated_at: lead.updated_at + 1,
  };
}

/**
 * Update lead scores and recalculate final score
 */
export function updateLeadScores(lead: Lead, scores: Partial<LeadScores>, tick: number): Lead {
  const newScores = { ...lead.scores, ...scores };
  const finalScore = calculateFinalScore(newScores);

  return {
    ...lead,
    scores: newScores,
    final_score: finalScore,
    scoring_context: {
      tick,
      seed: lead.lead_id,
      ruleset_version: 'v1.0.0',
      kappa: 1000,
      state_hash_before: null,
      state_hash_after: null,
    },
    updated_at: tick,
  };
}

/**
 * Add agent task to lead
 */
export function addAgentTask(
  lead: Lead,
  taskType: TaskType,
  taskId: string,
  tick: number
): Lead {
  const newTask: AgentTask = {
    task_id: taskId,
    task_type: taskType,
    status: 'pending',
    lead_id: lead.lead_id,
    created_at: tick,
    completed_at: null,
    error_message: null,
    result_data: {},
  };

  return {
    ...lead,
    tasks: [...lead.tasks, newTask],
    updated_at: tick,
  };
}