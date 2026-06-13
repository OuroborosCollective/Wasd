/**
 * @file server/src/core/language/ProceduralGrammarEngine.ts
 * @description ProceduralGrammarEngine - Deterministic sentence construction
 * from semantic slots using lexeme selection and grammar rules.
 *
 * Builds sentences from LivingLexeme components following grammar rules.
 * All construction is deterministic based on seed and available lexemes.
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All construction derives from stable hashes of components
 */

import { stableHash32 } from '../determinism/AREDeterminism.js';
import type {
  PhraseGenome,
  PhraseSlot,
  LivingLexeme,
  LanguageCode,
  SentencePosition,
  KappaInt,
} from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import { getLexeme, findLexemeForSlot, type LexemeBlueprint } from './LivingDudenArchive.js';

const GRAMMAR_TAG = 'PROC_GRAMMAR_V1';

// =============================================================================
// GRAMMAR RULES (language-specific)
// =============================================================================

interface GrammarRule {
  language: LanguageCode;
  slotOrder: readonly SentencePosition[];
  requiredSlots: readonly SentencePosition[];
  optionalSlots: readonly SentencePosition[];
  articleRules?: ArticleRules;
  conjugationRules?: ConjugationRules;
  genderAgreement?: GenderAgreement;
}

interface ArticleRules {
  hasArticles: boolean;
  articleMapping: Readonly<Record<string, string>>; // lemma -> article
}

interface ConjugationRules {
  personEndings: Readonly<Record<string, string>>; // "first_present" -> ending
  verbPosition: 'before_subject' | 'after_subject' | 'end';
}

interface GenderAgreement {
  hasGender: boolean;
  articleByGender: Readonly<Record<string, string>>;
  pluralMarker: string;
}

/** German grammar rules */
const GERMAN_GRAMMAR: GrammarRule = Object.freeze({
  language: 'de',
  slotOrder: ['address', 'subject', 'verb', 'object', 'modifier', 'reason', 'place', 'closing'],
  requiredSlots: ['subject', 'verb'],
  optionalSlots: ['address', 'object', 'modifier', 'reason', 'place', 'closing'],
  articleRules: {
    hasArticles: true,
    articleMapping: Object.freeze({
      der: 'der',
      die: 'die',
      das: 'das',
      den: 'den',
      dem: 'dem',
      des: 'des',
    }),
  },
  conjugationRules: {
    personEndings: Object.freeze({
      ich_e: 'e',
      du_st: 'st',
      er_t: 't',
      wir_en: 'en',
      ihr_t: 't',
      sie_en: 'en',
    }),
    verbPosition: 'after_subject',
  },
  genderAgreement: {
    hasGender: true,
    articleByGender: Object.freeze({
      masculine: 'der',
      feminine: 'die',
      neutral: 'das',
      none: '',
    }),
    pluralMarker: 'die',
  },
});

/** English grammar rules */
const ENGLISH_GRAMMAR: GrammarRule = Object.freeze({
  language: 'en',
  slotOrder: ['address', 'subject', 'verb', 'object', 'modifier', 'reason', 'place', 'closing'],
  requiredSlots: ['subject', 'verb'],
  optionalSlots: ['address', 'object', 'modifier', 'reason', 'place', 'closing'],
  articleRules: {
    hasArticles: true,
    articleMapping: Object.freeze({
      the: 'the',
      a: 'a',
      an: 'an',
    }),
  },
  conjugationRules: {
    personEndings: Object.freeze({
      first_present: 'Ø',
      second_present: 'Ø',
      third_present: 's',
      first_plural: 'Ø',
      second_plural: 'Ø',
      third_plural: 'Ø',
    }),
    verbPosition: 'after_subject',
  },
  genderAgreement: {
    hasGender: false,
    articleByGender: Object.freeze({}),
    pluralMarker: 'the',
  },
});

/** Arelorian grammar rules (simplified, mythic) */
const ARELORIAN_GRAMMAR: GrammarRule = Object.freeze({
  language: 'arel',
  slotOrder: ['address', 'emotion_marker', 'subject', 'verb', 'object', 'myth', 'closing'],
  requiredSlots: ['subject', 'verb'],
  optionalSlots: ['address', 'emotion_marker', 'object', 'myth', 'closing'],
  articleRules: {
    hasArticles: false,
    articleMapping: Object.freeze({}),
  },
  conjugationRules: {
    personEndings: Object.freeze({
      first_present: 'am',
      second_present: 'ir',
      third_present: 'el',
      first_plural: 'ash',
      second_plural: 'eth',
      third_plural: 'en',
    }),
    verbPosition: 'after_subject',
  },
  genderAgreement: {
    hasGender: false,
    articleByGender: Object.freeze({}),
    pluralMarker: '',
  },
});

