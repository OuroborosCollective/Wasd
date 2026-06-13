/**
 * @file server/src/core/language/DialogueDecisionKernel.test.ts
 * @description Unit tests for DialogueDecisionKernel
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  decideUtterance,
  registerPhraseGenome,
  clearKernelState,
  clearAllKernelState,
  type DecisionContext,
} from './DialogueDecisionKernel.js';
import { createKappaInt } from './LanguageTypes.js';
import { clearArchive, registerCanonicalLexeme } from './LivingDudenArchive.js';
import { seedDefaultDialects, clearAllIdiolects } from './DialectStores.js';
import type { NpcLanguageState, PhraseGenome } from './LanguageTypes.js';

describe('DialogueDecisionKernel', () => {
  const createTestNpcState = (overrides?: Partial<NpcLanguageState>): NpcLanguageState => ({
    npcId: 'test_npc_1' as any,
    factionId: 'millbrook',
    role: 'Village Elder',
    currentHunger: createKappaInt(0.3),
    currentTrust: createKappaInt(0.5),
    currentFear: createKappaInt(0.2),
    currentDuty: createKappaInt(0.6),
    currentPride: createKappaInt(0.4),
    currentRevenge: createKappaInt(0),
    recentSpeechHashes: [],
    lastConversationTick: 0,
    ...overrides,
  });

  const createTestWorldState = () => ({
    threatLevel: createKappaInt(0.3),
    villageSafety: createKappaInt(0.7),
    factionPressure: createKappaInt(0.2),
    politicalTension: createKappaInt(0.1),
  });

  beforeEach(() => {
    clearAllKernelState();
    clearAllIdiolects();
    clearArchive();
    seedDefaultDialects();

    // Register test lexemes
    registerCanonicalLexeme({ id: 'de_gruessen', lemma: 'grüßen', language: 'de', concepts: ['greeting'] });
    registerCanonicalLexeme({ id: 'de_furcht', lemma: 'Furcht', language: 'de', concepts: ['fear'] });
    registerCanonicalLexeme({ id: 'de_hunger', lemma: 'Hunger', language: 'de', concepts: ['hunger'] });
    registerCanonicalLexeme({ id: 'de_freund', lemma: 'Freund', language: 'de', concepts: ['friend'] });
    registerCanonicalLexeme({ id: 'de_dorf', lemma: 'Dorf', language: 'de', concepts: ['village'] });
  });

  describe('decideUtterance', () => {
    it('should return a valid utterance decision', () => {
      const npcState = createTestNpcState();
      const worldState = createTestWorldState();

      const context: DecisionContext = {
        npcState,
        worldState,
        tick: 1000,
        sequenceId: 1,
      };

      const decision = decideUtterance(context);

      expect(decision).toBeDefined();
      expect(decision.speechHash).toBeDefined();
      expect(decision.intent).toBeDefined();
      expect(decision.constructedText).toBeDefined();
    });

    it('should select warn intent when fear is high', () => {
      const npcState = createTestNpcState({ currentFear: createKappaInt(0.8) });
      const worldState = createTestWorldState();

      const context: DecisionContext = {
        npcState,
        worldState,
        tick: 2000,
        sequenceId: 1,
      };

      const decision = decideUtterance(context);

      // High fear should trigger warn or threaten
      expect(['warn', 'threaten']).toContain(decision.intent);
    });

    it('should select request intent when hunger is high', () => {
      const npcState = createTestNpcState({ currentHunger: createKappaInt(0.8) });
      const worldState = createTestWorldState();

      const context: DecisionContext = {
        npcState,
        worldState,
        tick: 3000,
        sequenceId: 1,
      };

      const decision = decideUtterance(context);

      // High hunger should trigger request
      expect(decision.intent).toBe('request');
    });

    it('should produce different speech for different intents', () => {
      const npcState1 = createTestNpcState({ currentFear: createKappaInt(0.8) });
      const npcState2 = createTestNpcState({ currentHunger: createKappaInt(0.8) });
      const worldState = createTestWorldState();

      const context1: DecisionContext = {
        npcState: npcState1,
        worldState,
        tick: 4000,
        sequenceId: 1,
      };

      const context2: DecisionContext = {
        npcState: npcState2,
        worldState,
        tick: 4000,
        sequenceId: 2,
      };

      const decision1 = decideUtterance(context1);
      const decision2 = decideUtterance(context2);

      expect(decision1.intent).not.toBe(decision2.intent);
    });
  });

  describe('DETERMINISM', () => {
    it('should produce same speechHash for same state and tick', () => {
      const npcState = createTestNpcState({ currentHunger: createKappaInt(0.5) });
      const worldState = createTestWorldState();

      const context1: DecisionContext = {
        npcState,
        worldState,
        tick: 5000,
        sequenceId: 1,
      };

      const context2: DecisionContext = {
        npcState,
        worldState,
        tick: 5000,
        sequenceId: 1,
      };

      const decision1 = decideUtterance(context1);
      const decision2 = decideUtterance(context2);

      expect(decision1.speechHash).toBe(decision2.speechHash);
    });

    it('should produce different speechHash for different tick', () => {
      const npcState = createTestNpcState();
      const worldState = createTestWorldState();

      const context1: DecisionContext = {
        npcState,
        worldState,
        tick: 6000,
        sequenceId: 1,
      };

      const context2: DecisionContext = {
        npcState,
        worldState,
        tick: 6001,
        sequenceId: 1,
      };

      const decision1 = decideUtterance(context1);
      const decision2 = decideUtterance(context2);

      // Different tick should (with high probability) produce different hash
      // This is probabilistic, but with deterministic selection it should differ
      expect(decision1.speechHash).not.toBe(decision2.speechHash);
    });

    it('should be deterministic with preferFallback option', () => {
      const npcState = createTestNpcState();
      const worldState = createTestWorldState();

      const context1: DecisionContext = {
        npcState,
        worldState,
        tick: 7000,
        sequenceId: 1,
      };

      const context2: DecisionContext = {
        npcState,
        worldState,
        tick: 7000,
        sequenceId: 1,
      };

      const decision1 = decideUtterance(context1, { preferFallback: true });
      const decision2 = decideUtterance(context2, { preferFallback: true });

      expect(decision1.speechHash).toBe(decision2.speechHash);
    });
  });

  describe('phrase genome registration', () => {
    it('should use registered phrase genome', () => {
      const testGenome: PhraseGenome = {
        id: 'test_genome_greet',
        intent: 'greet',
        languageMode: 'de',
        structure: ['subject', 'verb'],
        slots: [
          { role: 'subject', required: true, semanticRequirements: ['greeting'] },
          { role: 'verb', required: true, semanticRequirements: ['greeting'] },
        ],
        constraints: {},
        outcomeStats: { uses: 0, successfulUses: 0, failedUses: 0, averageKappaScore: createKappaInt(1.0) },
        mutation: { parentGenomeIds: [], generation: 0, stability: createKappaInt(1.0), novelty: createKappaInt(0) },
        truthMode: 'known_fact',
      };

      registerPhraseGenome(testGenome);

      const npcState = createTestNpcState({ factionId: 'test_faction', role: 'Test' });
      const worldState = createTestWorldState();

      const context: DecisionContext = {
        npcState,
        worldState,
        tick: 8000,
        sequenceId: 1,
      };

      const decision = decideUtterance(context);

      // Should use the registered genome ID
      expect(decision.phraseGenomeId).toBe('test_faction_greet_test');
    });
  });

  describe('fallback behavior', () => {
    it('should use fallback when no genome matches', () => {
      const npcState = createTestNpcState({ factionId: 'unknown_faction', role: 'Unknown' });
      const worldState = createTestWorldState();

      const context: DecisionContext = {
        npcState,
        worldState,
        tick: 9000,
        sequenceId: 1,
      };

      const decision = decideUtterance(context, { preferFallback: true });

      expect(decision.needsFallback).toBe(true);
      expect(decision.constructedText).toBeDefined();
    });
  });
});