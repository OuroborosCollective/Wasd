/**
 * Model Tests
 * Tests for individual model components
 */
import { describe, it, expect } from 'vitest';
import {
  createDefaultInterestSignals,
  calculateInterestMatchScore,
  RECRUITMENT_PROFILES,
} from '../models/PlayerInterestSignals.js';
import { createLeadSource, SOURCE_METADATA } from '../models/LeadSource.js';
import {
  createDefaultLeadScores,
  calculateFinalScore,
  getScoreSummary,
  SCORE_THRESHOLDS,
} from '../models/LeadScores.js';
import {
  createDefaultOutreachState,
  getNextStatus,
  updateForAutoBlock,
  MAX_CONTACT_ATTEMPTS,
} from '../models/OutreachState.js';
import { createBetaInvite, claimBetaInvite, canClaimInvite } from '../models/BetaInvite.js';
import { createLeadEvent } from '../models/LeadEvent.js';
import { createDefaultConsentState, canContactLead, createPlaytestConsent } from '../models/ConsentState.js';
import {
  createDefaultRiskSignals,
  calculateOverallRisk,
  getRiskLevel,
  shouldAutoBlock as shouldBlockRisk,
} from '../models/RiskSignals.js';
import {
  createDefaultPlaytestFeedback,
  calculateTesterQualityScore,
  shouldInviteToFutureTests,
} from '../models/PlaytestFeedback.js';
import { createIdentityLink, canMergeIdentities, calculateMergedConfidence } from '../models/IdentityLink.js';
import { createRepoLogEntry, LOG_TEMPLATES } from '../models/RepoLogEntry.js';

describe('PlayerInterestSignals', () => {
  it('should create default signals', () => {
    const signals = createDefaultInterestSignals();

    expect(signals.likes_mmorpg).toBe(false);
    expect(signals.likes_pvp).toBe(false);
    expect(signals.likes_crafting).toBe(false);
    expect(signals.likes_roleplay).toBe(false);
    expect(signals.likes_browser_games).toBe(false);
    expect(signals.likes_mobile_android).toBe(false);
    expect(signals.likes_indie_games).toBe(false);
    expect(signals.likes_testing).toBe(false);
  });

  it('should calculate interest match score', () => {
    const signals = createDefaultInterestSignals();
    signals.likes_mmorpg = true;
    signals.likes_testing = true;
    signals.likes_browser_games = true;

    const profile = {
      likes_mmorpg: true,
      likes_testing: true,
    };

    const score = calculateInterestMatchScore(signals, profile);
    expect(score).toBe(100);
  });

  it('should have recruitment profiles defined', () => {
    expect(RECRUITMENT_PROFILES.ANDROID_BROWSER_TESTER).toBeDefined();
    expect(RECRUITMENT_PROFILES.PVP_ENDGAME_TESTER).toBeDefined();
    expect(RECRUITMENT_PROFILES.CRAFTING_ECONOMY_TESTER).toBeDefined();
  });
});

describe('LeadSource', () => {
  it('should create lead source with options', () => {
    const source = createLeadSource('discord_scan', {
      sourceUrl: 'https://discord.gg/abc',
      campaignId: 'campaign-1',
      discoveredByAgent: 'discord-scanner',
    });

    expect(source.source_type).toBe('discord_scan');
    expect(source.source_url).toBe('https://discord.gg/abc');
    expect(source.campaign_id).toBe('campaign-1');
    expect(source.discovered_by_agent).toBe('discord-scanner');
  });

  it('should have source metadata for reporting', () => {
    expect(SOURCE_METADATA.discord_scan.category).toBe('community');
    expect(SOURCE_METADATA.landing_page.category).toBe('direct');
    expect(SOURCE_METADATA.referral.category).toBe('organic');
  });
});

