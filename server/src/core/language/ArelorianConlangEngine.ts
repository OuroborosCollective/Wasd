/**
 * @file server/src/core/language/ArelorianConlangEngine.ts
 * @description ArelorianConlangEngine - Full procedural Arelorian language.
 *
 * Generates authentic Arelorian words from phonotactics and morpheme rules.
 * Supports code-switching between languages for mixed-speech NPCs.
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All generation derives from stable hashes
 */

import { stableHash32 } from '../determinism/AREDeterminism.js';
import type { KappaInt } from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';

const CONLANG_TAG = 'ARELORIAN_CONLANG_V1';

// =============================================================================
// PHONOTACTICS (sound rules)
// =============================================================================

interface PhonotacticRules {
  /** Allowed syllable onsets (consonant clusters at start) */
  onsets: readonly string[];
  /** Allowed syllable nuclei (vowels) */
  nuclei: readonly string[];
  /** Allowed syllable codas (consonants at end) */
  codas: readonly string[];
  /** Maximum syllables per word */
  maxSyllables: number;
  /** Minimum syllables per word */
  minSyllables: number;
  /** Stress pattern (unstressed/stressed indices) */
  stressPattern: readonly number[];
}

/** Arelorian phonotactics */
const ARELORIAN_PHONOTACTICS: PhonotacticRules = Object.freeze({
  onsets: Object.freeze([
    '', 'k', 'g', 't', 'd', 'p', 'b', 'm', 'n', 'r', 'l', 's', 'sh', 'v', 'th',
    'kr', 'gr', 'tr', 'dr', 'pr', 'br', 'st', 'sp', 'sk', 'sl', 'sv',
  ]),
  nuclei: Object.freeze(['a', 'e', 'i', 'o', 'u', 'ae', 'ai', 'ei', 'ou']),
  codas: Object.freeze([
    '', 'k', 'g', 't', 'd', 'p', 'b', 'm', 'n', 'r', 'l', 's', 'sh',
    'th', 'st', 'rt', 'rk', 'lg', 'nd', 'mp', 'nt',
  ]),
  maxSyllables: 4,
  minSyllables: 1,
  stressPattern: Object.freeze([0, 2]), // Stress on 1st and 3rd syllables
});

// =============================================================================
// MORPHEME COMPOSITION RULES
// =============================================================================

interface MorphemeRule {
  type: 'prefix' | 'root' | 'suffix' | 'infix';
  morpheme: string;
  meaning: string;
  position: 'start' | 'end' | 'any';
  phonologicalConstraint?: (prev: string, next: string) => boolean;
}

/** Arelorian morpheme corpus */
const MORPHEME_RULES: readonly MorphemeRule[] = Object.freeze([
  // Prefixes
  { type: 'prefix', morpheme: 'ae-', meaning: 'toward', position: 'start' },
  { type: 'prefix', morpheme: 'dre-', meaning: 'away', position: 'start' },
  { type: 'prefix', morpheme: 'kel-', meaning: 'above', position: 'start' },
  { type: 'prefix', morpheme: 'mor-', meaning: 'below', position: 'start' },
  { type: 'prefix', morpheme: 'tha-', meaning: 'through', position: 'start' },
  { type: 'prefix', morpheme: 'ven-', meaning: 'within', position: 'start' },
  { type: 'prefix', morpheme: 'ash-', meaning: 'between', position: 'start' },
  { type: 'prefix', morpheme: 'elu-', meaning: 'beyond', position: 'start' },
  { type: 'prefix', morpheme: 'ira-', meaning: 'before', position: 'start' },
  { type: 'prefix', morpheme: 'ora-', meaning: 'after', position: 'start' },

  // Suffixes
  { type: 'suffix', morpheme: '-ash', meaning: 'plural', position: 'end' },
  { type: 'suffix', morpheme: '-el', meaning: 'agent', position: 'end' },
  { type: 'suffix', morpheme: '-ir', meaning: 'action', position: 'end' },
  { type: 'suffix', morpheme: '-en', meaning: 'state', position: 'end' },
  { type: 'suffix', morpheme: '-eth', meaning: 'quality', position: 'end' },
  { type: 'suffix', morpheme: '-am', meaning: 'place', position: 'end' },
  { type: 'suffix', morpheme: '-ar', meaning: 'tool', position: 'end' },
  { type: 'suffix', morpheme: '-os', meaning: 'divine', position: 'end' },
  { type: 'suffix', morpheme: '-is', meaning: 'mortal', position: 'end' },
  { type: 'suffix', morpheme: '-un', meaning: 'shadow', position: 'end' },

  // Roots
  { type: 'root', morpheme: 'gor', meaning: 'fire', position: 'any' },
  { type: 'root', morpheme: 'thal', meaning: 'stone', position: 'any' },
  { type: 'root', morpheme: 'ven', meaning: 'water', position: 'any' },
  { type: 'root', morpheme: 'sar', meaning: 'wind', position: 'any' },
  { type: 'root', morpheme: 'kel', meaning: 'light', position: 'any' },
  { type: 'root', morpheme: 'mor', meaning: 'shadow', position: 'any' },
  { type: 'root', morpheme: 'den', meaning: 'earth', position: 'any' },
  { type: 'root', morpheme: 'asha', meaning: 'life', position: 'any' },
  { type: 'root', morpheme: 'elu', meaning: 'death', position: 'any' },
  { type: 'root', morpheme: 'ira', meaning: 'time', position: 'any' },
  { type: 'root', morpheme: 'ora', meaning: 'space', position: 'any' },
  { type: 'root', morpheme: 'etha', meaning: 'mind', position: 'any' },
  { type: 'root', morpheme: 'ama', meaning: 'body', position: 'any' },
  { type: 'root', morpheme: 'ena', meaning: 'spirit', position: 'any' },
  { type: 'root', morpheme: 'tha', meaning: 'path', position: 'any' },
  { type: 'root', morpheme: 'vash', meaning: 'quest', position: 'any' },
  { type: 'root', morpheme: 'dren', meaning: 'blood', position: 'any' },
  { type: 'root', morpheme: 'keth', meaning: 'crown', position: 'any' },
  { type: 'root', morpheme: 'goth', meaning: 'throne', position: 'any' },
  { type: 'root', morpheme: 'sel', meaning: 'sworn', position: 'any' },
]);

