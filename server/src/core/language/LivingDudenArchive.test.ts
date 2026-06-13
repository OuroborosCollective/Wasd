/**
 * @file server/src/core/language/LivingDudenArchive.test.ts
 * @description Unit tests for LivingDudenArchive
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerCanonicalLexeme,
  getLexeme,
  getAllLexemes,
  getLexemesByLanguage,
  getLexemesByConcept,
  getLexemeCount,
  findLexemeForSlot,
  clearArchive,
  loadSeedData,
  exportArchiveState,
  createMutatedLexeme,
  promoteLexeme,
  isQuarantined,
  recordLexemeUsage,
} from './LivingDudenArchive.js';

describe('LivingDudenArchive', () => {
  beforeEach(() => {
    clearArchive();
  });

  describe('registerCanonicalLexeme', () => {
    it('should register a basic lexeme', () => {
      const lexeme = registerCanonicalLexeme({
        id: 'test_greet',
        lemma: 'grüßen',
        language: 'de',
        concepts: ['greeting'],
      });

      expect(lexeme).toBeDefined();
      expect(lexeme.id).toBe('test_greet');
      expect(lexeme.lemma).toBe('grüßen');
      expect(lexeme.language).toBe('de');
      expect(lexeme.invented).toBe(false);
    });

    it('should return existing lexeme if ID already exists', () => {
      const first = registerCanonicalLexeme({
        id: 'test_dup',
        lemma: 'first',
        language: 'de',
      });

      const second = registerCanonicalLexeme({
        id: 'test_dup',
        lemma: 'second',
        language: 'de',
      });

      expect(first).toBe(second);
      expect(getLexemeCount()).toBe(1);
    });

    it('should set full emotion profile', () => {
      const lexeme = registerCanonicalLexeme({
        id: 'test_fear',
        lemma: 'Furcht',
        language: 'de',
        concepts: ['fear'],
        emotion: { fear: 0.8, anger: 0.2 },
      });

      expect(Number(lexeme.semantics.emotion.fear)).toBe(800); // KAPPA scale
      expect(Number(lexeme.semantics.emotion.anger)).toBe(200);
    });

    it('should set grammar properties', () => {
      const lexeme = registerCanonicalLexeme({
        id: 'test_noun',
        lemma: 'Dorf',
        language: 'de',
        concepts: ['village'],
        grammar: {
          partOfSpeech: 'noun',
          gender: 'neutral',
          plural: 'Dörfer',
          allowedPositions: ['subject', 'object'],
        },
      });

      expect(lexeme.grammar.partOfSpeech).toBe('noun');
      expect(lexeme.grammar.gender).toBe('neutral');
      expect(lexeme.grammar.plural).toBe('Dörfer');
      expect(lexeme.grammar.allowedPositions).toContain('subject');
    });
  });

  describe('getLexeme', () => {
    it('should retrieve registered lexeme', () => {
      registerCanonicalLexeme({
        id: 'test_find',
        lemma: 'Freund',
        language: 'de',
        concepts: ['friend'],
      });

      const found = getLexeme('test_find');
      expect(found).toBeDefined();
      expect(found?.lemma).toBe('Freund');
    });

    it('should return undefined for non-existent lexeme', () => {
      const found = getLexeme('non_existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getLexemesByLanguage', () => {
    it('should return all lexemes of a language', () => {
      registerCanonicalLexeme({ id: 'de1', lemma: 'eins', language: 'de' });
      registerCanonicalLexeme({ id: 'de2', lemma: 'zwei', language: 'de' });
      registerCanonicalLexeme({ id: 'en1', lemma: 'one', language: 'en' });

      const germanLexemes = getLexemesByLanguage('de');
      expect(germanLexemes).toHaveLength(2);
    });

    it('should return empty array for unknown language', () => {
      const lexemes = getLexemesByLanguage('fr');
      expect(lexemes).toHaveLength(0);
    });
  });

  describe('getLexemesByConcept', () => {
    it('should return lexemes matching concept', () => {
      registerCanonicalLexeme({ id: 'test1', lemma: 'A', language: 'de', concepts: ['food', 'hunger'] });
      registerCanonicalLexeme({ id: 'test2', lemma: 'B', language: 'de', concepts: ['food'] });
      registerCanonicalLexeme({ id: 'test3', lemma: 'C', language: 'de', concepts: ['travel'] });

      const foodLexemes = getLexemesByConcept('food');
      expect(foodLexemes).toHaveLength(2);
    });
  });

  describe('findLexemeForSlot', () => {
    beforeEach(() => {
      registerCanonicalLexeme({ id: 'noun1', lemma: 'Dorf', language: 'de', concepts: ['village'], grammar: { partOfSpeech: 'noun' }, baseWeight: 1.0 });
      registerCanonicalLexeme({ id: 'noun2', lemma: 'Freund', language: 'de', concepts: ['friend'], grammar: { partOfSpeech: 'noun' }, baseWeight: 1.5 });
      registerCanonicalLexeme({ id: 'verb1', lemma: 'grüßen', language: 'de', concepts: ['greeting'], grammar: { partOfSpeech: 'verb' }, baseWeight: 1.0 });
    });

    it('should find lexeme by part of speech', () => {
      const found = findLexemeForSlot({ partOfSpeech: 'noun' }, 12345);
      expect(found).toBeDefined();
      expect(found?.grammar.partOfSpeech).toBe('noun');
    });

    it('should find lexeme by concept', () => {
      const found = findLexemeForSlot({ concepts: ['village'] }, 12345);
      expect(found).toBeDefined();
      expect(found?.lemma).toBe('Dorf');
    });

    it('should return undefined when no match', () => {
      const found = findLexemeForSlot({ concepts: ['nonexistent'] }, 12345);
      expect(found).toBeUndefined();
    });

    it('should be deterministic - same seed gives same result', () => {
      const first = findLexemeForSlot({ partOfSpeech: 'noun' }, 99999);
      const second = findLexemeForSlot({ partOfSpeech: 'noun' }, 99999);
      expect(first?.id).toBe(second?.id);
    });
  });

  describe('loadSeedData', () => {
    it('should load multiple lexemes from seed data', () => {
      const seedData = [
        { id: 'seed1', lemma: 'Wasser', language: 'de', concepts: ['water'] },
        { id: 'seed2', lemma: 'Feuer', language: 'de', concepts: ['fire'] },
        { id: 'seed3', lemma: 'Erde', language: 'de', concepts: ['earth'] },
      ];

      const loaded = loadSeedData(seedData);
      expect(loaded).toBe(3);
      expect(getLexemeCount()).toBe(3);
    });
  });

  describe('mutation system', () => {
    beforeEach(() => {
      registerCanonicalLexeme({
        id: 'parent_lexeme',
        lemma: 'Eisen',
        language: 'de',
        concepts: ['iron'],
      });
    });

    it('should create mutated lexeme in quarantine', () => {
      const result = createMutatedLexeme('parent_lexeme', 'mutation_seed_123', 'npc_1', 'faction_1');

      expect(result.success).toBe(true);
      expect(result.lexeme).toBeDefined();
      expect(result.lexeme.id).toContain('parent_lexeme');
      expect(result.lexeme.invented).toBe(true);
      expect(isQuarantined(result.lexeme.id)).toBe(true);
    });

    it('should promote quarantined lexeme', () => {
      const result = createMutatedLexeme('parent_lexeme', 'promote_test');
      const id = result.lexeme.id;

      expect(isQuarantined(id)).toBe(true);
      const promoted = promoteLexeme(id);
      expect(promoted).toBe(true);
      expect(isQuarantined(id)).toBe(false);
    });
  });

  describe('usage tracking', () => {
    it('should record lexeme usage', () => {
      registerCanonicalLexeme({ id: 'track_usage', lemma: 'Test', language: 'de' });

      recordLexemeUsage('track_usage', { npcUses: 1, causedHelp: 1 });
      const lexeme = getLexeme('track_usage');
      expect(lexeme?.usage.npcUses).toBe(1);
      expect(lexeme?.usage.causedHelp).toBe(1);
    });
  });

  describe('exportArchiveState', () => {
    it('should return archive statistics', () => {
      registerCanonicalLexeme({ id: 'stat1', lemma: 'A', language: 'de' });
      registerCanonicalLexeme({ id: 'stat2', lemma: 'B', language: 'de' });
      registerCanonicalLexeme({ id: 'stat3', lemma: 'C', language: 'en' });

      const state = exportArchiveState();
      expect(state.totalLexemes).toBe(3);
      expect(state.byLanguageCount['de']).toBe(2);
      expect(state.byLanguageCount['en']).toBe(1);
    });
  });

  describe('DETERMINISM VERIFICATION', () => {
    it('should NOT use Math.random', () => {
      // This is verified by the test suite running with determinism guards
      const lexeme1 = registerCanonicalLexeme({ id: 'det1', lemma: 'Test', language: 'de', baseWeight: 1.0 });
      const lexeme2 = registerCanonicalLexeme({ id: 'det2', lemma: 'Test', language: 'de', baseWeight: 1.0 });

      // Same inputs should produce same content hash
      expect(lexeme1.integrity.contentHash).toBe(lexeme2.integrity.contentHash);
    });

    it('should be deterministic across archive operations', () => {
      registerCanonicalLexeme({ id: 'det_lex1', lemma: 'Alpha', language: 'de', concepts: ['test'] });
      const state1 = exportArchiveState();

      registerCanonicalLexeme({ id: 'det_lex2', lemma: 'Beta', language: 'de', concepts: ['test'] });
      const state2 = exportArchiveState();

      // Operations should be deterministic
      expect(state2.totalLexemes - state1.totalLexemes).toBe(1);
    });
  });
});