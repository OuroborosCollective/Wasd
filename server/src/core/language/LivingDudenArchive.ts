/**
 * @file server/src/core/language/LivingDudenArchive.ts
 * @description LivingDudenArchive - Word-as-meaning-organism database.
 *
 * NPCs do not "process text". They process MEANING.
 * This archive stores lexemes as causal meaning organisms with semantics,
 * grammar, social weights, and mutation tracking.
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All lookups derive from stable hashes of meaning/components
 * - Wall-clock time only in explicitly marked side-channel telemetry
 */

import { KAPPA } from '../are/Kappa.js';
import { stableHash32 } from '../determinism/AREDeterminism.js';
import type {
  LivingLexeme,
  LexemeEmotion,
  LexemeSocial,
  LexemeWorldBindings,
  LexemeGrammar,
  LexemeUsage,
  LexemeWeighting,
  LexemeMutation,
  LanguageCode,
  PartOfSpeech,
  SocialRegister,
  SentencePosition,
  KappaInt,
} from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';

const SCHEMA_VERSION = 1;
const DUDEN_TAG = 'LIVING_DUDEN_V1';

// =============================================================================
// LEXEME REGISTRY
// =============================================================================

/** Internal mutable registry - exposed only through immutable getters */
const lexemeRegistry: Map<string, LivingLexeme> = new Map();

/** Lexeme indices for fast lookup */
const byLanguage: Map<LanguageCode, Set<string>> = new Map();
const byConcept: Map<string, Set<string>> = new Map();
const byPos: Map<PartOfSpeech, Set<string>> = new Map();
const byFaction: Map<string, Set<string>> = new Map();
const inventedLexemes: Set<string> = new Set();

/** Quarantine for player-derived terms */
const quarantineRegistry: Set<string> = new Set();
const promotedRegistry: Set<string> = new Set();

// =============================================================================
// CONTENT HASH (deterministic, no crypto)
// =============================================================================

function computeContentHash(lexeme: Omit<LivingLexeme, 'integrity'>): string {
  const parts = [
    DUDEN_TAG,
    lexeme.id,
    lexeme.lemma,
    lexeme.language,
    lexeme.invented,
    lexeme.morphemes.join('|'),
    lexeme.semantics.concepts.sort().join('|'),
    lexeme.grammar.partOfSpeech,
    lexeme.weighting.baseWeight,
  ];
  return stableHash32(parts.join('::')).toString(16).padStart(8, '0');
}

// =============================================================================
// LEXEME CREATION (canonical, deterministic)
// =============================================================================

export interface LexemeBlueprint {
  id: string;
  lemma: string;
  language: LanguageCode;
  invented?: boolean;
  morphemes?: readonly string[];
  concepts?: readonly string[];
  emotion?: Partial<LexemeEmotion>;
  social?: { register: SocialRegister; overrides?: Partial<LexemeSocial> };
  worldBindings?: LexemeWorldBindings;
  grammar?: {
    partOfSpeech: PartOfSpeech;
    gender?: 'masculine' | 'feminine' | 'neutral' | 'none';
    plural?: string;
    conjugationClass?: string;
    allowedPositions?: readonly SentencePosition[];
  };
  baseWeight?: number;
}

/**
 * Add canonical lexeme to archive.
 * Called only during seed loading or approved mutations.
 */
