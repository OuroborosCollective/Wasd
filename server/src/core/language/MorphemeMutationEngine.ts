/**
 * @file server/src/core/language/MorphemeMutationEngine.ts
 * @description MorphemeMutationEngine - Deterministic language mutation for Arelorian conlang.
 *
 * Creates new words/morphemes through deterministic mutation rules.
 * Mutations are quarantined until promoted through success metrics.
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All mutations derive from stable hashes of parent lexeme + event
 */

import { stableHash32 } from '../determinism/AREDeterminism.js';
import type {
  LivingLexeme,
  LanguageCode,
  KappaInt,
} from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import { createMutatedLexeme, getLexeme, type MutationResult } from './LivingDudenArchive.js';

const MUTATION_TAG = 'MORPHEME_MUTATION_V1';

// =============================================================================
// MUTATION TYPES
// =============================================================================

export enum MutationType {
  /** Combine two morphemes */
  BLEND = 'blend',
  /** Add prefix */
  PREFIX = 'prefix',
  /** Add suffix */
  SUFFIX = 'suffix',
  /** Change vowel (Arelorian vowel shift) */
  VOWEL_SHIFT = 'vowel_shift',
  /** Consonant cluster simplification */
  CLUSTER_SIMPLIFY = 'cluster_simplify',
  /** Semantic drift - keep form, change meaning context */
  SEMANTIC_DRIFT = 'semantic_drift',
  /** Phonetic extension */
  EXTEND = 'extend',
  /** Contraction */
  CONTRACT = 'contract',
}

// =============================================================================
// MUTATION RULES (language-specific)
// =============================================================================

interface MutationRule {
  type: MutationType;
  languages: readonly LanguageCode[];
  minGeneration: number;
  probability: number; // 0-1000 (per mille)
}

/** Arelorian mutation rules */
const MUTATION_RULES: readonly MutationRule[] = Object.freeze([
  // Vowel shift is common in Arelorian
  { type: MutationType.VOWEL_SHIFT, languages: ['arel', 'mythic'], minGeneration: 1, probability: 400 },
  // Prefix addition for nouns
  { type: MutationType.PREFIX, languages: ['arel', 'mythic', 'de'], minGeneration: 2, probability: 200 },
  // Suffix addition for verbs
  { type: MutationType.SUFFIX, languages: ['arel', 'mythic', 'de', 'en'], minGeneration: 1, probability: 250 },
  // Blend for compound concepts
  { type: MutationType.BLEND, languages: ['arel', 'guild', 'mythic'], minGeneration: 3, probability: 100 },
  // Semantic drift for learned terms
  { type: MutationType.SEMANTIC_DRIFT, languages: ['de', 'en', 'guild'], minGeneration: 2, probability: 150 },
  // Extension for emphasis
  { type: MutationType.EXTEND, languages: ['guild', 'mythic'], minGeneration: 1, probability: 300 },
  // Contraction for casual speech
  { type: MutationType.CONTRACT, languages: ['en', 'guild'], minGeneration: 1, probability: 200 },
]);

// =============================================================================
// MORPHEME CORPUS (for mutation building blocks)
// =============================================================================

const MORPHEME_CORPUS: Readonly<Record<LanguageCode, readonly string[]>> = Object.freeze({
  de: Object.freeze([
    'schaft', 'tum', 'heit', 'ung', 'lich', 'bar', 'voll', 'los',
    'eisen', 'stein', 'wasser', 'feuer', 'holz', 'feld', 'weg',
    'gut', 'böse', 'arm', 'reich', 'jung', 'alt', 'neu',
  ]),
  en: Object.freeze([
    'ness', 'ment', 'tion', 'able', 'ful', 'less', 'ous', 'ive',
    'light', 'dark', 'fire', 'water', 'stone', 'wood', 'wind',
    'good', 'evil', 'rich', 'poor', 'young', 'old', 'new',
  ]),
  arel: Object.freeze([
    'ash', 'el', 'ir', 'en', 'eth', 'am', 'or', 'ar',
    'thal', 'gor', 'den', 'ven', 'sar', 'kel', 'mor',
    'asha', 'elu', 'ira', 'ena', 'etha', 'ama', 'ora', 'ara',
  ]),
  guild: Object.freeze([
    'soft', 'cut', 'blade', 'shadow', 'whisper', 'night', 'moon',
    'coin', 'purse', 'sharp', 'quick', 'silk', 'veil',
  ]),
  mythic: Object.freeze([
    'divine', 'sacred', 'blessed', 'light', 'order', 'chaos',
    'void', 'eternal', 'mortal', 'spirit', 'soul', 'realm',
  ]),
  mixed: Object.freeze([
    'cross', 'blood', 'iron', 'gold', 'silver', 'crown', 'throne',
  ]),
});

/** Vowel set for Arelorian vowel shift */
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü'] as const;
const VOWEL_MAP: Readonly<Record<string, string>> = Object.freeze({
  a: 'e',
  e: 'i',
  i: 'o',
  o: 'u',
  u: 'a',
  ä: 'ö',
  ö: 'ü',
  ü: 'a',
});