// =============================================================================
// WORD GENERATION
// =============================================================================

export interface GeneratedWord {
  readonly word: string;
  readonly meaning: string;
  readonly morphemes: readonly string[];
  readonly syllables: number;
  readonly seed: number;
  readonly hash: string;
}

/**
 * Generate pure Arelorian word from concept.
 * Deterministic: same inputs → same word.
 */
export function generateArelorianWord(
  concept: string,
  seed: string | number,
  options?: {
    minSyllables?: number;
    maxSyllables?: number;
    preferRoots?: readonly string[];
  }
): GeneratedWord {
  const seedNum = typeof seed === 'string' ? stableHash32(seed) : seed;
  const rules = ARELORIAN_PHONOTACTICS;

  // Determine syllable count
  const minSyl = options?.minSyllables ?? rules.minSyllables;
  const maxSyl = options?.maxSyllables ?? rules.maxSyllables;
  const syllableCount = minSyl + (seedNum % (maxSyl - minSyl + 1));

  // Build morpheme sequence
  const morphemeSequence = buildMorphemeSequence(concept, seedNum, options);

  // Generate word from phonotactics
  const syllables: string[] = [];
  let currentSeed = seedNum;

  for (let i = 0; i < syllableCount; i++) {
    const syllable = generateSyllable(rules, currentSeed + i * 100);
    syllables.push(syllable);
    currentSeed = stableHash32(currentSeed.toString());
  }

  // Join syllables
  const word = syllables.join('');

  // Calculate hash
  const hash = stableHash32(`${CONLANG_TAG}:${concept}:${word}:${seedNum}`).toString(16);

  return Object.freeze({
    word,
    meaning: concept,
    morphemes: Object.freeze(morphemeSequence),
    syllables: syllableCount,
    seed: seedNum,
    hash,
  });
}

/**
 * Build morpheme sequence for concept.
 */