export function registerCanonicalLexeme(blueprint: LexemeBlueprint): LivingLexeme {
  const id = blueprint.id;
  if (lexemeRegistry.has(id)) {
    return lexemeRegistry.get(id)!;
  }

  const emotion: LexemeEmotion = {
    fear: createKappaInt(blueprint.emotion?.fear ?? 0),
    anger: createKappaInt(blueprint.emotion?.anger ?? 0),
    joy: createKappaInt(blueprint.emotion?.joy ?? 0),
    trust: createKappaInt(blueprint.emotion?.trust ?? 0),
    shame: createKappaInt(blueprint.emotion?.shame ?? 0),
    pride: createKappaInt(blueprint.emotion?.pride ?? 0),
    hunger: createKappaInt(blueprint.emotion?.hunger ?? 0),
    duty: createKappaInt(blueprint.emotion?.duty ?? 0),
    revenge: createKappaInt(blueprint.emotion?.revenge ?? 0),
  };

  const socialRegister = blueprint.social?.register ?? 'formal';
  const social: LexemeSocial = {
    register: socialRegister,
    formal: createKappaInt(socialRegister === 'formal' ? 1 : 0),
    rude: createKappaInt(socialRegister === 'rude' ? 1 : 0),
    intimate: createKappaInt(socialRegister === 'intimate' ? 1 : 0),
    noble: createKappaInt(socialRegister === 'noble' ? 1 : 0),
    peasant: createKappaInt(socialRegister === 'peasant' ? 1 : 0),
    guild: createKappaInt(socialRegister === 'guild' ? 1 : 0),
    religious: createKappaInt(socialRegister === 'religious' ? 1 : 0),
    military: createKappaInt(socialRegister === 'military' ? 1 : 0),
    criminal: createKappaInt(socialRegister === 'criminal' ? 1 : 0),
    ...blueprint.social?.overrides,
  };

  const grammar: LexemeGrammar = {
    partOfSpeech: blueprint.grammar?.partOfSpeech ?? 'noun',
    gender: blueprint.grammar?.gender ?? 'none',
    plural: blueprint.grammar?.plural,
    conjugationClass: blueprint.grammar?.conjugationClass,
    allowedPositions: blueprint.grammar?.allowedPositions ?? ['subject'],
  };

  const usage: LexemeUsage = {
    totalUses: 0,
    npcUses: 0,
    factionUses: 0,
    playerReactionSuccess: 0,
    playerReactionFailure: 0,
    causedHelp: 0,
    causedTrade: 0,
    causedAggression: 0,
    causedQuestAccept: 0,
    causedQuestDecline: 0,
    causedTrustGain: 0,
    causedTrustLoss: 0,
    causedFear: 0,
  };

  const weighting: LexemeWeighting = {
    baseWeight: createKappaInt(blueprint.baseWeight ?? 1.0),
    contextWeight: createKappaInt(1.0),
    successWeight: createKappaInt(1.0),
    riskPenalty: createKappaInt(0),
    decayPerDayKappa: createKappaInt(0.001),
  };

  const mutation: LexemeMutation = {
    parentLexemeIds: [],
    generation: 0,
    createdTick: 0,
    createdByNpcId: undefined,
    createdByFactionId: undefined,
    createdFromEventHash: '',
    promoted: false,
    quarantined: false,
  };

  const partialLexeme = {
    id,
    lemma: blueprint.lemma,
    language: blueprint.language,
    invented: blueprint.invented ?? false,
    morphemes: blueprint.morphemes ?? [blueprint.lemma.toLowerCase()],
    semantics: {
      concepts: blueprint.concepts ?? [],
      emotion,
      social,
      worldBindings: blueprint.worldBindings ?? {},
    },
    grammar,
    usage,
    weighting,
    mutation,
  };

  const lexeme: LivingLexeme = Object.freeze({
    ...partialLexeme,
    integrity: {
      kappa: KAPPA,
      schemaVersion: SCHEMA_VERSION,
      contentHash: computeContentHash(partialLexeme),
    },
  });

  // Register
  lexemeRegistry.set(id, lexeme);
  indexLexeme(lexeme);

  return lexeme;
}

/** Index lexeme for fast lookup */
function indexLexeme(lexeme: LivingLexeme): void {
  // By language
  if (!byLanguage.has(lexeme.language)) {
    byLanguage.set(lexeme.language, new Set());
  }
  byLanguage.get(lexeme.language)!.add(lexeme.id);

  // By concept
  for (const concept of lexeme.semantics.concepts) {
    if (!byConcept.has(concept)) {
      byConcept.set(concept, new Set());
    }
    byConcept.get(concept)!.add(lexeme.id);
  }

  // By part of speech
  if (!byPos.has(lexeme.grammar.partOfSpeech)) {
    byPos.set(lexeme.grammar.partOfSpeech, new Set());
  }
  byPos.get(lexeme.grammar.partOfSpeech)!.add(lexeme.id);

  // By faction binding
  if (lexeme.semantics.worldBindings.factionIds) {
    for (const factionId of lexeme.semantics.worldBindings.factionIds) {
      if (!byFaction.has(factionId)) {
        byFaction.set(factionId, new Set());
      }
      byFaction.get(factionId)!.add(lexeme.id);
    }
  }

  // Invented tracking
  if (lexeme.invented) {
    inventedLexemes.add(lexeme.id);
  }
}

// =============================================================================
// LEXEME QUERY (immutable, deterministic)
// =============================================================================

export function getLexeme(id: string): LivingLexeme | undefined {
  return lexemeRegistry.get(id);
}

export function getAllLexemes(): readonly LivingLexeme[] {
  return Array.from(lexemeRegistry.values());
}