/** Arelorian consonant clusters that can simplify */
const COMPLEX_CLUSTERS = ['st', 'sp', 'sch', 'ch', 'th', 'ph', 'gh'] as const;

// =============================================================================
// MUTATION ENGINE
// =============================================================================

export interface MutationContext {
  parentLexemeId: string;
  npcId?: string;
  factionId?: string;
  eventSeed: string;
  tick: number;
}

/**
 * Attempt mutation for lexeme.
 * Returns mutation result (may be quarantined).
 */
export function attemptMutation(context: MutationContext): MutationResult {
  const { parentLexemeId, npcId, factionId, eventSeed, tick } = context;

  const parent = getLexeme(parentLexemeId);
  if (!parent) {
    return { lexeme: parent as never, success: false, reason: 'Parent lexeme not found' };
  }

  // Check if parent is promoted (can be mutated)
  if (!parent.mutation.promoted && !parent.invented) {
    return { lexeme: parent as never, success: false, reason: 'Cannot mutate non-promoted lexeme' };
  }

  // Select mutation type deterministically
  const mutationType = selectMutationType(parent, tick, eventSeed);

  if (!mutationType) {
    return { lexeme: parent as never, success: false, reason: 'No valid mutation type' };
  }

  // Execute mutation
  const mutationSeed = `${MUTATION_TAG}:${parentLexemeId}:${mutationType}:${eventSeed}:${tick}`;
  const mutatedLemma = executeMutation(parent, mutationType, mutationSeed);

  if (!mutatedLemma) {
    return { lexeme: parent as never, success: false, reason: 'Mutation execution failed' };
  }

  // Create mutated lexeme (will be quarantined)
  return createMutatedLexeme(parentLexemeId, mutationSeed, npcId, factionId);
}

/**
 * Select mutation type based on deterministic probability.
 */
function selectMutationType(
  parent: LivingLexeme,
  tick: number,
  eventSeed: string
): MutationType | undefined {
  const applicableRules = MUTATION_RULES.filter(
    (rule) =>
      rule.languages.includes(parent.language) &&
      parent.mutation.generation >= rule.minGeneration
  );

  if (applicableRules.length === 0) {
    // Default to semantic drift for any language
    return MutationType.SEMANTIC_DRIFT;
  }

  // Deterministic selection based on tick and event seed
  const selectionSeed = stableHash32(`${parent.id}:${tick}:${eventSeed}`);
  let accumulator = selectionSeed;

  for (const rule of applicableRules) {
    accumulator = stableHash32(accumulator.toString());
    const roll = accumulator % 1000;

    if (roll < rule.probability) {
      return rule.type;
    }
  }

  return undefined; // No mutation this time
}

/**
 * Execute specific mutation type.
 */
function executeMutation(
  parent: LivingLexeme,
  type: MutationType,
  seed: string
): string | undefined {
  const baseLemma = parent.lemma;
  const morphemes = parent.morphemes;

  switch (type) {
    case MutationType.BLEND:
      return blendMorphemes(morphemes, seed);

    case MutationType.PREFIX:
      return addPrefix(baseLemma, parent.language, seed);

    case MutationType.SUFFIX:
      return addSuffix(baseLemma, parent.language, seed);

    case MutationType.VOWEL_SHIFT:
      return applyVowelShift(baseLemma, seed);

    case MutationType.CLUSTER_SIMPLIFY:
      return simplifyClusters(baseLemma, seed);

    case MutationType.SEMANTIC_DRIFT:
      return applySemanticDrift(parent, seed);

    case MutationType.EXTEND:
      return extendPhoneme(baseLemma, seed);

    case MutationType.CONTRACT:
      return contractWord(baseLemma, seed);

    default:
      return undefined;
  }
}

// =============================================================================
// MUTATION OPERATIONS
// =============================================================================

/**
 * Blend two morphemes from the lexeme.
 */
function blendMorphemes(morphemes: readonly string[], seed: string): string | undefined {
  if (morphemes.length < 2) return undefined;

  const seed1 = stableHash32(`${seed}:first`);
  const seed2 = stableHash32(`${seed}:second`);

  const first = morphemes[seed1 % morphemes.length];
  const second = morphemes[seed2 % morphemes.length];

  // Blend point at 60% of first morpheme
  const blendPoint = Math.floor(first.length * 0.6);
  return first.slice(0, blendPoint) + second.slice(blendPoint);
}

/**
 * Add prefix to word.
 */
function addPrefix(lemma: string, language: LanguageCode, seed: string): string | undefined {
  const prefixes = MORPHEME_CORPUS[language] ?? MORPHEME_CORPUS.mixed;
  const prefixIndex = stableHash32(`${seed}:prefix`) % prefixes.length;
  const prefix = prefixes[prefixIndex];

  // Don't double prefix
  if (lemma.startsWith(prefix)) return undefined;

  return `${prefix}-${lemma}`;
}