/** Guild (thieves/criminal) slang grammar */
const GUILD_GRAMMAR: GrammarRule = Object.freeze({
  language: 'guild',
  slotOrder: ['address', 'subject', 'verb', 'object', 'modifier', 'closing'],
  requiredSlots: ['subject', 'verb'],
  optionalSlots: ['address', 'object', 'modifier', 'closing'],
  articleRules: {
    hasArticles: false,
    articleMapping: Object.freeze({}),
  },
  conjugationRules: {
    personEndings: Object.freeze({
      first_present: 'Ø',
      second_present: 'Ø',
      third_present: 'Ø',
      first_plural: 'Ø',
      second_plural: 'Ø',
      third_plural: 'Ø',
    }),
    verbPosition: 'after_subject',
  },
  genderAgreement: {
    hasGender: false,
    articleByGender: Object.freeze({}),
    pluralMarker: '',
  },
});

const grammarRules: Readonly<Record<LanguageCode, GrammarRule>> = Object.freeze({
  de: GERMAN_GRAMMAR,
  en: ENGLISH_GRAMMAR,
  arel: ARELORIAN_GRAMMAR,
  guild: GUILD_GRAMMAR,
  mythic: ARELORIAN_GRAMMAR, // mythic uses arelorian rules
  mixed: ENGLISH_GRAMMAR, // mixed defaults to english
});

function getGrammarForLanguage(language: LanguageCode): GrammarRule {
  return grammarRules[language] ?? ENGLISH_GRAMMAR;
}

// =============================================================================
// SENTENCE CONSTRUCTION
// =============================================================================

export interface SlotFiller {
  slot: SentencePosition;
  lexeme: LivingLexeme;
  text: string;
}

export interface ConstructionResult {
  success: boolean;
  text?: string;
  fillers?: readonly SlotFiller[];
  hash?: string;
  error?: string;
}

/**
 * Build sentence from phrase genome and lexeme selection.
 * Deterministic: same inputs → same output text.
 */
export function buildSentence(
  phraseGenome: PhraseGenome,
  seed: number,
  options?: {
    dialectOverride?: LanguageCode;
    preferFallback?: boolean;
  }
): ConstructionResult {
  const language = options?.dialectOverride ?? phraseGenome.languageMode;
  const grammar = getGrammarForLanguage(language);

  // Validate required slots have fillers
  const fillers: SlotFiller[] = [];
  let hashParts: string[] = [GRAMMAR_TAG, phraseGenome.id, seed.toString()];

  for (const slotDef of phraseGenome.slots) {
    const slotRole = slotDef.role as SentencePosition;

    // Skip if not in grammar's slot order
    if (!grammar.slotOrder.includes(slotRole) && slotRole !== 'emotion_marker') {
      continue;
    }

    // Required slots must have content
    if (slotDef.required && (!slotDef.lexemeIds || slotDef.lexemeIds.length === 0)) {
      // Try to find lexeme from semantic requirements
      if (slotDef.semanticRequirements && slotDef.semanticRequirements.length > 0) {
        const found = findLexemeForSlot(
          {
            concepts: slotDef.semanticRequirements,
            language,
            position: slotRole,
          },
          seed + slotRole.length * 1000
        );

        if (found) {
          fillers.push({
            slot: slotRole,
            lexeme: found,
            text: found.lemma,
          });
          hashParts.push(found.id);
        } else if (phraseGenome.id.includes('fallback')) {
          // Use fallback text
          fillers.push({
            slot: slotRole,
            lexeme: getLexeme('_fallback_')!,
            text: slotDef.semanticRequirements[0] ?? '...',
          });
        } else {
          return {
            success: false,
            error: `Required slot ${slotRole} could not be filled`,
          };
        }
      } else if (!slotDef.required) {
        // Optional slot, skip if no lexeme provided
        continue;
      } else {
        return {
          success: false,
          error: `Required slot ${slotRole} has no lexemeIds or semanticRequirements`,
        };
      }
    } else if (slotDef.lexemeIds && slotDef.lexemeIds.length > 0) {
      // Use provided lexeme IDs
      // Deterministic selection from available lexemes
      const lexemeSeed = seed + slotRole.length * 500 + fillers.length * 100;
      const selectedIndex = stableHash32(lexemeSeed.toString()) % slotDef.lexemeIds.length;
      const selectedId = slotDef.lexemeIds[selectedIndex];
      const lexeme = getLexeme(selectedId);

      if (lexeme) {
        fillers.push({
          slot: slotRole,
          lexeme,
          text: applyGrammar(lexeme, grammar, slotRole, lexemeSeed),
        });
        hashParts.push(lexeme.id);
      }
    }
  }

  // Build text in grammar order
  const orderedSlots = grammar.slotOrder.filter((pos) =>
    fillers.some((f) => f.slot === pos)
  );

  const textParts: string[] = [];
  for (const pos of orderedSlots) {
    const filler = fillers.find((f) => f.slot === pos);
    if (filler) {
      textParts.push(filler.text);
    }
  }

  // Add emotion marker if present
  const emotionFiller = fillers.find((f) => f.slot === 'emotion_marker');
  if (emotionFiller) {
    textParts.unshift(emotionFiller.text);
  }

  // Add closing if present
  const closingFiller = fillers.find((f) => f.slot === 'closing');
  if (closingFiller) {
    textParts.push(closingFiller.text);
  }

  const text = textParts.join(' ').trim();
  const textHash = stableHash32(hashParts.join('|')).toString(16);

  return {
    success: true,
    text,
    fillers: Object.freeze(fillers),
    hash: textHash,
  };
}