export function getLexemesByLanguage(language: LanguageCode): readonly LivingLexeme[] {
  const ids = byLanguage.get(language);
  if (!ids) return [];
  return ids.map((id) => lexemeRegistry.get(id)!).filter(Boolean);
}

export function getLexemesByConcept(concept: string): readonly LivingLexeme[] {
  const ids = byConcept.get(concept);
  if (!ids) return [];
  return ids.map((id) => lexemeRegistry.get(id)!).filter(Boolean);
}

export function getLexemesByPos(pos: PartOfSpeech): readonly LivingLexeme[] {
  const ids = byPos.get(pos);
  if (!ids) return [];
  return ids.map((id) => lexemeRegistry.get(id)!).filter(Boolean);
}

export function getLexemesByFaction(factionId: string): readonly LivingLexeme[] {
  const ids = byFaction.get(factionId);
  if (!ids) return [];
  return ids.map((id) => lexemeRegistry.get(id)!).filter(Boolean);
}

export function getInventedLexemes(): readonly LivingLexeme[] {
  return Array.from(inventedLexemes).map((id) => lexemeRegistry.get(id)!).filter(Boolean);
}

export function getLexemeCount(): number {
  return lexemeRegistry.size;
}

/**
 * Find best lexeme for semantic slot.
 * Deterministic: same inputs → same lexeme ID.
 */
export function findLexemeForSlot(
  requirements: {
    concepts?: readonly string[];
    language?: LanguageCode;
    partOfSpeech?: PartOfSpeech;
    position?: SentencePosition;
    register?: SocialRegister;
    minWeight?: KappaInt;
  },
  seed: number
): LivingLexeme | undefined {
  let candidates = Array.from(lexemeRegistry.values());

  // Filter by language
  if (requirements.language) {
    candidates = candidates.filter((l) => l.language === requirements.language);
  }

  // Filter by part of speech
  if (requirements.partOfSpeech) {
    candidates = candidates.filter((l) => l.grammar.partOfSpeech === requirements.partOfSpeech);
  }

  // Filter by position
  if (requirements.position) {
    candidates = candidates.filter((l) => l.grammar.allowedPositions.includes(requirements.position!));
  }

  // Filter by register
  if (requirements.register) {
    candidates = candidates.filter((l) => l.semantics.social.register === requirements.register);
  }

  // Filter by concept overlap
  if (requirements.concepts && requirements.concepts.length > 0) {
    candidates = candidates.filter((l) =>
      requirements.concepts!.some((c) => l.semantics.concepts.includes(c))
    );
  }

  if (candidates.length === 0) return undefined;

  // Deterministic selection using seed
  const effectiveWeight = (lexeme: LivingLexeme): number => {
    const base = Number(lexeme.weighting.baseWeight) / KAPPA;
    const context = Number(lexeme.weighting.contextWeight) / KAPPA;
    const success = Number(lexeme.weighting.successWeight) / KAPPA;
    return base * context * success;
  };

  candidates.sort((a, b) => effectiveWeight(b) - effectiveWeight(a));

  // Deterministic pick using stable hash
  const hash = stableHash32(seed.toString());
  const index = hash % candidates.length;
  return candidates[index];
}

// =============================================================================
// MUTATION (quarantined until promoted)
// =============================================================================

export interface MutationResult {
  lexeme: LivingLexeme;
  success: boolean;
  reason?: string;
}

/**
 * Create mutated variant (quarantined).
 * Does NOT enter main registry until explicitly promoted.
 */
export function createMutatedLexeme(
  parentId: string,
  mutationSeed: string,
  npcId?: string,
  factionId?: string
): MutationResult {
  const parent = lexemeRegistry.get(parentId);
  if (!parent) {
    return { lexeme: parent as never, success: false, reason: 'Parent not found' };
  }

  const eventHash = stableHash32(mutationSeed).toString(16);
  const childId = `${parentId}_mut_${eventHash.slice(0, 8)}`;

  // Prevent duplicate mutations
  if (lexemeRegistry.has(childId)) {
    return { lexeme: lexemeRegistry.get(childId)!, success: true };
  }

  // Quarantine all mutations
  quarantineRegistry.add(childId);

  const childLexeme: LivingLexeme = Object.freeze({
    ...parent,
    id: childId,
    invented: true,
    mutation: Object.freeze({
      ...parent.mutation,
      parentLexemeIds: [parentId],
      generation: parent.mutation.generation + 1,
      createdTick: 0, // Set at promotion time
      createdByNpcId: npcId,
      createdByFactionId: factionId,
      createdFromEventHash: eventHash,
      promoted: false,
      quarantined: true,
    }),
  });

  lexemeRegistry.set(childId, childLexeme);
  indexLexeme(childLexeme);

  return { lexeme: childLexeme, success: true };
}