/**
 * Add suffix to word.
 */
function addSuffix(lemma: string, language: LanguageCode, seed: string): string | undefined {
  const suffixes = MORPHEME_CORPUS[language] ?? MORPHEME_CORPUS.mixed;
  const suffixIndex = stableHash32(`${seed}:suffix`) % suffixes.length;
  const suffix = suffixes[suffixIndex];

  // Don't double suffix
  if (lemma.endsWith(suffix)) return undefined;

  return `${lemma}${suffix}`;
}

/**
 * Apply Arelorian vowel shift.
 */
function applyVowelShift(lemma: string, seed: string): string {
  const seedNum = stableHash32(seed);
  const shiftCount = (seedNum % 3) + 1; // 1-3 vowel shifts

  let result = lemma;
  for (let i = 0; i < shiftCount; i++) {
    result = result
      .split('')
      .map((char) => VOWEL_MAP[char] ?? char)
      .join('');
  }

  return result;
}

/**
 * Simplify complex consonant clusters.
 */
function simplifyClusters(lemma: string, seed: string): string {
  const seedNum = stableHash32(seed);
  let result = lemma;

  for (const cluster of COMPLEX_CLUSTERS) {
    if (result.includes(cluster)) {
      // Keep first letter of cluster
      const keepLetter = cluster[0];
      const replaceWith = cluster.includes('h') ? 'h' : keepLetter;

      // Only apply some of the time (deterministic)
      if ((seedNum + cluster.length) % 3 !== 0) {
        result = result.replace(cluster, replaceWith);
      }
    }
  }

  return result;
}

/**
 * Apply semantic drift - same form, shifted meaning context.
 */
function applySemanticDrift(parent: LivingLexeme, seed: string): string | undefined {
  // For semantic drift, we typically keep the same lemma
  // but change the concepts/morphemes slightly
  const concepts = parent.semantics.concepts;
  if (concepts.length === 0) return undefined;

  const conceptIndex = stableHash32(`${seed}:concept`) % concepts.length;
  const driftedConcept = `${concepts[conceptIndex]}_drift`;

  // Create drifted form by adding suffix to first morpheme
  const firstMorpheme = parent.morphemes[0] ?? parent.lemma;
  const suffix = ['_drift', '_new', '_shifting'][stableHash32(seed) % 3];

  return `${firstMorpheme}${suffix}`;
}

/**
 * Extend phoneme for emphasis.
 */
function extendPhoneme(lemma: string, seed: string): string {
  const seedNum = stableHash32(seed);

  // Double a syllable
  if (lemma.length >= 4) {
    const syllableBreak = Math.floor(lemma.length / 2);
    const firstPart = lemma.slice(0, syllableBreak);
    const secondPart = lemma.slice(syllableBreak);

    // Insert repeated sound
    const repeatSound = lemma[syllableBreak - 1] ?? '';
    return `${firstPart}${repeatSound}${secondPart}`;
  }

  // Add elongation marker
  return `${lemma}${lemma[lemma.length - 1]}`;
}

/**
 * Contract word (shortening).
 */
function contractWord(lemma: string, seed: string): string {
  const seedNum = stableHash32(seed);

  // Remove vowels strategically
  let result = lemma
    .split('')
    .filter((char, i) => {
      // Keep first and last
      if (i === 0 || i === lemma.length - 1) return true;
      // Keep every other vowel
      const isVowel = 'aeiouAEIOU'.includes(char);
      if (!isVowel) return true;
      return (seedNum + i) % 2 === 0;
    })
    .join('');

  // Minimum length check
  if (result.length < 2) return lemma;

  return result;
}

// =============================================================================
// MUTATION ANALYSIS
// =============================================================================

export interface MutationStats {
  totalMutations: number;
  quarantinedCount: number;
  promotedCount: number;
  byType: Readonly<Record<MutationType, number>>;
  byLanguage: Readonly<Record<LanguageCode, number>>;
}

/**
 * Get mutation statistics (for telemetry).
 */
export function getMutationStats(): MutationStats {
  // This would query LivingDudenArchive for mutation data
  return Object.freeze({
    totalMutations: 0,
    quarantinedCount: 0,
    promotedCount: 0,
    byType: Object.freeze({
      [MutationType.BLEND]: 0,
      [MutationType.PREFIX]: 0,
      [MutationType.SUFFIX]: 0,
      [MutationType.VOWEL_SHIFT]: 0,
      [MutationType.CLUSTER_SIMPLIFY]: 0,
      [MutationType.SEMANTIC_DRIFT]: 0,
      [MutationType.EXTEND]: 0,
      [MutationType.CONTRACT]: 0,
    }),
    byLanguage: Object.freeze({
      de: 0,
      en: 0,
      arel: 0,
      guild: 0,
      mythic: 0,
      mixed: 0,
    }),
  });
}