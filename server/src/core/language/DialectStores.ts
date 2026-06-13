/**
 * @file server/src/core/language/DialectStores.ts
 * @description FactionDialectStore & NpcIdiolectStore - Faction and NPC-specific language variants.
 *
 * FactionDialectStore: Language rules and signature terms per faction.
 * NpcIdiolectStore: Personal language memory and preferences per NPC.
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All lookups derive from stable hashes
 */

import { stableHash32 } from '../determinism/AREDeterminism.js';
import type {
  FactionDialect,
  NpcIdiolect,
  DialectVariant,
  LanguageCode,
  SocialRegister,
  KappaInt,
} from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import type { NpcId } from '../are/types.js';

// =============================================================================
// FACTION DIALECT STORE
// =============================================================================

const factionDialects: Map<string, FactionDialect> = new Map();

/**
 * Register a faction dialect.
 */
export function registerFactionDialect(dialect: FactionDialect): void {
  factionDialects.set(dialect.factionId, Object.freeze(dialect));
}

/**
 * Get faction dialect by ID.
 */
export function getFactionDialect(factionId: string): FactionDialect | undefined {
  return factionDialects.get(factionId);
}

/**
 * Get all registered faction dialects.
 */
export function getAllFactionDialects(): readonly FactionDialect[] {
  return Array.from(factionDialects.values());
}

/**
 * Get dialect variant for lexeme in faction context.
 */
export function getDialectVariant(
  factionId: string,
  lexemeId: string,
  register: SocialRegister
): string | undefined {
  const dialect = factionDialects.get(factionId);
  if (!dialect) return undefined;

  // Check for explicit variant
  const variant = dialect.dialectVariants.find(
    (v) => v.lexemeId === lexemeId && v.register === register
  );

  if (variant) {
    return variant.variant;
  }

  // No variant exists - use default
  return undefined;
}

/**
 * Get faction's preferred register.
 */
export function getFactionPreferredRegister(factionId: string): SocialRegister {
  const dialect = factionDialects.get(factionId);
  return dialect?.registerPreference ?? 'formal';
}

/**
 * Get faction's base language.
 */
export function getFactionBaseLanguage(factionId: string): LanguageCode {
  const dialect = factionDialects.get(factionId);
  return dialect?.baseLanguage ?? 'de';
}

/**
 * Check if word is taboo for faction.
 */
export function isTabooWord(factionId: string, word: string): boolean {
  const dialect = factionDialects.get(factionId);
  if (!dialect) return false;
  return dialect.tabooWords.includes(word.toLowerCase());
}

/**
 * Get faction ritual phrase by type.
 */
export function getFactionRitualPhrase(factionId: string, type: 'greeting' | 'farewell' | 'oath'): string | undefined {
  const dialect = factionDialects.get(factionId);
  if (!dialect) return undefined;

  // Return deterministic phrase based on type
  const phrases = dialect.ritualPhrases.filter((p) => {
    if (type === 'greeting') return p.includes('hail') || p.includes('well met');
    if (type === 'farewell') return p.includes('farewell') || p.includes('go with');
    if (type === 'oath') return p.includes('swear') || p.includes('promise') || p.includes('by');
    return true;
  });

  if (phrases.length === 0) return undefined;

  // Deterministic pick
  const seed = stableHash32(`${factionId}:${type}`);
  return phrases[seed % phrases.length];
}

/**
 * Seed default faction dialects.
 */