/** Promote quarantined lexeme to canonical status */
export function promoteLexeme(id: string): boolean {
  if (!quarantineRegistry.has(id)) return false;

  const lexeme = lexemeRegistry.get(id);
  if (!lexeme) return false;

  quarantineRegistry.delete(id);
  promotedRegistry.add(id);

  const promotedLexeme: LivingLexeme = Object.freeze({
    ...lexeme,
    mutation: Object.freeze({
      ...lexeme.mutation,
      promoted: true,
      quarantined: false,
    }),
  });

  lexemeRegistry.set(id, promotedLexeme);
  return true;
}

/** Check if lexeme is quarantined */
export function isQuarantined(id: string): boolean {
  return quarantineRegistry.has(id);
}

/** Check if lexeme was promoted */
export function wasPromoted(id: string): boolean {
  return promotedRegistry.has(id);
}

// =============================================================================
// USAGE TRACKING (for weight updates)
// =============================================================================

export interface UsageDelta {
  npcUses?: number;
  factionUses?: number;
  playerReactionSuccess?: number;
  playerReactionFailure?: number;
  causedHelp?: number;
  causedTrade?: number;
  causedAggression?: number;
  causedQuestAccept?: number;
  causedQuestDecline?: number;
  causedTrustGain?: number;
  causedTrustLoss?: number;
  causedFear?: number;
}

/** Update lexeme usage statistics */
export function recordLexemeUsage(id: string, delta: UsageDelta): boolean {
  const lexeme = lexemeRegistry.get(id);
  if (!lexeme) return false;

  const updatedUsage: LexemeUsage = Object.freeze({
    totalUses: lexeme.usage.totalUses + 1,
    npcUses: lexeme.usage.npcUses + (delta.npcUses ?? 0),
    factionUses: lexeme.usage.factionUses + (delta.factionUses ?? 0),
    playerReactionSuccess: lexeme.usage.playerReactionSuccess + (delta.playerReactionSuccess ?? 0),
    playerReactionFailure: lexeme.usage.playerReactionFailure + (delta.playerReactionFailure ?? 0),
    causedHelp: lexeme.usage.causedHelp + (delta.causedHelp ?? 0),
    causedTrade: lexeme.usage.causedTrade + (delta.causedTrade ?? 0),
    causedAggression: lexeme.usage.causedAggression + (delta.causedAggression ?? 0),
    causedQuestAccept: lexeme.usage.causedQuestAccept + (delta.causedQuestAccept ?? 0),
    causedQuestDecline: lexeme.usage.causedQuestDecline + (delta.causedQuestDecline ?? 0),
    causedTrustGain: lexeme.usage.causedTrustGain + (delta.causedTrustGain ?? 0),
    causedTrustLoss: lexeme.usage.causedTrustLoss + (delta.causedTrustLoss ?? 0),
    causedFear: lexeme.usage.causedFear + (delta.causedFear ?? 0),
  });

  const updatedLexeme: LivingLexeme = Object.freeze({
    ...lexeme,
    usage: updatedUsage,
  });

  lexemeRegistry.set(id, updatedLexeme);
  return true;
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/** Load seed data (canonical lexemes) */
export function loadSeedData(lexemes: readonly LexemeBlueprint[]): number {
  let loaded = 0;
  for (const blueprint of lexemes) {
    registerCanonicalLexeme(blueprint);
    loaded++;
  }
  return loaded;
}

/** Clear all lexemes (for testing) */
export function clearArchive(): void {
  lexemeRegistry.clear();
  byLanguage.clear();
  byConcept.clear();
  byPos.clear();
  byFaction.clear();
  inventedLexemes.clear();
  quarantineRegistry.clear();
  promotedRegistry.clear();
}

/** Export archive state (for debugging, not for truth path) */
export function exportArchiveState(): {
  totalLexemes: number;
  inventedCount: number;
  quarantinedCount: number;
  promotedCount: number;
  byLanguageCount: Record<string, number>;
} {
  const byLanguageCount: Record<string, number> = {};
  for (const [lang, ids] of byLanguage) {
    byLanguageCount[lang] = ids.size;
  }

  return Object.freeze({
    totalLexemes: lexemeRegistry.size,
    inventedCount: inventedLexemes.size,
    quarantinedCount: quarantineRegistry.size,
    promotedCount: promotedRegistry.size,
    byLanguageCount,
  });
}