/**
 * Apply grammar rules to lexeme text.
 */
function applyGrammar(
  lexeme: LivingLexeme,
  grammar: GrammarRule,
  position: SentencePosition,
  seed: number
): string {
  let text = lexeme.lemma;

  // Add article for nouns in subject position
  if (
    position === 'subject' &&
    grammar.articleRules?.hasArticles &&
    lexeme.grammar.partOfSpeech === 'noun'
  ) {
    const article = selectArticle(lexeme, grammar, seed);
    if (article) {
      text = `${article} ${text}`;
    }
  }

  // Apply conjugation for verbs
  if (
    position === 'verb' &&
    grammar.conjugationRules &&
    lexeme.grammar.partOfSpeech === 'verb'
  ) {
    text = applyVerbConjugation(text, lexeme, grammar.conjugationRules, seed);
  }

  // Capitalize first letter for address or start of sentence
  if (position === 'address' || (position !== 'emotion_marker' && position !== 'closing' && position !== 'modifier')) {
    text = text[0].toUpperCase() + text.slice(1);
  }

  return text;
}

/**
 * Select appropriate article based on gender and grammar rules.
 */
function selectArticle(
  lexeme: LivingLexeme,
  grammar: GrammarRule,
  seed: number
): string {
  if (!grammar.genderAgreement?.hasGender || !grammar.articleRules) {
    return '';
  }

  const gender = lexeme.grammar.gender ?? 'none';
  const articleKey = grammar.genderAgreement.articleByGender[gender];

  if (!articleKey) {
    // Use default article
    return grammar.articleRules.articleMapping['the'] ?? '';
  }

  return grammar.articleRules.articleMapping[articleKey] ?? '';
}

/**
 * Apply verb conjugation based on grammar rules.
 */
function applyVerbConjugation(
  verbText: string,
  lexeme: LivingLexeme,
  rules: ConjugationRules,
  seed: number
): string {
  const person = lexeme.grammar.verbPerson ?? 'third';
  const tense = lexeme.grammar.verbTense ?? 'present';
  const key = `${person}_${tense}`;
  const ending = rules.personEndings[key] ?? '';

  // Apply ending
  if (ending === 'Ø' || ending === '') {
    return verbText;
  }

  // Handle common verb endings
  if (verbText.endsWith('en')) {
    return verbText.slice(0, -2) + ending;
  }
  if (verbText.endsWith('n')) {
    return verbText + ending;
  }

  return verbText + ending;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate phrase genome structure.
 */
export function validatePhraseGenome(genome: PhraseGenome): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required slots
  const grammar = getGrammarForLanguage(genome.languageMode);
  const requiredInGrammar = grammar.requiredSlots;

  for (const required of requiredInGrammar) {
    const hasSlot = genome.slots.some((s) => s.role === required);
    if (!hasSlot) {
      errors.push(`Missing required slot: ${required}`);
    }
  }

  // Check slot order is valid
  const seenSlots = new Set<string>();
  for (const slot of genome.slots) {
    if (seenSlots.has(slot.role)) {
      errors.push(`Duplicate slot role: ${slot.role}`);
    }
    seenSlots.add(slot.role);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// UTILITY
// =============================================================================

/**
 * Get canonical phrase genome or create minimal fallback.
 */
export function getPhraseGenomeOrFallback(genomeId: string): PhraseGenome | undefined {
  // This would be implemented to look up from PhraseGenomeRegistry
  // For now, return undefined to trigger fallback in calling code
  return undefined;
}

/**
 * Create deterministic seed from components.
 */
export function createSentenceSeed(
  npcId: string,
  intent: string,
  tick: number,
  sequenceId: number
): number {
  const parts = [npcId, intent, tick.toString(), sequenceId.toString()];
  return stableHash32(parts.join('|'));
}