export function seedDefaultDialects(): void {
  // Merchant League - trade-focused, practical English
  registerFactionDialect({
    factionId: 'merchant_league',
    baseLanguage: 'en',
    signatureMorphemes: ['coin', 'trade', 'profit', 'fair', 'deal'],
    registerPreference: 'formal',
    tabooWords: ['steal', 'cheat', 'swindle'],
    honorifics: ['good sir', 'esteemed colleague', 'valued associate'],
    curseWords: ['knave', 'miser', 'swindler'],
    ritualPhrases: ['Hail to the merchant.', 'Fair winds fill your sails.', 'May your purses stay full.'],
    dialectVariants: [],
  });

  // Shadow Register - criminal guild slang
  registerFactionDialect({
    factionId: 'shadow_register',
    baseLanguage: 'guild',
    signatureMorphemes: ['soft', 'cut', 'shadow', 'whisper', 'blade'],
    registerPreference: 'criminal',
    tabooWords: ['honest', 'sheriff', 'guard'],
    honorifics: ['friend', 'associate', 'shadow'],
    curseWords: ['copper', 'fence', 'rat'],
    ritualPhrases: ['Shadows guide you.', 'Cut clean, go deep.', 'The night is our ally.'],
    dialectVariants: [],
  });

  // Sun Order - religious/mythic Arelorian
  registerFactionDialect({
    factionId: 'sun_order',
    baseLanguage: 'mythic',
    signatureMorphemes: ['light', 'order', 'sacred', 'blessed', 'divine'],
    registerPreference: 'religious',
    tabooWords: ['dark', 'shadow', 'chaos'],
    honorifics: ['blessed one', 'lightbringer', 'faithful'],
    curseWords: ['heretic', 'shadow-touched', 'voidwalker'],
    ritualPhrases: ['The light endures.', 'Blessed by the sun.', 'Order through devotion.'],
    dialectVariants: [],
  });

  // Millbrook Village - German peasant dialect
  registerFactionDialect({
    factionId: 'millbrook',
    baseLanguage: 'de',
    signatureMorphemes: ['dorf', 'feld', 'gut', 'brot', 'wasser'],
    registerPreference: 'peasant',
    tabooWords: ['fremder', 'dieb'],
    honorifics: ['freund', 'nachbar', 'guter mensch'],
    curseWords: ['schurke', 'bauer'],
    ritualPhrases: ['Guten tag.', 'Moge die Ernte gut sein.', 'Der brunnen steht unter gesetz.'],
    dialectVariants: [],
  });

  // Blacksmith Guild - guild craft language
  registerFactionDialect({
    factionId: 'blacksmith_guild',
    baseLanguage: 'de',
    signatureMorphemes: ['eisen', 'hammer', 'feuer', 'schmied', 'stahl'],
    registerPreference: 'guild',
    tabooWords: ['betruger', 'pfuscher'],
    honorifics: ['meister', 'geselle', 'lehrling'],
    curseWords: ['pfuscher', 'blech'],
    ritualPhrases: ['Eisen und fire.', 'Gute Arbeit.', 'Der Hammer spricht.'],
    dialectVariants: [],
  });
}

// =============================================================================
// NPC IDIOLECT STORE
// =============================================================================

const npcIdiolects: Map<string, NpcIdiolect> = new Map();

/**
 * Register NPC idiolect.
 */
export function registerNpcIdiolect(idiolect: NpcIdiolect): void {
  npcIdiolects.set(idiolect.npcId, Object.freeze(idiolect));
}

/**
 * Get NPC idiolect by ID.
 */
export function getNpcIdiolect(npcId: string): NpcIdiolect | undefined {
  return npcIdiolects.get(npcId);
}

/**
 * Create default idiolect for NPC.
 */
export function createDefaultIdiolect(
  npcId: string,
  factionId: string,
  role: string
): NpcIdiolect {
  const factionDialect = getFactionDialect(factionId);

  return Object.freeze({
    npcId,
    preferredLanguage: factionDialect?.baseLanguage ?? 'de',
    speechPatterns: Object.freeze([]),
    learnedLexemeIds: Object.freeze([]),
    avoidedLexemeIds: Object.freeze([]),
    personalAssociations: Object.freeze({}),
    trustThresholds: Object.freeze({
      whisperSecrets: createKappaInt(0.7),
      shareRumors: createKappaInt(0.5),
      requestHelp: createKappaInt(0.4),
      acceptQuests: createKappaInt(0.3),
    }),
  });
}

/**
 * Update NPC idiolect with learned lexeme.
 */
export function learnLexeme(npcId: string, lexemeId: string): void {
  const idiolect = npcIdiolects.get(npcId);
  if (!idiolect) return;

  // Don't re-learn
  if (idiolect.learnedLexemeIds.includes(lexemeId)) return;

  const updated: NpcIdiolect = Object.freeze({
    ...idiolect,
    learnedLexemeIds: Object.freeze([...idiolect.learnedLexemeIds, lexemeId]),
  });

  npcIdiolects.set(npcId, updated);
}

/**
 * Update NPC idiolect to avoid lexeme.
 */
export function avoidLexeme(npcId: string, lexemeId: string): void {
  const idiolect = npcIdiolects.get(npcId);
  if (!idiolect) return;

  // Already avoiding
  if (idiolect.avoidedLexemeIds.includes(lexemeId)) return;

  const updated: NpcIdiolect = Object.freeze({
    ...idiolect,
    avoidedLexemeIds: Object.freeze([...idiolect.avoidedLexemeIds, lexemeId]),
  });

  npcIdiolects.set(npcId, updated);
}