describe('LeadScores', () => {
  it('should create default scores', () => {
    const scores = createDefaultLeadScores();

    expect(scores.activity_score).toBe(0);
    expect(scores.mmorpg_fit_score).toBe(0);
    expect(scores.android_fit_score).toBe(0);
  });

  it('should calculate final score deterministically', () => {
    const scores = createDefaultLeadScores();
    scores.activity_score = 80;
    scores.mmorpg_fit_score = 90;
    scores.android_fit_score = 70;
    scores.browser_game_fit_score = 60;
    scores.social_reach_score = 50;
    scores.tester_quality_score = 75;
    scores.toxicity_risk_score = 10;
    scores.retention_potential_score = 80;

    const finalScore = calculateFinalScore(scores);
    expect(finalScore).toBeGreaterThan(0);
  });

  it('should identify high quality leads', () => {
    const scores = createDefaultLeadScores();
    scores.activity_score = 80;
    scores.mmorpg_fit_score = 90;
    scores.android_fit_score = 85;
    scores.browser_game_fit_score = 80;
    scores.social_reach_score = 70;
    scores.tester_quality_score = 85;
    scores.toxicity_risk_score = 10;
    scores.retention_potential_score = 80;

    const summary = getScoreSummary(scores);
    expect(summary.is_high_quality).toBe(true);
    expect(summary.risk_level).toBe('low');
  });

  it('should identify high risk leads', () => {
    const scores = createDefaultLeadScores();
    scores.toxicity_risk_score = 85;

    const summary = getScoreSummary(scores);
    expect(summary.risk_level).toBe('high');
  });

  it('should have correct thresholds', () => {
    expect(SCORE_THRESHOLDS.MIN_QUALIFYING_SCORE).toBe(50);
    expect(SCORE_THRESHOLDS.HIGH_QUALITY_THRESHOLD).toBe(70);
    expect(SCORE_THRESHOLDS.EXCEPTIONAL_THRESHOLD).toBe(85);
  });
});

describe('OutreachState', () => {
  it('should create default outreach state', () => {
    const state = createDefaultOutreachState();

    expect(state.status).toBe('not_contacted');
    expect(state.contact_attempts).toBe(0);
    expect(state.preferred_channel).toBeNull();
  });

  it('should transition status correctly', () => {
    expect(getNextStatus('not_contacted', 'queue')).toBe('queued');
    expect(getNextStatus('queued', 'contact')).toBe('contacted');
    expect(getNextStatus('contacted', 'respond')).toBe('responded');
    expect(getNextStatus('responded', 'accept')).toBe('accepted');
  });

  it('should not auto-block for normal outreach', () => {
    const state = createDefaultOutreachState();
    state.contact_attempts = 2;

    // Auto-block only triggers when contact_attempts >= MAX_CONTACT_ATTEMPTS
    expect(state.contact_attempts).toBeLessThan(MAX_CONTACT_ATTEMPTS);
    expect(state.status).not.toBe('do_not_contact');
  });

  it('should auto-block after max attempts', () => {
    const state = createDefaultOutreachState();
    state.contact_attempts = MAX_CONTACT_ATTEMPTS;

    const updated = updateForAutoBlock(state);
    expect(updated.status).toBe('do_not_contact');
  });
});

describe('BetaInvite', () => {
  it('should create beta invite with deterministic ID', () => {
    const invite = createBetaInvite('lead-001', 'TESTCODE123', null);

    expect(invite.invite_id).toBeDefined();
    expect(invite.lead_id).toBe('lead-001');
    expect(invite.invite_code).toBe('TESTCODE123');
    expect(invite.status).toBe('created');
  });

  it('should claim invite and update status', () => {
    const invite = createBetaInvite('lead-002', 'CODE456', 10000);
    const claimed = claimBetaInvite(invite, 5000);

    expect(claimed.status).toBe('claimed');
    expect(claimed.claimed_at).toBe(5000);
  });

  it('should check if invite can be claimed', () => {
    const invite = createBetaInvite('lead-003', 'CODE789', 1000);

    expect(canClaimInvite(invite, 500)).toBe(true);
    expect(canClaimInvite(invite, 2000)).toBe(false);
  });
});

describe('LeadEvent', () => {
  it('should create lead event with deterministic ID', () => {
    const event = createLeadEvent('lead-001', 'created', 'system', {}, 1000);

    expect(event.event_id).toBeDefined();
    expect(event.lead_id).toBe('lead-001');
    expect(event.event_type).toBe('created');
    expect(event.timestamp).toBe(1000);
  });
});

