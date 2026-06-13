import { stableHash32 } from '../determinism/AREDeterminism.js';
import type { PhraseGenome, LivingLexeme, LanguageCode, SentencePosition } from './LanguageTypes.js';
import { findLexemeForSlot, getLexeme } from './LivingDudenArchive.js';

const GRAMMAR_TAG = 'PROC_GRAMMAR_V1';

interface GrammarRule {
  readonly language: LanguageCode;
  readonly slotOrder: readonly SentencePosition[];
  readonly requiredSlots: readonly SentencePosition[];
  readonly articleByGender?: Readonly<Record<string, string>>;
  readonly verbSuffixes?: Readonly<Record<string, string>>;
}

const GERMAN_GRAMMAR: GrammarRule = Object.freeze({
  language: 'de',
  slotOrder: Object.freeze(['address', 'subject', 'verb', 'object', 'modifier', 'reason', 'place', 'closing']),
  requiredSlots: Object.freeze(['subject', 'verb']),
  articleByGender: Object.freeze({ masculine: 'der', feminine: 'die', neutral: 'das', none: '' }),
  verbSuffixes: Object.freeze({ first_present: 'e', second_present: 'st', third_present: 't' }),
});

const ENGLISH_GRAMMAR: GrammarRule = Object.freeze({
  language: 'en',
  slotOrder: Object.freeze(['address', 'subject', 'verb', 'object', 'modifier', 'reason', 'place', 'closing']),
  requiredSlots: Object.freeze(['subject', 'verb']),
  articleByGender: Object.freeze({ masculine: 'the', feminine: 'the', neutral: 'the', none: '' }),
  verbSuffixes: Object.freeze({ third_present: 's' }),
});

const ARELORIAN_GRAMMAR: GrammarRule = Object.freeze({
  language: 'arel',
  slotOrder: Object.freeze(['address', 'emotion_marker', 'subject', 'verb', 'object', 'myth', 'closing']),
  requiredSlots: Object.freeze(['subject', 'verb']),
  verbSuffixes: Object.freeze({ first_present: 'am', second_present: 'ir', third_present: 'el' }),
});

const GUILD_GRAMMAR: GrammarRule = Object.freeze({
  language: 'guild',
  slotOrder: Object.freeze(['address', 'subject', 'verb', 'object', 'modifier', 'closing']),
  requiredSlots: Object.freeze(['subject', 'verb']),
});

const grammarRules: Readonly<Record<LanguageCode, GrammarRule>> = Object.freeze({
  de: GERMAN_GRAMMAR,
  en: ENGLISH_GRAMMAR,
  arel: ARELORIAN_GRAMMAR,
  guild: GUILD_GRAMMAR,
  mythic: ARELORIAN_GRAMMAR,
  mixed: ENGLISH_GRAMMAR,
});

function getGrammarForLanguage(language: LanguageCode): GrammarRule {
  return grammarRules[language] ?? ENGLISH_GRAMMAR;
}

export interface SlotFiller {
  readonly slot: SentencePosition;
  readonly lexeme: LivingLexeme;
  readonly text: string;
}

export interface ConstructionResult {
  readonly success: boolean;
  readonly text?: string;
  readonly fillers?: readonly SlotFiller[];
  readonly hash?: string;
  readonly error?: string;
}

