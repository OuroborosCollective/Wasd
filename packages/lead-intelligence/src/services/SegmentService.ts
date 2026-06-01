/**
 * SegmentService
 * Automatically assigns leads to segments based on their signals and scores
 */
import type { LeadSegment } from '../types/index.js';
import type { Lead } from '../models/Lead.js';
import type { LeadScores } from '../models/LeadScores.js';
import type { PlayerInterestSignals } from '../models/PlayerInterestSignals.js';
import type { RiskSignals } from '../models/RiskSignals.js';
import { calculateFinalScore } from '../models/LeadScores.js';

/**
 * Segment assignment rules
 */
interface SegmentRule {
  segment: LeadSegment;
  priority: number;
  condition: (lead: Lead, signals: PlayerInterestSignals, scores: LeadScores, risks: RiskSignals) => boolean;
}

/**
 * Segment assignment rules in priority order
 */
const SEGMENT_RULES: SegmentRule[] = [
  // Blocked leads first
  {
    segment: 'blocked',
    priority: 100,
    condition: (_lead, _signals, _scores, risks) => risks.suspected_bot || risks.toxicity_risk >= 80,
  },
  // Technical contributors (high GitHub/technical signals)
  {
    segment: 'technical_contributor',
    priority: 90,
    condition: (_lead, _signals, scores) => scores.tester_quality_score >= 80 && scores.activity_score >= 60,
  },
  // Content creators (high social reach)
  {
    segment: 'content_creator',
    priority: 80,
    condition: (_lead, _signals, scores) => scores.social_reach_score >= 70,
  },
  // Guild leaders (high activity + retention)
  {
    segment: 'guild_leader',
    priority: 70,
    condition: (_lead, _signals, scores) => scores.activity_score >= 70 && scores.retention_potential_score >= 60,
  },
  // Alpha testers (top quality + early access interest)
  {
    segment: 'alpha_tester',
    priority: 60,
    condition: (lead, signals, scores) =>
      signals.likes_testing && scores.tester_quality_score >= 70 && lead.final_score >= 80,
  },
  // Beta testers (good quality + testing interest)
  {
    segment: 'beta_tester',
    priority: 50,
    condition: (lead, signals, scores) =>
      signals.likes_testing && scores.tester_quality_score >= 50 && lead.final_score >= 50,
  },
  // PvP players
  {
    segment: 'pvp_player',
    priority: 40,
    condition: (_lead, signals, _scores) => signals.likes_pvp,
  },
  // Crafters/Economy players
  {
    segment: 'crafter_economy_player',
    priority: 30,
    condition: (_lead, signals, _scores) => signals.likes_crafting,
  },
  // Lore/Roleplay players
  {
    segment: 'lore_roleplay_player',
    priority: 20,
    condition: (_lead, signals, _scores) => signals.likes_roleplay,
  },
  // Casual players (some MMORPG interest but low scores)
  {
    segment: 'casual_player',
    priority: 10,
    condition: (_lead, signals, _scores) => signals.likes_mmorpg || signals.likes_browser_games,
  },
];

/**
 * Assign a lead to the best matching segment
 */
export function assignSegment(lead: Lead): { segment: LeadSegment; previousSegment: LeadSegment } {
  const previousSegment = lead.segment;

  // Find the highest priority matching rule
  // Higher priority number = checked first (descending sort)
  const sortedRules = [...SEGMENT_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    if (rule.condition(lead, lead.interest_signals, lead.scores, lead.risk_signals)) {
      return { segment: rule.segment, previousSegment };
    }
  }

  // Default to low_priority if no rules match
  return { segment: 'low_priority', previousSegment };
}

/**
 * Check if a lead qualifies for a specific segment
 */
export function qualifiesForSegment(lead: Lead, targetSegment: LeadSegment): boolean {
  const { segment } = assignSegment(lead);
  return segment === targetSegment;
}

/**
 * Get segment display name
 */
export function getSegmentDisplayName(segment: LeadSegment): string {
  const displayNames: Record<LeadSegment, string> = {
    alpha_tester: 'Alpha Tester',
    beta_tester: 'Beta Tester',
    guild_leader: 'Guild Leader',
    content_creator: 'Content Creator',
    technical_contributor: 'Technical Contributor',
    casual_player: 'Casual Player',
    pvp_player: 'PvP Player',
    crafter_economy_player: 'Crafter/Economy Player',
    lore_roleplay_player: 'Lore/Roleplay Player',
    low_priority: 'Low Priority',
    blocked: 'Blocked',
  };

  return displayNames[segment] ?? segment;
}

/**
 * Get segment description
 */
export function getSegmentDescription(segment: LeadSegment): string {
  const descriptions: Record<LeadSegment, string> = {
    alpha_tester: 'Top-tier testers for early access, requires high trust score',
    beta_tester: 'Regular beta testers for upcoming releases',
    guild_leader: 'Community leaders for guild recruitment and events',
    content_creator: 'Streamers and content creators for marketing outreach',
    technical_contributor: 'Bug reporters and technical feedback providers',
    casual_player: 'General audience for marketing campaigns',
    pvp_player: 'Focused on competitive PvP content',
    crafter_economy_player: 'Interested in crafting and in-game economy',
    lore_roleplay_player: 'Focused on story and roleplay elements',
    low_priority: 'Needs more qualification before outreach',
    blocked: 'Do not contact - risk signals detected',
  };

  return descriptions[segment] ?? 'Unknown segment';
}

/**
 * Get all segments with their metadata
 */
export function getAllSegments(): Array<{ segment: LeadSegment; displayName: string; description: string; priority: number }> {
  return [
    { segment: 'alpha_tester', displayName: getSegmentDisplayName('alpha_tester'), description: getSegmentDescription('alpha_tester'), priority: 60 },
    { segment: 'beta_tester', displayName: getSegmentDisplayName('beta_tester'), description: getSegmentDescription('beta_tester'), priority: 50 },
    { segment: 'guild_leader', displayName: getSegmentDisplayName('guild_leader'), description: getSegmentDescription('guild_leader'), priority: 70 },
    { segment: 'content_creator', displayName: getSegmentDisplayName('content_creator'), description: getSegmentDescription('content_creator'), priority: 80 },
    { segment: 'technical_contributor', displayName: getSegmentDisplayName('technical_contributor'), description: getSegmentDescription('technical_contributor'), priority: 90 },
    { segment: 'casual_player', displayName: getSegmentDisplayName('casual_player'), description: getSegmentDescription('casual_player'), priority: 10 },
    { segment: 'pvp_player', displayName: getSegmentDisplayName('pvp_player'), description: getSegmentDescription('pvp_player'), priority: 40 },
    { segment: 'crafter_economy_player', displayName: getSegmentDisplayName('crafter_economy_player'), description: getSegmentDescription('crafter_economy_player'), priority: 30 },
    { segment: 'lore_roleplay_player', displayName: getSegmentDisplayName('lore_roleplay_player'), description: getSegmentDescription('lore_roleplay_player'), priority: 20 },
    { segment: 'low_priority', displayName: getSegmentDisplayName('low_priority'), description: getSegmentDescription('low_priority'), priority: 0 },
    { segment: 'blocked', displayName: getSegmentDisplayName('blocked'), description: getSegmentDescription('blocked'), priority: 100 },
  ];
}