function buildMorphemeSequence(
  concept: string,
  seed: number,
  options?: {
    preferRoots?: readonly string[];
  }
): string[] {
  const sequence: string[] = [];
  const conceptLower = concept.toLowerCase();

  // Find matching roots
  const matchingRoots = MORPHEME_RULES.filter(
    (m) => m.type === 'root' && (conceptLower.includes(m.meaning) || m.meaning.includes(conceptLower))
  );

  // Add prefix if available
  const prefixRule = MORPHEME_RULES.find(
    (m) =>
      m.type === 'prefix' &&
      (conceptLower.startsWith(m.meaning) || conceptLower.includes(m.meaning))
  );
  if (prefixRule) {
    sequence.push(prefixRule.morpheme);
  }

  // Add root
  if (matchingRoots.length > 0) {
    const rootIndex = seed % matchingRoots.length;
    sequence.push(matchingRoots[rootIndex].morpheme);
  } else {
    // Use generic root based on hash
    const genericRoots = MORPHEME_RULES.filter((m) => m.type === 'root');
    const rootIndex = stableHash32(`${concept}:${seed}`) % genericRoots.length;
    sequence.push(genericRoots[rootIndex].morpheme);
  }

  // Add suffix if available
  const suffixRule = MORPHEME_RULES.find(
    (m) =>
      m.type === 'suffix' &&
      (conceptLower.endsWith(m.meaning) || conceptLower.includes(m.meaning))
  );
  if (suffixRule) {
    sequence.push(suffixRule.morpheme);
  }

  return sequence;
}

/**
 * Generate single syllable from phonotactic rules.
 */
function generateSyllable(rules: PhonotacticRules, seed: number): string {
  const onsetIndex = seed % rules.onsets.length;
  const nucleusIndex = stableHash32(seed.toString()) % rules.nuclei.length;
  const codaIndex = stableHash32((seed + 1).toString()) % rules.codas.length;

  const onset = rules.onsets[onsetIndex];
  const nucleus = rules.nuclei[nucleusIndex];
  const coda = rules.codas[codaIndex];

  return `${onset}${nucleus}${coda}`;
}

// =============================================================================
// CODE-SWITCHING (mixed language speech)
// =============================================================================

/**
 * Generate mixed-language speech with code-switching.
 * Used when NPCs speak mixed Arelorian/Common.
 */
export interface MixedSpeechResult {
  readonly fullText: string;
  readonly arelorianRatio: number;
  readonly switchedSegments: readonly {
    text: string;
    language: 'arel' | 'common';
    startIndex: number;
    endIndex: number;
  }[];
}

/**
 * Generate mixed speech with Arelorian insertions.
 */
export function generateMixedSpeech(
  baseText: string,
  arelorianRatio: number,
  seed: string | number
): MixedSpeechResult {
  const seedNum = typeof seed === 'string' ? stableHash32(seed) : seed;
  const switchedSegments: MixedSpeechResult['switchedSegments'] = [];

  // Determine where to insert Arelorian
  const words = baseText.split(/\s+/);
  const resultWords: string[] = [];
  let currentIndex = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordSeed = stableHash32(`${seedNum}:${i}`);

    // Decide if this word should be Arelorian
    if (wordSeed % 1000 < arelorianRatio * 1000) {
      // Generate Arelorian replacement
      const arelorianWord = generateArelorianWord(word, wordSeed);
      resultWords.push(arelorianWord.word);

      switchedSegments.push({
        text: arelorianWord.word,
        language: 'arel',
        startIndex: currentIndex,
        endIndex: currentIndex + arelorianWord.word.length,
      });
    } else {
      resultWords.push(word);
    }

    currentIndex += word.length + 1; // +1 for space
  }

  return Object.freeze({
    fullText: resultWords.join(' '),
    arelorianRatio,
    switchedSegments: Object.freeze(switchedSegments),
  });
}

// =============================================================================
// CULTURAL SPREAD
// =============================================================================

/**
 * Track successful Arelorian term propagation.
 */
interface TermPropagation {
  readonly term: string;
  readonly originFactionId: string;
  readonly originTick: number;
  readonly spreadCount: number;
  readonly adoptionCount: number;
  readonly canonicalized: boolean;
}

const termPropagation: Map<string, TermPropagation> = new Map();

/**
 * Record successful term usage (for cultural spread tracking).
 */
export function recordTermUsage(
  term: string,
  factionId: string,
  tick: number,
  wasSuccessful: boolean
): void {
  const existing = termPropagation.get(term);

  if (existing) {
    const updated: TermPropagation = Object.freeze({
      ...existing,
      spreadCount: existing.spreadCount + 1,
      adoptionCount: existing.adoptionCount + (wasSuccessful ? 1 : 0),
    });
    termPropagation.set(term, updated);
  } else {
    const newProp: TermPropagation = Object.freeze({
      term,
      originFactionId: factionId,
      originTick: tick,
      spreadCount: 1,
      adoptionCount: wasSuccessful ? 1 : 0,
      canonicalized: false,
    });
    termPropagation.set(term, newProp);
  }
}

/**
 * Get terms ready for canonicalization (cultural promotion).
 */
