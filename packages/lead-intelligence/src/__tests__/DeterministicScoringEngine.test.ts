/**
 * Deterministic Scoring Engine Tests
 * Tests for reproducible scoring calculations
 */
import { describe, it, expect } from 'vitest';
import {
  deterministicHash,
  calculateLeadStateHash,
  calculateScoringInputHash,
  scoreLead,
  scoreLeadBatch,
  validateScoringContext,
  replayScoringRun,
} from '../services/DeterministicScoringEngine.js';
import { createLead } from '../models/Lead.js';
import { createLeadSource } from '../models/LeadSource.js';
import type { LeadScores } from '../models/LeadScores.js';

describe('DeterministicScoringEngine', () => {
  describe('deterministicHash', () => {
    it('should produce consistent hash for same input', () => {
      const hash1 = deterministicHash('test-input-123');
      const hash2 = deterministicHash('test-input-123');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = deterministicHash('input-a');
      const hash2 = deterministicHash('input-b');

      expect(hash1).not.toBe(hash2);
    });

    it('should be deterministic across multiple calls', () => {
      const hashes: string[] = [];
      for (let i = 0; i < 100; i++) {
        hashes.push(deterministicHash('consistent-input'));
      }

      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1);
    });

    it('should handle empty string', () => {
      const hash = deterministicHash('');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle special characters', () => {
      const hash = deterministicHash('special!@#$%^&*()characters');
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('calculateLeadStateHash', () => {
    it('should produce consistent hash for same lead state', () => {
      const source = createLeadSource('manual');
      const lead1 = createLead('test-001', 'Test User', source, 1000);
      const lead2 = createLead('test-001', 'Test User', source, 1000);

      const hash1 = calculateLeadStateHash(lead1);
      const hash2 = calculateLeadStateHash(lead2);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash when score changes', () => {
      const source = createLeadSource('manual');
      const lead1 = createLead('test-002', 'Test User', source);
      const lead2 = createLead('test-002', 'Test User', source);
      lead2.final_score = 50;

      const hash1 = calculateLeadStateHash(lead1);
      const hash2 = calculateLeadStateHash(lead2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('calculateScoringInputHash', () => {
    it('should produce consistent hash for same scoring input', () => {
      const scores: LeadScores = {
        activity_score: 70,
        mmorpg_fit_score: 80,
        android_fit_score: 60,
        browser_game_fit_score: 50,
        social_reach_score: 40,
        tester_quality_score: 75,
        toxicity_risk_score: 10,
        retention_potential_score: 65,
      };

      const hash1 = calculateScoringInputHash('lead-001', scores);
      const hash2 = calculateScoringInputHash('lead-001', scores);

      expect(hash1).toBe(hash2);
    });
  });

  describe('scoreLead', () => {
    it('should score a lead deterministically', () => {
      const source = createLeadSource('playtest_signup');
      const lead = createLead('score-001', 'Score Test', source, 5000);

      const result = scoreLead(
        lead,
        {
          activity_score: 70,
          mmorpg_fit_score: 80,
          android_fit_score: 60,
        },
        5000
      );

      expect(result.lead.scores.activity_score).toBe(70);
      expect(result.lead.scores.mmorpg_fit_score).toBe(80);
      expect(result.lead.final_score).toBeGreaterThan(0);
      expect(result.context.tick).toBe(5000);
      expect(result.context.ruleset_version).toBe('v1.0.0');
    });

    it('should qualify lead above threshold', () => {
      const source = createLeadSource('manual');
      const lead = createLead('score-002', 'High Score', source, 1000);

      const result = scoreLead(
        lead,
        {
          activity_score: 80,
          mmorpg_fit_score: 90,
          android_fit_score: 85,
          browser_game_fit_score: 80,
          social_reach_score: 70,
          tester_quality_score: 80,
          toxicity_risk_score: 5,
          retention_potential_score: 75,
        },
        1000
      );

      expect(result.qualified).toBe(true);
      expect(result.lead.final_score).toBeGreaterThanOrEqual(50);
    });

    it('should not qualify lead with high toxicity', () => {
      const source = createLeadSource('manual');
      const lead = createLead('score-003', 'Toxic User', source, 1000);

      const result = scoreLead(
        lead,
        {
          activity_score: 70,
          toxicity_risk_score: 85,
        },
        1000
      );

      expect(result.qualified).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should provide scoring context for audit', () => {
      const source = createLeadSource('reddit_thread');
      const lead = createLead('score-004', 'Audit Test', source, 10000);

      const result = scoreLead(lead, { activity_score: 60 }, 10000);

      expect(result.context.state_hash_before).toBeDefined();
      expect(result.context.state_hash_after).toBeDefined();
      expect(result.context.scoring_input_hash).toBeDefined();
      expect(result.context.scoring_output_hash).toBeDefined();
    });
  });

  describe('scoreLeadBatch', () => {
    it('should score multiple leads deterministically', () => {
      const source = createLeadSource('manual');
      const leads = [
        createLead('batch-001', 'User 1', source, 2000),
        createLead('batch-002', 'User 2', source, 2000),
        createLead('batch-003', 'User 3', source, 2000),
      ];

      const results = scoreLeadBatch(
        leads,
        (lead) => ({
          activity_score: 70,
          mmorpg_fit_score: 80,
        }),
        2000
      );

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.lead.lead_id).toBe(`batch-00${index + 1}`);
        expect(result.context.tick).toBe(2000);
      });
    });

    it('should produce consistent batch results', () => {
      const source = createLeadSource('discord_scan');
      const leads = [
        createLead('batch-001', 'User 1', source, 3000),
        createLead('batch-002', 'User 2', source, 3000),
      ];

      const results1 = scoreLeadBatch(leads, (l) => ({ activity_score: 75 }), 3000);
      const results2 = scoreLeadBatch(leads, (l) => ({ activity_score: 75 }), 3000);

      results1.forEach((r1, i) => {
        expect(r1.context.scoring_output_hash).toBe(results2[i]?.context.scoring_output_hash);
      });
    });
  });

  describe('validateScoringContext', () => {
    it('should validate correct context', () => {
      const source = createLeadSource('manual');
      const lead = createLead('validate-001', 'Context Test', source, 1000);

      const result = scoreLead(lead, { activity_score: 50 }, 1000);
      const validation = validateScoringContext(result.context, 1000);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject mismatched tick', () => {
      const source = createLeadSource('manual');
      const lead = createLead('validate-002', 'Tick Mismatch', source, 500);

      const result = scoreLead(lead, { activity_score: 50 }, 500);
      const validation = validateScoringContext(result.context, 1000);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Tick'))).toBe(true);
    });

    it('should reject mismatched ruleset version', () => {
      const source = createLeadSource('manual');
      const lead = createLead('validate-003', 'Version Mismatch', source, 1000);

      const result = scoreLead(lead, { activity_score: 50 }, 1000);
      const validation = validateScoringContext(result.context, 1000, 'v2.0.0');

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Ruleset'))).toBe(true);
    });
  });

  describe('replayScoringRun', () => {
    it('should replay scoring run with same result', () => {
      const source = createLeadSource('manual');
      const lead = createLead('replay-001', 'Replay Test', source, 4000);
      const scores = { activity_score: 75, mmorpg_fit_score: 80 };

      // Initial scoring run
      const initialResult = scoreLead(lead, scores, 4000);

      // Replay the same run
      const replayResult = replayScoringRun(lead, scores, initialResult.context);

      expect(replayResult.matches).toBe(true);
      expect(replayResult.discrepancies).toHaveLength(0);
    });

    it('should detect discrepancies in scoring input', () => {
      const source = createLeadSource('manual');
      const lead = createLead('replay-002', 'Discrepancy Test', source, 4000);
      const originalScores = { activity_score: 75 };
      const changedScores = { activity_score: 80 };

      const initialResult = scoreLead(lead, originalScores, 4000);
      const replayResult = replayScoringRun(lead, changedScores, initialResult.context);

      expect(replayResult.matches).toBe(false);
      expect(replayResult.discrepancies.length).toBeGreaterThan(0);
    });
  });
});