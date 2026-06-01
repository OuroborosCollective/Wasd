/**
 * IdentityLink model
 * Anti-duplicate system for linking the same person across platforms
 */
import type { Platform } from '../types/index.js';

/**
 * Links a platform identifier to a canonical lead
 */
export interface IdentityLink {
  /** The canonical (master) lead ID this identifier belongs to */
  canonical_lead_id: string;
  /** Platform where this identifier exists */
  platform: Platform;
  /** The identifier value (username, ID, handle, etc.) */
  identifier: string;
  /** Confidence score that this is the same person (0-1) */
  confidence: number;
  /** Evidence strings supporting the link */
  evidence: string[];
}

/**
 * Create a new identity link
 */
export function createIdentityLink(
  canonicalLeadId: string,
  platform: Platform,
  identifier: string,
  confidence: number,
  evidence: string[] = []
): IdentityLink {
  return {
    canonical_lead_id: canonicalLeadId,
    platform,
    identifier,
    confidence: Math.max(0, Math.min(1, confidence)),
    evidence,
  };
}

/**
 * Validate identity link
 */
export function validateIdentityLink(link: IdentityLink): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!link.canonical_lead_id || typeof link.canonical_lead_id !== 'string') {
    errors.push('canonical_lead_id is required and must be a string');
  }

  if (!link.identifier || typeof link.identifier !== 'string') {
    errors.push('identifier is required and must be a string');
  }

  if (typeof link.confidence !== 'number' || link.confidence < 0 || link.confidence > 1) {
    errors.push('confidence must be a number between 0 and 1');
  }

  if (!Array.isArray(link.evidence)) {
    errors.push('evidence must be an array');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Confidence thresholds for identity matching
 */
export const CONFIDENCE_THRESHOLDS = {
  EXACT_MATCH: 1.0,
  HIGH_CONFIDENCE: 0.9,
  MEDIUM_CONFIDENCE: 0.7,
  LOW_CONFIDENCE: 0.5,
  SUSPICIOUS: 0.3,
} as const;

/**
 * Check if identity link is strong enough to merge
 */
export function canMergeIdentities(link: IdentityLink): boolean {
  return link.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM_CONFIDENCE;
}

/**
 * Get confidence label
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= CONFIDENCE_THRESHOLDS.EXACT_MATCH) return 'Exact Match';
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE) return 'High Confidence';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM_CONFIDENCE) return 'Medium Confidence';
  if (confidence >= CONFIDENCE_THRESHOLDS.LOW_CONFIDENCE) return 'Low Confidence';
  return 'Needs Verification';
}

/**
 * Calculate merged confidence from multiple links
 */
export function calculateMergedConfidence(links: IdentityLink[]): number {
  if (links.length === 0) return 0;

  // Use weighted average with platform weights
  const platformWeights: Record<Platform, number> = {
    steam: 0.9,
    discord: 0.85,
    battlenet: 0.85,
    riot: 0.8,
    epic: 0.8,
    itchio: 0.75,
    reddit: 0.6,
    youtube: 0.6,
    tiktok: 0.5,
    twitch: 0.7,
    guilded: 0.8,
    matrix: 0.7,
    telegram: 0.6,
    github: 0.9,
    producthunt: 0.5,
    indiehackers: 0.5,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const link of links) {
    const weight = platformWeights[link.platform] ?? 0.5;
    weightedSum += link.confidence * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
}