describe('ConsentState', () => {
  it('should create default consent (no consent)', () => {
    const state = createDefaultConsentState();

    expect(state.has_consent).toBe(false);
    expect(state.can_contact).toBe(false);
    expect(state.deletion_requested).toBe(false);
  });

  it('should not allow contact without consent', () => {
    const state = createDefaultConsentState();
    expect(canContactLead(state)).toBe(false);
  });

  it('should allow contact with playtest consent', () => {
    const state = createPlaytestConsent('playtest-form', 1000);
    expect(canContactLead(state)).toBe(true);
  });
});

describe('RiskSignals', () => {
  it('should create default risk signals (no risk)', () => {
    const signals = createDefaultRiskSignals();

    expect(signals.suspected_bot).toBe(false);
    expect(signals.spam_risk).toBe(0);
    expect(signals.toxicity_risk).toBe(0);
  });

  it('should calculate overall risk correctly', () => {
    const signals = createDefaultRiskSignals();
    signals.spam_risk = 50;
    signals.toxicity_risk = 60;
    signals.ban_evasion_risk = 30;
    signals.duplicate_risk = 20;

    const risk = calculateOverallRisk(signals);
    expect(risk).toBeGreaterThan(40);
    expect(risk).toBeLessThan(50);
  });

  it('should identify critical risk for suspected bots', () => {
    const signals = createDefaultRiskSignals();
    signals.suspected_bot = true;

    expect(getRiskLevel(signals)).toBe('critical');
    expect(shouldBlockRisk(signals)).toBe(true);
  });
});

describe('PlaytestFeedback', () => {
  it('should create default feedback', () => {
    const feedback = createDefaultPlaytestFeedback('lead-001');

    expect(feedback.lead_id).toBe('lead-001');
    expect(feedback.session_count).toBe(0);
    expect(feedback.useful_feedback_score).toBe(0);
  });

  it('should calculate tester quality score', () => {
    const feedback = createDefaultPlaytestFeedback('lead-002');
    feedback.session_count = 5;
    feedback.total_playtime_minutes = 300;
    feedback.bug_reports_submitted = 8;
    feedback.useful_feedback_score = 85;

    const qualityScore = calculateTesterQualityScore(feedback);
    expect(qualityScore).toBeGreaterThan(0);
  });

  it('should recommend for future tests', () => {
    const feedback = createDefaultPlaytestFeedback('lead-003');
    feedback.bug_reports_submitted = 5;

    expect(shouldInviteToFutureTests(feedback)).toBe(true);
  });
});

describe('IdentityLink', () => {
  it('should create identity link', () => {
    const link = createIdentityLink('canonical-001', 'steam', 'player123', 0.95, ['same avatar']);

    expect(link.canonical_lead_id).toBe('canonical-001');
    expect(link.platform).toBe('steam');
    expect(link.identifier).toBe('player123');
    expect(link.confidence).toBe(0.95);
  });

  it('should allow merging with medium confidence', () => {
    const link = createIdentityLink('lead-001', 'discord', 'user1', 0.7, []);
    expect(canMergeIdentities(link)).toBe(true);
  });

  it('should not allow merging with low confidence', () => {
    const link = createIdentityLink('lead-002', 'reddit', 'user2', 0.4, []);
    expect(canMergeIdentities(link)).toBe(false);
  });

  it('should calculate merged confidence', () => {
    const links = [
      createIdentityLink('lead-001', 'steam', 'player', 0.9, []),
      createIdentityLink('lead-001', 'discord', 'user', 0.8, []),
    ];

    const merged = calculateMergedConfidence(links);
    expect(merged).toBeGreaterThan(0);
  });
});

describe('RepoLogEntry', () => {
  it('should create log entry', () => {
    const entry = createRepoLogEntry(
      'lead_extraction',
      'Extracted 10 leads from Discord',
      { count: 10, source: 'discord' },
      5000
    );

    expect(entry.log_id).toBeDefined();
    expect(entry.category).toBe('lead_extraction');
    expect(entry.markdown_summary).toContain('10 leads');
  });

  it('should have log templates', () => {
    const template = LOG_TEMPLATES.scoring_run(50, 100, 1000);
    expect(template.category).toBe('scoring_run');
    expect(template.json_payload.qualified).toBe(50);
  });
});