/**
 * Add personal word association.
 */
export function addWordAssociation(
  npcId: string,
  concept: string,
  lexemeId: string
): void {
  const idiolect = npcIdiolects.get(npcId);
  if (!idiolect) return;

  const updated: NpcIdiolect = Object.freeze({
    ...idiolect,
    personalAssociations: Object.freeze({
      ...idiolect.personalAssociations,
      [concept]: lexemeId,
    }),
  });

  npcIdiolects.set(npcId, updated);
}

/**
 * Get NPC's personal word for concept.
 */
export function getPersonalWord(npcId: string, concept: string): string | undefined {
  const idiolect = npcIdiolects.get(npcId);
  if (!idiolect) return undefined;
  return idiolect.personalAssociations[concept];
}

/**
 * Check if NPC should use learned lexeme (preference weighting).
 */
export function shouldUseLearnedLexeme(npcId: string, lexemeId: string): boolean {
  const idiolect = npcIdiolects.get(npcId);
  if (!idiolect) return false;

  // Check if avoided
  if (idiolect.avoidedLexemeIds.includes(lexemeId)) return false;

  // Check if learned
  if (idiolect.learnedLexemeIds.includes(lexemeId)) return true;

  // Not yet learned - use based on language preference
  return idiolect.preferredLanguage === 'guild' || idiolect.preferredLanguage === 'mythic';
}

/**
 * Get speech pattern for NPC based on trust level.
 */
export function getSpeechPatternForTrust(npcId: string, trust: KappaInt): SocialRegister {
  const idiolect = npcIdiolects.get(npcId);
  if (!idiolect) return 'formal';

  const trustValue = Number(trust);

  // Trust-based register selection
  if (trustValue >= 0.7) return 'intimate';
  if (trustValue >= 0.5) return 'formal';
  if (trustValue >= 0.3) return 'peasant';
  return 'rude';
}

/**
 * Clear all idiolects (for testing).
 */
export function clearAllIdiolects(): void {
  npcIdiolects.clear();
}

/**
 * Get idiolect count.
 */
export function getIdiolectCount(): number {
  return npcIdiolects.size;
}

// =============================================================================
// COMBINED LOOKUP
// =============================================================================

/**
 * Get effective language for NPC in context.
 */
export function getEffectiveLanguage(
  npcId: string,
  factionId: string,
  trust: KappaInt
): LanguageCode {
  const idiolect = npcIdiolects.get(npcId);
  const factionDialect = getFactionDialect(factionId);

  // NPC preference overrides faction if set
  if (idiolect?.preferredLanguage) {
    return idiolect.preferredLanguage;
  }

  return factionDialect?.baseLanguage ?? 'de';
}

/**
 * Get effective register for NPC in context.
 */
export function getEffectiveRegister(
  npcId: string,
  factionId: string,
  trust: KappaInt,
  fear: KappaInt
): SocialRegister {
  // High fear overrides to military/criminal
  if (Number(fear) > 0.7) {
    return 'military';
  }

  // Trust-based from idiolect
  const idiolect = npcIdiolects.get(npcId);
  if (idiolect) {
    return getSpeechPatternForTrust(npcId, trust);
  }

  // Fall back to faction preference
  return getFactionPreferredRegister(factionId);
}

/**
 * Get greeting phrase for NPC.
 */
export function getGreetingPhrase(npcId: string, factionId: string): string {
  const idiolect = npcIdiolects.get(npcId);
  const factionDialect = getFactionDialect(factionId);

  // Personal greeting takes precedence
  if (idiolect?.speechPatterns.length && idiolect.speechPatterns.includes('greeting')) {
    return 'Well met.';
  }

  // Faction ritual greeting
  const ritual = getFactionRitualPhrase(factionId, 'greeting');
  if (ritual) return ritual;

  // Default
  return 'Greetings.';
}

/**
 * Get farewell phrase for NPC.
 */
export function getFarewellPhrase(npcId: string, factionId: string): string {
  const idiolect = npcIdiolects.get(npcId);
  const factionDialect = getFactionDialect(factionId);

  // Personal farewell
  if (idiolect?.speechPatterns.length && idiolect.speechPatterns.includes('farewell')) {
    return 'Until we meet again.';
  }

  // Faction ritual farewell
  const ritual = getFactionRitualPhrase(factionId, 'farewell');
  if (ritual) return ritual;

  // Default
  return 'Farewell.';
}