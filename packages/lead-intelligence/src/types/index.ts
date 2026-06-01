/**
 * Core type definitions for the Lead Intelligence System
 * All enums and literal types used throughout the system
 */

/**
 * Supported platforms for lead identification
 */
export const PlatformEnum = {
  STEAM: 'steam',
  DISCORD: 'discord',
  BATTLENET: 'battlenet',
  RIOT: 'riot',
  EPIC: 'epic',
  ITCHIO: 'itchio',
  REDDIT: 'reddit',
  YOUTUBE: 'youtube',
  TIKTOK: 'tiktok',
  TWITCH: 'twitch',
  GUILDED: 'guilded',
  MATRIX: 'matrix',
  TELEGRAM: 'telegram',
  GITHUB: 'github',
  PRODUCTHUNT: 'producthunt',
  INDIEHACKERS: 'indiehackers',
} as const;

export type Platform = (typeof PlatformEnum)[keyof typeof PlatformEnum];

/**
 * Lead source types for tracking acquisition channels
 */
export const LeadSourceTypeEnum = {
  MANUAL: 'manual',
  DISCORD_SCAN: 'discord_scan',
  STEAM_GROUP: 'steam_group',
  REDDIT_THREAD: 'reddit_thread',
  ITCHIO_COMMENT: 'itchio_comment',
  GITHUB_ISSUE: 'github_issue',
  LANDING_PAGE: 'landing_page',
  REFERRAL: 'referral',
  PLAYTEST_SIGNUP: 'playtest_signup',
} as const;

export type LeadSourceType = (typeof LeadSourceTypeEnum)[keyof typeof LeadSourceTypeEnum];

/**
 * Lead segmentation categories
 */
export const LeadSegmentEnum = {
  ALPHA_TESTER: 'alpha_tester',
  BETA_TESTER: 'beta_tester',
  GUILD_LEADER: 'guild_leader',
  CONTENT_CREATOR: 'content_creator',
  TECHNICAL_CONTRIBUTOR: 'technical_contributor',
  CASUAL_PLAYER: 'casual_player',
  PVP_PLAYER: 'pvp_player',
  CRAFTER_ECONOMY_PLAYER: 'crafter_economy_player',
  LORE_ROLEPLAY_PLAYER: 'lore_roleplay_player',
  LOW_PRIORITY: 'low_priority',
  BLOCKED: 'blocked',
} as const;

export type LeadSegment = (typeof LeadSegmentEnum)[keyof typeof LeadSegmentEnum];

/**
 * Agent task types for the workflow pipeline
 */
export const TaskTypeEnum = {
  EXTRACT_LEAD: 'extract_lead',
  VALIDATE_IDENTIFIER: 'validate_identifier',
  SCORE_LEAD: 'score_lead',
  DEDUPLICATE_LEAD: 'deduplicate_lead',
  ENRICH_PROFILE: 'enrich_profile',
  ASSIGN_SEGMENT: 'assign_segment',
  QUEUE_OUTREACH: 'queue_outreach',
  SEND_INVITE: 'send_invite',
  COLLECT_FEEDBACK: 'collect_feedback',
  GENERATE_REPORT: 'generate_report',
  WRITE_REPO_LOG: 'write_repo_log',
} as const;

export type TaskType = (typeof TaskTypeEnum)[keyof typeof TaskTypeEnum];

/**
 * Task status for tracking agent workflow progress
 */
export const TaskStatusEnum = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type TaskStatus = (typeof TaskStatusEnum)[keyof typeof TaskStatusEnum];

/**
 * Outreach status for contact tracking
 */
export const OutreachStatusEnum = {
  NOT_CONTACTED: 'not_contacted',
  QUEUED: 'queued',
  CONTACTED: 'contacted',
  RESPONDED: 'responded',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  BOUNCED: 'bounced',
  DO_NOT_CONTACT: 'do_not_contact',
} as const;

export type OutreachStatus = (typeof OutreachStatusEnum)[keyof typeof OutreachStatusEnum];

/**
 * Beta invite status tracking
 */
export const BetaInviteStatusEnum = {
  CREATED: 'created',
  SENT: 'sent',
  CLAIMED: 'claimed',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

export type BetaInviteStatus = (typeof BetaInviteStatusEnum)[keyof typeof BetaInviteStatusEnum];

/**
 * Event types for audit trail
 */
export const LeadEventTypeEnum = {
  CREATED: 'created',
  VALIDATED: 'validated',
  SCORED: 'scored',
  QUALIFIED: 'qualified',
  DISQUALIFIED: 'disqualified',
  CONTACTED: 'contacted',
  RESPONDED: 'responded',
  CONVERTED: 'converted',
  BLOCKED: 'blocked',
  DELETED: 'deleted',
  SEGMENT_ASSIGNED: 'segment_assigned',
  INVITE_SENT: 'invite_sent',
  INVITE_CLAIMED: 'invite_claimed',
  FEEDBACK_RECEIVED: 'feedback_received',
} as const;

export type LeadEventType = (typeof LeadEventTypeEnum)[keyof typeof LeadEventTypeEnum];

/**
 * Repo log categories for documentation export
 */
export const RepoLogCategoryEnum = {
  LEAD_EXTRACTION: 'lead_extraction',
  SCORING_RUN: 'scoring_run',
  BETA_INVITE: 'beta_invite',
  PLAYTEST_FEEDBACK: 'playtest_feedback',
  AGENT_TASK: 'agent_task',
  CONVERSION_REPORT: 'conversion_report',
} as const;

export type RepoLogCategory = (typeof RepoLogCategoryEnum)[keyof typeof RepoLogCategoryEnum];

/**
 * Validation result for deterministic checks
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Score weights for deterministic scoring engine
 * These constants ensure reproducible scoring across runs
 */
export const SCORE_WEIGHTS = {
  ACTIVITY: 0.15,
  MMORPG_FIT: 0.25,
  ANDROID_FIT: 0.15,
  BROWSER_GAME_FIT: 0.15,
  SOCIAL_REACH: 0.10,
  TESTER_QUALITY: 0.10,
  TOXICITY_RISK: -0.20,
  RETENTION_POTENTIAL: 0.10,
} as const;

export const RULESET_VERSION = 'v1.0.0';
export const KAPPA_CONSTANT = 1000;
export const GENESIS_STATE_HASH = '0'.repeat(64);
export const GENESIS_PREVIOUS_HASH = 'GENESIS';