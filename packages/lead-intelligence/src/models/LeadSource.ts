/**
 * LeadSource model
 * Tracks the acquisition channel and campaign attribution for each lead
 */
import type { LeadSourceType } from '../types/index.js';

/**
 * Represents the source of a lead for attribution tracking
 */
export interface LeadSource {
  /** Type of source that generated this lead */
  source_type: LeadSourceType;
  /** URL or reference to the source */
  source_url: string | null;
  /** Campaign identifier for paid/organic campaigns */
  campaign_id: string | null;
  /** Which agent discovered this lead */
  discovered_by_agent: string | null;
  /** Timestamp when the lead was discovered */
  discovered_at: number;
}

/**
 * Create a new lead source entry
 */
export function createLeadSource(
  sourceType: LeadSourceType,
  options?: {
    sourceUrl?: string;
    campaignId?: string;
    discoveredByAgent?: string;
  }
): LeadSource {
  return {
    source_type: sourceType,
    source_url: options?.sourceUrl ?? null,
    campaign_id: options?.campaignId ?? null,
    discovered_by_agent: options?.discoveredByAgent ?? null,
    discovered_at: 0, // Will be set by the caller with deterministic timestamp
  };
}

/**
 * Validate lead source data
 */
export function validateLeadSource(source: LeadSource): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!source.source_type) {
    errors.push('source_type is required');
  }

  if (source.source_url !== null && typeof source.source_url !== 'string') {
    errors.push('source_url must be a string or null');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Source metadata for reporting
 */
export interface SourceMetadata {
  type: LeadSourceType;
  displayName: string;
  category: 'organic' | 'paid' | 'community' | 'direct';
  estimatedReach: number;
}

/**
 * Source category mappings for reporting
 */
export const SOURCE_METADATA: Record<LeadSourceType, SourceMetadata> = {
  manual: {
    type: 'manual',
    displayName: 'Manual Entry',
    category: 'direct',
    estimatedReach: 1,
  },
  discord_scan: {
    type: 'discord_scan',
    displayName: 'Discord Server Scan',
    category: 'community',
    estimatedReach: 100,
  },
  steam_group: {
    type: 'steam_group',
    displayName: 'Steam Group',
    category: 'community',
    estimatedReach: 500,
  },
  reddit_thread: {
    type: 'reddit_thread',
    displayName: 'Reddit Thread',
    category: 'community',
    estimatedReach: 1000,
  },
  itchio_comment: {
    type: 'itchio_comment',
    displayName: 'itch.io Comment',
    category: 'community',
    estimatedReach: 50,
  },
  github_issue: {
    type: 'github_issue',
    displayName: 'GitHub Issue',
    category: 'community',
    estimatedReach: 10,
  },
  landing_page: {
    type: 'landing_page',
    displayName: 'Landing Page',
    category: 'direct',
    estimatedReach: 100,
  },
  referral: {
    type: 'referral',
    displayName: 'Referral Program',
    category: 'organic',
    estimatedReach: 5,
  },
  playtest_signup: {
    type: 'playtest_signup',
    displayName: 'Playtest Signup Form',
    category: 'direct',
    estimatedReach: 50,
  },
};