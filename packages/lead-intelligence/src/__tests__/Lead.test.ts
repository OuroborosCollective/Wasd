/**
 * Lead Model Tests
 * Comprehensive tests for the Lead model and its components
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLead,
  generateDeterministicLeadId,
  validateLead,
  canOutreach,
  getLeadPriority,
  addPlatformIdentifier,
  updateLeadScores,
  addAgentTask,
  type Lead,
  type AgentTask,
} from '../models/Lead.js';
import { createLeadSource } from '../models/LeadSource.js';
import { LeadSourceTypeEnum, PlatformEnum, TaskTypeEnum } from '../types/index.js';

describe('Lead Model', () => {
  describe('createLead', () => {
    it('should create a lead with default values', () => {
      const source = createLeadSource('manual');
      const lead = createLead('lead-001', 'Test User', source, 1000);

      expect(lead.lead_id).toBe('lead-001');
      expect(lead.display_name).toBe('Test User');
      expect(lead.email).toBeNull();
      expect(lead.segment).toBe('low_priority');
      expect(lead.final_score).toBe(0);
      expect(lead.created_at).toBe(1000);
      expect(lead.updated_at).toBe(1000);
    });

    it('should have all required sub-models initialized', () => {
      const source = createLeadSource('discord_scan');
      const lead = createLead('lead-002', 'Discord User', source, 2000);

      expect(lead.interest_signals).toBeDefined();
      expect(lead.interest_signals.likes_mmorpg).toBe(false);
      expect(lead.lead_source).toBeDefined();
      expect(lead.lead_source.source_type).toBe('discord_scan');
      expect(lead.scores).toBeDefined();
      expect(lead.outreach_state).toBeDefined();
      expect(lead.outreach_state.status).toBe('not_contacted');
      expect(lead.consent_state).toBeDefined();
      expect(lead.risk_signals).toBeDefined();
      expect(lead.playtest_feedback).toBeDefined();
      expect(lead.tasks).toEqual([]);
    });
  });

  describe('generateDeterministicLeadId', () => {
    it('should generate consistent IDs for the same input', () => {
      const id1 = generateDeterministicLeadId('steam', 'player123');
      const id2 = generateDeterministicLeadId('steam', 'player123');

      expect(id1).toBe(id2);
      expect(id1).toContain('LEAD-STE-');
    });

    it('should generate different IDs for different inputs', () => {
      const id1 = generateDeterministicLeadId('steam', 'player123');
      const id2 = generateDeterministicLeadId('discord', 'player123');

      expect(id1).not.toBe(id2);
    });

    it('should be deterministic across multiple calls', () => {
      const ids: string[] = [];
      for (let i = 0; i < 10; i++) {
        ids.push(generateDeterministicLeadId('github', 'testuser'));
      }

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(1);
    });
  });

  describe('validateLead', () => {
    it('should validate a correct lead', () => {
      const source = createLeadSource('manual');
      const lead = createLead('lead-003', 'Valid User', source);

      const result = validateLead(lead);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject lead without lead_id', () => {
      const source = createLeadSource('manual');
      const lead = createLead('', 'No ID User', source);

      const result = validateLead(lead);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('lead_id is required and must be a string');
    });

    it('should reject lead without display_name', () => {
      const source = createLeadSource('manual');
      const lead = createLead('lead-004', '', source);

      const result = validateLead(lead);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('display_name is required and must be a string');
    });
  });

  describe('canOutreach', () => {
    it('should return true for qualified lead with consent', () => {
      const source = createLeadSource('playtest_signup');
      const lead = createLead('lead-005', 'Qualified User', source, 100);
      lead.final_score = 70;
      lead.consent_state.has_consent = true;
      lead.consent_state.can_contact = true;

      expect(canOutreach(lead)).toBe(true);
    });

    it('should return false for lead without consent', () => {
      const source = createLeadSource('discord_scan');
      const lead = createLead('lead-006', 'No Consent User', source);
      lead.final_score = 80;

      expect(canOutreach(lead)).toBe(false);
    });

    it('should return false for blocked lead', () => {
      const source = createLeadSource('landing_page');
      const lead = createLead('lead-007', 'Blocked User', source);
      lead.final_score = 70;
      lead.segment = 'blocked';
      lead.consent_state.has_consent = true;
      lead.consent_state.can_contact = true;

      expect(canOutreach(lead)).toBe(false);
    });

    it('should return false for lead below score threshold', () => {
      const source = createLeadSource('referral');
      const lead = createLead('lead-008', 'Low Score User', source);
      lead.final_score = 40;
      lead.consent_state.has_consent = true;
      lead.consent_state.can_contact = true;

      expect(canOutreach(lead)).toBe(false);
    });
  });

  describe('getLeadPriority', () => {
    it('should calculate priority based on score and risk', () => {
      const source = createLeadSource('manual');
      const lead = createLead('lead-009', 'Priority User', source);
      lead.final_score = 80;
      lead.risk_signals.toxicity_risk = 20;
      lead.consent_state.has_consent = true;

      const priority = getLeadPriority(lead);
      expect(priority).toBeGreaterThan(0);
      expect(priority).toBeLessThanOrEqual(100);
    });

    it('should lower priority without consent', () => {
      const source = createLeadSource('manual');
      const lead1 = createLead('lead-010', 'With Consent', source);
      lead1.final_score = 80;
      lead1.consent_state.has_consent = true;

      const lead2 = createLead('lead-011', 'Without Consent', source);
      lead2.final_score = 80;
      lead2.consent_state.has_consent = false;

      const priority1 = getLeadPriority(lead1);
      const priority2 = getLeadPriority(lead2);

      expect(priority1).toBeGreaterThan(priority2);
    });
  });

  describe('addPlatformIdentifier', () => {
    it('should add platform identifier to lead', () => {
      const source = createLeadSource('manual');
      const lead = createLead('lead-012', 'Multi-Platform User', source);

      const updated = addPlatformIdentifier(lead, 'discord', 'user#1234', false);

      expect(updated.identifiers).toHaveLength(1);
      expect(updated.identifiers[0]?.platform).toBe('discord');
      expect(updated.identifiers[0]?.identifier).toBe('user#1234');
      expect(updated.identifiers[0]?.verified).toBe(false);
    });

    it('should preserve existing identifiers', () => {
      const source = createLeadSource('manual');
      const lead = createLead('lead-013', 'Platform User', source);

      const withSteam = addPlatformIdentifier(lead, 'steam', 'steamid123', true);
      const withDiscord = addPlatformIdentifier(withSteam, 'discord', 'discordid', false);

      expect(withDiscord.identifiers).toHaveLength(2);
      expect(withDiscord.identifiers[0]?.platform).toBe('steam');
      expect(withDiscord.identifiers[1]?.platform).toBe('discord');
    });
  });

  describe('updateLeadScores', () => {
    it('should update scores and recalculate final score', () => {
      const source = createLeadSource('manual');
      const lead = createLead('lead-014', 'Scored User', source);

      const updated = updateLeadScores(
        lead,
        {
          activity_score: 70,
          mmorpg_fit_score: 80,
          android_fit_score: 60,
        },
        500
      );

      expect(updated.scores.activity_score).toBe(70);
      expect(updated.scores.mmorpg_fit_score).toBe(80);
      expect(updated.scores.android_fit_score).toBe(60);
      expect(updated.final_score).toBeGreaterThan(0);
      expect(updated.scoring_context).toBeDefined();
      expect(updated.scoring_context?.tick).toBe(500);
    });

    it('should preserve scoring context', () => {
      const source = createLeadSource('manual');
      const lead = createLead('lead-015', 'Context User', source);

      const updated = updateLeadScores(lead, { activity_score: 50 }, 1000);

      expect(updated.scoring_context?.tick).toBe(1000);
      expect(updated.scoring_context?.seed).toBe('lead-015');
      expect(updated.scoring_context?.ruleset_version).toBe('v1.0.0');
    });
  });

  describe('addAgentTask', () => {
    it('should add agent task to lead', () => {
      const source = createLeadSource('manual');
      const lead = createLead('lead-016', 'Task User', source);

      const updated = addAgentTask(lead, 'score_lead', 'task-001', 2000);

      expect(updated.tasks).toHaveLength(1);
      expect(updated.tasks[0]?.task_id).toBe('task-001');
      expect(updated.tasks[0]?.task_type).toBe('score_lead');
      expect(updated.tasks[0]?.status).toBe('pending');
    });

    it('should preserve existing tasks', () => {
      const source = createLeadSource('manual');
      const lead = createLead('lead-017', 'Multi-Task User', source);

      const withTask1 = addAgentTask(lead, 'extract_lead', 'task-001', 100);
      const withTask2 = addAgentTask(withTask1, 'score_lead', 'task-002', 200);

      expect(withTask2.tasks).toHaveLength(2);
    });
  });
});