/**
 * Segment Service Tests
 * Tests for segment assignment logic
 */
import { describe, it, expect } from 'vitest';
import {
  assignSegment,
  qualifiesForSegment,
  getSegmentDisplayName,
  getSegmentDescription,
  getAllSegments,
} from '../services/SegmentService.js';
import { createLead } from '../models/Lead.js';
import { createLeadSource } from '../models/LeadSource.js';

describe('SegmentService', () => {
  describe('assignSegment', () => {
    it('should assign blocked segment for suspected bots', () => {
      const source = createLeadSource('manual');
      const lead = createLead('seg-001', 'Bot Suspect', source);
      lead.risk_signals.suspected_bot = true;

      const { segment } = assignSegment(lead);
      expect(segment).toBe('blocked');
    });

    it('should assign blocked segment for high toxicity', () => {
      const source = createLeadSource('manual');
      const lead = createLead('seg-002', 'Toxic User', source);
      lead.risk_signals.toxicity_risk = 85;

      const { segment } = assignSegment(lead);
      expect(segment).toBe('blocked');
    });

    it('should assign technical_contributor for high quality testers', () => {
      const source = createLeadSource('github_issue');
      const lead = createLead('seg-003', 'Tech Tester', source);
      lead.scores.tester_quality_score = 85;
      lead.scores.activity_score = 70;

      const { segment } = assignSegment(lead);
      expect(segment).toBe('technical_contributor');
    });

    it('should assign content_creator for high social reach', () => {
      const source = createLeadSource('youtube');
      const lead = createLead('seg-004', 'Streamer', source);
      lead.scores.social_reach_score = 80;

      const { segment } = assignSegment(lead);
      expect(segment).toBe('content_creator');
    });

    it('should assign guild_leader for high activity and retention', () => {
      const source = createLeadSource('discord_scan');
      const lead = createLead('seg-005', 'Guild Leader', source);
      lead.scores.activity_score = 75;
      lead.scores.retention_potential_score = 65;

      const { segment } = assignSegment(lead);
      expect(segment).toBe('guild_leader');
    });

    it('should assign alpha_tester for top quality with testing interest', () => {
      const source = createLeadSource('playtest_signup');
      const lead = createLead('seg-006', 'Alpha Tester', source);
      lead.interest_signals.likes_testing = true;
      lead.scores.tester_quality_score = 75; // Below 80 to avoid technical_contributor
      lead.scores.mmorpg_fit_score = 90;
      lead.scores.android_fit_score = 85;
      lead.scores.browser_game_fit_score = 80;
      lead.scores.activity_score = 60; // Below 70 to avoid guild_leader
      lead.scores.social_reach_score = 50;
      lead.scores.retention_potential_score = 50; // Below 60 to avoid guild_leader
      // Set final score directly - must be >= 80 for alpha_tester
      lead.final_score = 85;

      const { segment } = assignSegment(lead);
      expect(segment).toBe('alpha_tester');
    });

    it('should assign beta_tester for good quality with testing interest', () => {
      const source = createLeadSource('landing_page');
      const lead = createLead('seg-007', 'Beta Tester', source);
      lead.interest_signals.likes_testing = true;
      lead.scores.tester_quality_score = 60;
      lead.scores.mmorpg_fit_score = 70;
      lead.scores.android_fit_score = 65;
      lead.scores.browser_game_fit_score = 60;
      lead.scores.activity_score = 50;
      // Set final score directly - >= 50 for beta_tester
      lead.final_score = 60;

      const { segment } = assignSegment(lead);
      expect(segment).toBe('beta_tester');
    });

    it('should assign pvp_player for PvP interest', () => {
      const source = createLeadSource('manual');
      const lead = createLead('seg-008', 'PvP Fan', source);
      lead.interest_signals.likes_pvp = true;
      lead.interest_signals.likes_mmorpg = true;
      lead.scores.mmorpg_fit_score = 70;

      const { segment } = assignSegment(lead);
      expect(segment).toBe('pvp_player');
    });

    it('should assign crafter_economy_player for crafting interest', () => {
      const source = createLeadSource('manual');
      const lead = createLead('seg-009', 'Crafter', source);
      lead.interest_signals.likes_crafting = true;

      const { segment } = assignSegment(lead);
      expect(segment).toBe('crafter_economy_player');
    });

    it('should assign lore_roleplay_player for roleplay interest', () => {
      const source = createLeadSource('reddit_thread');
      const lead = createLead('seg-010', 'RPer', source);
      lead.interest_signals.likes_roleplay = true;

      const { segment } = assignSegment(lead);
      expect(segment).toBe('lore_roleplay_player');
    });

    it('should assign casual_player for general MMORPG interest', () => {
      const source = createLeadSource('steam_group');
      const lead = createLead('seg-011', 'Casual MMORPG Fan', source);
      lead.interest_signals.likes_mmorpg = true;

      const { segment } = assignSegment(lead);
      expect(segment).toBe('casual_player');
    });

    it('should return previous segment in result', () => {
      const source = createLeadSource('manual');
      const lead = createLead('seg-012', 'Segment Change', source);
      lead.segment = 'low_priority';

      const result = assignSegment(lead);
      expect(result.previousSegment).toBe('low_priority');
    });
  });

  describe('qualifiesForSegment', () => {
    it('should return true when lead qualifies for segment', () => {
      const source = createLeadSource('playtest_signup');
      const lead = createLead('qual-001', 'Qualifies', source);
      lead.interest_signals.likes_testing = true;
      lead.scores.tester_quality_score = 75; // Below 80 to avoid technical_contributor
      lead.scores.mmorpg_fit_score = 90;
      lead.scores.android_fit_score = 85;
      lead.scores.browser_game_fit_score = 80;
      lead.scores.activity_score = 60; // Below 70 to avoid guild_leader
      lead.scores.social_reach_score = 50;
      lead.scores.retention_potential_score = 50; // Below 60 to avoid guild_leader
      // Set final score directly - >= 80 for alpha_tester
      lead.final_score = 85;

      expect(qualifiesForSegment(lead, 'alpha_tester')).toBe(true);
    });

    it('should return false when lead does not qualify', () => {
      const source = createLeadSource('manual');
      const lead = createLead('qual-002', 'Does Not Qualify', source);
      lead.interest_signals.likes_testing = false;

      expect(qualifiesForSegment(lead, 'alpha_tester')).toBe(false);
    });
  });

  describe('getSegmentDisplayName', () => {
    it('should return human-readable segment names', () => {
      expect(getSegmentDisplayName('alpha_tester')).toBe('Alpha Tester');
      expect(getSegmentDisplayName('beta_tester')).toBe('Beta Tester');
      expect(getSegmentDisplayName('guild_leader')).toBe('Guild Leader');
      expect(getSegmentDisplayName('content_creator')).toBe('Content Creator');
      expect(getSegmentDisplayName('blocked')).toBe('Blocked');
    });
  });

  describe('getSegmentDescription', () => {
    it('should return descriptions for all segments', () => {
      const segments = [
        'alpha_tester',
        'beta_tester',
        'guild_leader',
        'content_creator',
        'technical_contributor',
        'casual_player',
        'pvp_player',
        'crafter_economy_player',
        'lore_roleplay_player',
        'low_priority',
        'blocked',
      ];

      segments.forEach((segment) => {
        const description = getSegmentDescription(segment as any);
        expect(description).toBeDefined();
        expect(description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getAllSegments', () => {
    it('should return all segments with metadata', () => {
      const segments = getAllSegments();

      expect(segments.length).toBe(11);
      segments.forEach((seg) => {
        expect(seg.segment).toBeDefined();
        expect(seg.displayName).toBeDefined();
        expect(seg.description).toBeDefined();
        expect(typeof seg.priority).toBe('number');
      });
    });

    it('should have blocked as highest priority', () => {
      const segments = getAllSegments();
      const blocked = segments.find((s) => s.segment === 'blocked');

      expect(blocked?.priority).toBe(100);
    });
  });
});