export function getTermsForCanonicalization(): readonly TermPropagation[] {
  return Array.from(termPropagation.values()).filter(
    (t) => !t.canonicalized && t.adoptionCount >= 3 && t.spreadCount >= 5
  );
}

/**
 * Canonicalize term (promote to canon).
 */
export function canonicalizeTerm(term: string): boolean {
  const existing = termPropagation.get(term);
  if (!existing) return false;

  const updated: TermPropagation = Object.freeze({
    ...existing,
    canonicalized: true,
  });
  termPropagation.set(term, updated);

  return true;
}

// =============================================================================
// PHRASE GENERATION
// =============================================================================

/**
 * Generate complete Arelorian phrase.
 */
export interface GeneratedPhrase {
  readonly phrase: string;
  readonly translation: string;
  readonly formality: 'formal' | 'casual' | 'ritual';
  readonly seed: number;
}

/**
 * Generate Arelorian phrase template.
 */
export function generateArelorianPhrase(
  type: 'greeting' | 'farewell' | 'oath' | 'curse' | 'blessing',
  seed: string | number
): GeneratedPhrase {
  const seedNum = typeof seed === 'string' ? stableHash32(seed) : seed;

  const phraseTemplates: Record<typeof type, readonly { phrase: string; translation: string; formality: 'formal' | 'casual' | 'ritual' }[]> = {
    greeting: Object.freeze([
      { phrase: 'Ashena, welor.', translation: 'Well met, traveler.', formality: 'formal' },
      { phrase: 'Kel tha vashir.', translation: 'Light guides your path.', formality: 'formal' },
      { phrase: 'Ama ena thalos.', translation: 'Body and spirit joined.', formality: 'casual' },
    ]),
    farewell: Object.freeze([
      { phrase: 'Kel etha sar.', translation: 'May light attend you.', formality: 'formal' },
      { phrase: 'Mor un vashen.', translation: 'Shadows keep you.', formality: 'casual' },
      { phrase: 'Ash drena mora.', translation: 'Until blood meets.', formality: 'ritual' },
    ]),
    oath: Object.freeze([
      { phrase: 'Ena selos kethoron.', translation: 'I swear by spirit and throne.', formality: 'ritual' },
      { phrase: 'Gor den selar.', translation: 'Fire and earth witness.', formality: 'ritual' },
      { phrase: 'Thal vashir selos.', translation: 'Stone marks oath.', formality: 'ritual' },
    ]),
    curse: Object.freeze([
      { phrase: 'Elu ash moris.', translation: 'Death takes you.', formality: 'formal' },
      { phrase: 'Mor un goren.', translation: 'Shadow consume.', formality: 'casual' },
      { phrase: 'Ven thel drena.', translation: 'Water turn to blood.', formality: 'ritual' },
    ]),
    blessing: Object.freeze([
      { phrase: 'Kel os ena vash.', translation: 'Light bless spirit quest.', formality: 'formal' },
      { phrase: 'Sar etha kelor.', translation: 'Wind bring light.', formality: 'casual' },
      { phrase: 'Gor ama selden.', translation: 'Fire body sworn earth.', formality: 'ritual' },
    ]),
  };

  const templates = phraseTemplates[type];
  const index = seedNum % templates.length;
  const selected = templates[index];

  return Object.freeze({
    phrase: selected.phrase,
    translation: selected.translation,
    formality: selected.formality,
    seed: seedNum,
  });
}

// =============================================================================
// TELEMETRY
// =============================================================================

/**
 * Get conlang statistics.
 */
export function getConlangStats(): {
  totalTerms: number;
  canonicalizedTerms: number;
  averageSpread: number;
  averageAdoptionRate: number;
} {
  if (termPropagation.size === 0) {
    return Object.freeze({
      totalTerms: 0,
      canonicalizedTerms: 0,
      averageSpread: 0,
      averageAdoptionRate: 0,
    });
  }

  let totalSpread = 0;
  let totalAdoption = 0;
  let canonicalized = 0;

  for (const term of termPropagation.values()) {
    totalSpread += term.spreadCount;
    totalAdoption += term.adoptionCount;
    if (term.canonicalized) canonicalized++;
  }

  const count = termPropagation.size;

  return Object.freeze({
    totalTerms: count,
    canonicalizedTerms: canonicalized,
    averageSpread: totalSpread / count,
    averageAdoptionRate: totalAdoption / totalSpread,
  });
}

/**
 * Clear propagation tracking (for testing).
 */
export function clearPropagationTracking(): void {
  termPropagation.clear();
}