export function buildSentence(
  phraseGenome: PhraseGenome,
  seed: number,
  options?: { readonly dialectOverride?: LanguageCode; readonly preferFallback?: boolean }
): ConstructionResult {
  const language = options?.dialectOverride ?? phraseGenome.languageMode;
  const grammar = getGrammarForLanguage(language);
  const fillers: SlotFiller[] = [];
  const hashParts: string[] = [GRAMMAR_TAG, phraseGenome.id, language, seed.toString()];

  for (const slotDef of phraseGenome.slots) {
    const slotRole = normalizeSlotRole(slotDef.role);
    if (!grammar.slotOrder.includes(slotRole)) continue;

    const lexeme = selectLexemeForSlot(slotDef, slotRole, language, seed, fillers.length);
    if (!lexeme) {
      if (slotDef.required) return Object.freeze({ success: false, error: `Required slot ${slotRole} could not be filled` });
      continue;
    }

    fillers.push(Object.freeze({ slot: slotRole, lexeme, text: applyGrammar(lexeme, grammar, slotRole) }));
    hashParts.push(`${slotRole}:${lexeme.id}`);
  }

  const textParts = grammar.slotOrder
    .flatMap((slot) => fillers.filter((filler) => filler.slot === slot))
    .map((filler) => filler.text.trim())
    .filter(Boolean);
  if (textParts.length === 0) return Object.freeze({ success: false, error: 'No slots could be filled' });

  const text = normalizeSentence(textParts.join(' '));
  const hash = stableHash32([...hashParts, text].join('|')).toString(16);
  return Object.freeze({ success: true, text, fillers: Object.freeze(fillers), hash });
}

function selectLexemeForSlot(
  slotDef: PhraseGenome['slots'][number],
  slotRole: SentencePosition,
  language: LanguageCode,
  seed: number,
  offset: number
): LivingLexeme | undefined {
  if (slotDef.lexemeIds && slotDef.lexemeIds.length > 0) {
    const selectedIndex = stableHash32(`${seed}:${slotRole}:${offset}`) % slotDef.lexemeIds.length;
    return getLexeme(slotDef.lexemeIds[selectedIndex]);
  }
  if (slotDef.semanticRequirements && slotDef.semanticRequirements.length > 0) {
    return findLexemeForSlot({ concepts: slotDef.semanticRequirements, language, position: slotRole }, stableHash32(`${seed}:${slotRole}:${slotDef.semanticRequirements.join(',')}`));
  }
  return undefined;
}

function normalizeSlotRole(role: SentencePosition): SentencePosition {
  return role === 'emotionalMarker' ? 'emotion_marker' : role;
}

function applyGrammar(lexeme: LivingLexeme, grammar: GrammarRule, position: SentencePosition): string {
  let text = lexeme.lemma.trim();
  if (!text) return text;
  if (position === 'subject' && lexeme.grammar.partOfSpeech === 'noun') {
    const article = grammar.articleByGender?.[lexeme.grammar.gender ?? 'none'] ?? '';
    if (article) text = `${article} ${text}`;
  }
  if (position === 'verb' && lexeme.grammar.partOfSpeech === 'verb') {
    const person = lexeme.grammar.verbPerson ?? 'third';
    const tense = lexeme.grammar.verbTense ?? 'present';
    const suffix = grammar.verbSuffixes?.[`${person}_${tense}`] ?? '';
    if (suffix && suffix !== 'Ø' && !text.endsWith(suffix)) text = `${text}${suffix}`;
  }
  if (position === 'address' || position === 'subject') text = capitalize(text);
  return text;
}

function normalizeSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return trimmed;
  const capitalized = capitalize(trimmed);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

export function validatePhraseGenome(genome: PhraseGenome): { readonly valid: boolean; readonly errors: string[] } {
  const errors: string[] = [];
  const grammar = getGrammarForLanguage(genome.languageMode);
  for (const required of grammar.requiredSlots) {
    if (!genome.slots.some((slot) => normalizeSlotRole(slot.role) === required)) errors.push(`Missing required slot: ${required}`);
  }
  const seenSlots = new Set<string>();
  for (const slot of genome.slots) {
    const normalized = normalizeSlotRole(slot.role);
    if (seenSlots.has(normalized)) errors.push(`Duplicate slot role: ${normalized}`);
    seenSlots.add(normalized);
  }
  return Object.freeze({ valid: errors.length === 0, errors });
}

export function getPhraseGenomeOrFallback(_genomeId: string): PhraseGenome | undefined {
  return undefined;
}

export function createSentenceSeed(npcId: string, intent: string, tick: number, sequenceId: number): number {
  return stableHash32([npcId, intent, tick.toString(), sequenceId.toString()].join('|'));
}
