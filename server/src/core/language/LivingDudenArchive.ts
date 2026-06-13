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
const LANGUAGE_CODES = new Set<LanguageCode>(['de', 'en', 'arel', 'guild', 'mythic', 'mixed']);

const lexemeRegistry: Map<string, LivingLexeme> = new Map();
const byLanguage: Map<LanguageCode, Set<string>> = new Map();
const byConcept: Map<string, Set<string>> = new Map();
const byPos: Map<PartOfSpeech, Set<string>> = new Map();
const byFaction: Map<string, Set<string>> = new Map();
const inventedLexemes: Set<string> = new Set();
const quarantineRegistry: Set<string> = new Set();
const promotedRegistry: Set<string> = new Set();

type KappaSource = number | KappaInt;
type EmotionBlueprint = Partial<Record<keyof LexemeEmotion, KappaSource>>;

export interface LexemeBlueprint {
  id: string;
  lemma: string;
  language: LanguageCode | string;
  invented?: boolean;
  morphemes?: readonly string[];
  concepts?: readonly string[];
  emotion?: EmotionBlueprint;
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

export interface MutationResult { lexeme: LivingLexeme; success: boolean; reason?: string }

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

function normalizeLanguage(language: LanguageCode | string): LanguageCode {
  return LANGUAGE_CODES.has(language as LanguageCode) ? (language as LanguageCode) : 'mixed';
}

function contentHashInput(lexeme: Omit<LivingLexeme, 'integrity'>): string {
  return [
    DUDEN_TAG,
    lexeme.id,
    lexeme.lemma,
    lexeme.language,
    String(lexeme.invented),
    lexeme.morphemes.join('|'),
    [...lexeme.semantics.concepts].sort().join('|'),
    lexeme.grammar.partOfSpeech,
    String(lexeme.weighting.baseWeight),
  ].join('::');
}

function computeContentHash(lexeme: Omit<LivingLexeme, 'integrity'>): string {
  return stableHash32(contentHashInput(lexeme)).toString(16).padStart(8, '0');
}

function makeEmotion(input?: EmotionBlueprint): LexemeEmotion {
  return Object.freeze({
    fear: createKappaInt(input?.fear ?? 0),
    anger: createKappaInt(input?.anger ?? 0),
    joy: createKappaInt(input?.joy ?? 0),
    trust: createKappaInt(input?.trust ?? 0),
    shame: createKappaInt(input?.shame ?? 0),
    pride: createKappaInt(input?.pride ?? 0),
    hunger: createKappaInt(input?.hunger ?? 0),
    duty: createKappaInt(input?.duty ?? 0),
    revenge: createKappaInt(input?.revenge ?? 0),
  });
}

function makeSocial(register: SocialRegister, overrides?: Partial<LexemeSocial>): LexemeSocial {
  return Object.freeze({
    register,
    formal: createKappaInt(register === 'formal' ? 1 : 0),
    rude: createKappaInt(register === 'rude' ? 1 : 0),
    intimate: createKappaInt(register === 'intimate' ? 1 : 0),
    noble: createKappaInt(register === 'noble' ? 1 : 0),
    peasant: createKappaInt(register === 'peasant' ? 1 : 0),
    guild: createKappaInt(register === 'guild' ? 1 : 0),
    religious: createKappaInt(register === 'religious' ? 1 : 0),
    military: createKappaInt(register === 'military' ? 1 : 0),
    criminal: createKappaInt(register === 'criminal' ? 1 : 0),
    ...overrides,
  });
}

function zeroUsage(): LexemeUsage {
  return Object.freeze({
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
  });
}

function indexLexeme(lexeme: LivingLexeme): void {
  if (!byLanguage.has(lexeme.language)) byLanguage.set(lexeme.language, new Set());
  byLanguage.get(lexeme.language)!.add(lexeme.id);
  for (const concept of lexeme.semantics.concepts) {
    if (!byConcept.has(concept)) byConcept.set(concept, new Set());
    byConcept.get(concept)!.add(lexeme.id);
  }
  if (!byPos.has(lexeme.grammar.partOfSpeech)) byPos.set(lexeme.grammar.partOfSpeech, new Set());
  byPos.get(lexeme.grammar.partOfSpeech)!.add(lexeme.id);
  for (const factionId of lexeme.semantics.worldBindings.factionIds ?? []) {
    if (!byFaction.has(factionId)) byFaction.set(factionId, new Set());
    byFaction.get(factionId)!.add(lexeme.id);
  }
  if (lexeme.invented) inventedLexemes.add(lexeme.id);
}

export function registerCanonicalLexeme(blueprint: LexemeBlueprint): LivingLexeme {
  if (lexemeRegistry.has(blueprint.id)) return lexemeRegistry.get(blueprint.id)!;
  const language = normalizeLanguage(blueprint.language);
  const grammar: LexemeGrammar = Object.freeze({
    partOfSpeech: blueprint.grammar?.partOfSpeech ?? 'noun',
    gender: blueprint.grammar?.gender ?? 'none',
    plural: blueprint.grammar?.plural,
    conjugationClass: blueprint.grammar?.conjugationClass,
    allowedPositions: Object.freeze([...(blueprint.grammar?.allowedPositions ?? ['subject'])]),
  });
  const weighting: LexemeWeighting = Object.freeze({
    baseWeight: createKappaInt(blueprint.baseWeight ?? 1),
    contextWeight: createKappaInt(1),
    successWeight: createKappaInt(1),
    riskPenalty: createKappaInt(0),
    decayPerDayKappa: createKappaInt(0.001),
  });
  const mutation: LexemeMutation = Object.freeze({
    parentLexemeIds: Object.freeze([]),
    generation: 0,
    createdTick: 0,
    createdByNpcId: undefined,
    createdByFactionId: undefined,
    createdFromEventHash: '',
    promoted: false,
    quarantined: false,
  });
  const partial: Omit<LivingLexeme, 'integrity'> = Object.freeze({
    id: blueprint.id,
    lemma: blueprint.lemma,
    language,
    invented: blueprint.invented ?? false,
    morphemes: Object.freeze([...(blueprint.morphemes ?? [blueprint.lemma.toLowerCase()])]),
    semantics: Object.freeze({
      concepts: Object.freeze([...(blueprint.concepts ?? [])]),
      emotion: makeEmotion(blueprint.emotion),
      social: makeSocial(blueprint.social?.register ?? 'formal', blueprint.social?.overrides),
      worldBindings: Object.freeze(blueprint.worldBindings ?? {}),
    }),
    grammar,
    usage: zeroUsage(),
    weighting,
    mutation,
  });
  const lexeme: LivingLexeme = Object.freeze({
    ...partial,
    integrity: Object.freeze({ kappa: KAPPA, schemaVersion: SCHEMA_VERSION, contentHash: computeContentHash(partial) }),
  });
  lexemeRegistry.set(lexeme.id, lexeme);
  indexLexeme(lexeme);
  return lexeme;
}

export function getLexeme(id: string): LivingLexeme | undefined { return lexemeRegistry.get(id); }
export function getAllLexemes(): readonly LivingLexeme[] { return Array.from(lexemeRegistry.values()); }

function idsToLexemes(ids?: Set<string>): readonly LivingLexeme[] {
  if (!ids) return [];
  return Array.from(ids, (id) => lexemeRegistry.get(id)).filter((lexeme): lexeme is LivingLexeme => Boolean(lexeme));
}

export function getLexemesByLanguage(language: LanguageCode | string): readonly LivingLexeme[] { return idsToLexemes(byLanguage.get(normalizeLanguage(language))); }
export function getLexemesByConcept(concept: string): readonly LivingLexeme[] { return idsToLexemes(byConcept.get(concept)); }
export function getLexemesByPos(pos: PartOfSpeech): readonly LivingLexeme[] { return idsToLexemes(byPos.get(pos)); }
export function getLexemesByFaction(factionId: string): readonly LivingLexeme[] { return idsToLexemes(byFaction.get(factionId)); }
export function getInventedLexemes(): readonly LivingLexeme[] { return idsToLexemes(inventedLexemes); }
export function getLexemeCount(): number { return lexemeRegistry.size; }

export function findLexemeForSlot(requirements: { concepts?: readonly string[]; language?: LanguageCode; partOfSpeech?: PartOfSpeech; position?: SentencePosition; register?: SocialRegister; minWeight?: KappaInt }, seed: number): LivingLexeme | undefined {
  let candidates = Array.from(lexemeRegistry.values());
  if (requirements.language) candidates = candidates.filter((lexeme) => lexeme.language === requirements.language);
  if (requirements.partOfSpeech) candidates = candidates.filter((lexeme) => lexeme.grammar.partOfSpeech === requirements.partOfSpeech);
  if (requirements.position) candidates = candidates.filter((lexeme) => lexeme.grammar.allowedPositions.includes(requirements.position!));
  if (requirements.register) candidates = candidates.filter((lexeme) => lexeme.semantics.social.register === requirements.register);
  if (requirements.concepts?.length) candidates = candidates.filter((lexeme) => requirements.concepts!.some((concept) => lexeme.semantics.concepts.includes(concept)));
  if (requirements.minWeight !== undefined) candidates = candidates.filter((lexeme) => lexeme.weighting.baseWeight >= requirements.minWeight!);
  if (candidates.length === 0) return undefined;
  const score = (lexeme: LivingLexeme): number => Number(lexeme.weighting.baseWeight) + Number(lexeme.weighting.contextWeight) + Number(lexeme.weighting.successWeight);
  candidates.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  return candidates[stableHash32(seed.toString()) % candidates.length];
}

export function createMutatedLexeme(parentId: string, mutationSeed: string, npcId?: string, factionId?: string): MutationResult {
  const parent = lexemeRegistry.get(parentId);
  if (!parent) return { lexeme: parent as never, success: false, reason: 'Parent not found' };
  const eventHash = stableHash32(mutationSeed).toString(16);
  const childId = `${parentId}_mut_${eventHash.slice(0, 8)}`;
  if (lexemeRegistry.has(childId)) return { lexeme: lexemeRegistry.get(childId)!, success: true };
  quarantineRegistry.add(childId);
  const partial: Omit<LivingLexeme, 'integrity'> = Object.freeze({
    ...parent,
    id: childId,
    invented: true,
    mutation: Object.freeze({
      ...parent.mutation,
      parentLexemeIds: Object.freeze([parentId]),
      generation: parent.mutation.generation + 1,
      createdTick: 0,
      createdByNpcId: npcId,
      createdByFactionId: factionId,
      createdFromEventHash: eventHash,
      promoted: false,
      quarantined: true,
    }),
  });
  const child: LivingLexeme = Object.freeze({ ...partial, integrity: Object.freeze({ kappa: KAPPA, schemaVersion: SCHEMA_VERSION, contentHash: computeContentHash(partial) }) });
  lexemeRegistry.set(childId, child);
  indexLexeme(child);
  return { lexeme: child, success: true };
}

export function promoteLexeme(id: string): boolean {
  if (!quarantineRegistry.has(id)) return false;
  const lexeme = lexemeRegistry.get(id);
  if (!lexeme) return false;
  quarantineRegistry.delete(id);
  promotedRegistry.add(id);
  const updated: LivingLexeme = Object.freeze({ ...lexeme, mutation: Object.freeze({ ...lexeme.mutation, promoted: true, quarantined: false }) });
  lexemeRegistry.set(id, updated);
  return true;
}

export function isQuarantined(id: string): boolean { return quarantineRegistry.has(id); }
export function wasPromoted(id: string): boolean { return promotedRegistry.has(id); }

export function recordLexemeUsage(id: string, delta: UsageDelta): boolean {
  const lexeme = lexemeRegistry.get(id);
  if (!lexeme) return false;
  const usage: LexemeUsage = Object.freeze({
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
  lexemeRegistry.set(id, Object.freeze({ ...lexeme, usage }));
  return true;
}

export function loadSeedData(lexemes: readonly LexemeBlueprint[]): number {
  let loaded = 0;
  for (const blueprint of lexemes) { registerCanonicalLexeme(blueprint); loaded++; }
  return loaded;
}

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

export function exportArchiveState(): { totalLexemes: number; inventedCount: number; quarantinedCount: number; promotedCount: number; byLanguageCount: Record<string, number> } {
  const byLanguageCount: Record<string, number> = {};
  for (const [lang, ids] of byLanguage) byLanguageCount[lang] = ids.size;
  return Object.freeze({ totalLexemes: lexemeRegistry.size, inventedCount: inventedLexemes.size, quarantinedCount: quarantineRegistry.size, promotedCount: promotedRegistry.size, byLanguageCount });
}
