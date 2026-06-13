/**
 * @file server/src/core/language/LanguageTypes.ts
 * @description Core types for the Living Language System.
 * All NPC speech derives meaning from world state, not hardcoded text.
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All decisions derive from: tick, sequenceId, chunk identity, actorId,
 *   canonical input events, KAPPA_INVARIANT=1000, stable hashing, persisted ARE memory
 * - Wall-clock time only in explicitly marked side-channel telemetry
 */

import { KAPPA } from '../are/Kappa.js';
import type { KappaInt, TickId, NpcId, PlayerId } from '../are/types.js';

// =============================================================================
// LANGUAGE IDENTITIES
// =============================================================================

export type LanguageCode = 'de' | 'en' | 'arel' | 'guild' | 'mythic' | 'mixed';
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' |
  'preposition' | 'conjunction' | 'interjection' | 'article' | 'determiner';
export type Gender = 'masculine' | 'feminine' | 'neutral' | 'none';
export type SocialRegister = 'formal' | 'rude' | 'intimate' | 'noble' | 'peasant' |
  'guild' | 'religious' | 'military' | 'criminal';
export type SentencePosition = 'subject' | 'verb' | 'object' | 'modifier' |
  'address' | 'closing' | 'emotion_marker';

/** Speech truth modes - separates rumor/fact/belief in truth path */
export type SpeechTruthMode =
  | 'known_fact'
  | 'personal_memory'
  | 'rumor'
  | 'belief'
  | 'lie'
  | 'threat'
  | 'myth'
  | 'prophecy'
  | 'joke'
  | 'ritual';

/** NPC utterance intents */
export type SpeechIntent =
  | 'greet'
  | 'farewell'
  | 'warn'
  | 'request'
  | 'thank'
  | 'accuse'
  | 'trade'
  | 'teach'
  | 'pray'
  | 'recruit'
  | 'betray'
  | 'rumor_share'
  | 'threaten'
  | 'comfort'
  | 'boast'
  | 'apologize'
  | 'brag'
  | 'mock';

/** Consequence types that affect lexeme weights */
export type SpeechConsequence =
  | 'caused_help'
  | 'caused_trade'
  | 'caused_aggression'
  | 'caused_quest_accept'
  | 'caused_quest_decline'
  | 'caused_trust_gain'
  | 'caused_trust_loss'
  | 'caused_fear'
  | 'caused_friendship'
  | 'caused_information'
  | 'caused_rumor_spread'
  | 'no_consequence';

// =============================================================================
// LIVING LEXEME - Word as meaning organism
// =============================================================================

export interface LexemeEmotion {
  readonly fear: KappaInt;
  readonly anger: KappaInt;
  readonly joy: KappaInt;
  readonly trust: KappaInt;
  readonly shame: KappaInt;
  readonly pride: KappaInt;
  readonly hunger: KappaInt;
  readonly duty: KappaInt;
  readonly revenge: KappaInt;
}

export interface LexemeSocial {
  readonly register: SocialRegister;
  readonly formal: KappaInt;
  readonly rude: KappaInt;
  readonly intimate: KappaInt;
  readonly noble: KappaInt;
  readonly peasant: KappaInt;
  readonly guild: KappaInt;
  readonly religious: KappaInt;
  readonly military: KappaInt;
  readonly criminal: KappaInt;
}

export interface LexemeWorldBindings {
  readonly factionIds?: readonly string[];
  readonly kingdomIds?: readonly string[];
  readonly guildIds?: readonly string[];
  readonly mythIds?: readonly string[];
  readonly questTypes?: readonly string[];
  readonly threatTypes?: readonly string[];
  readonly locationTypes?: readonly string[];
}

export interface LexemeGrammar {
  readonly partOfSpeech: PartOfSpeech;
  readonly gender?: Gender;
  readonly plural?: string;
  readonly conjugationClass?: string;
  readonly allowedPositions: readonly SentencePosition[];
  readonly verbPerson?: 'first' | 'second' | 'third';
  readonly verbTense?: 'present' | 'past' | 'future' | 'conditional';
}

export interface LexemeUsage {
  readonly totalUses: number;
  readonly npcUses: number;
  readonly factionUses: number;
  readonly playerReactionSuccess: number;
  readonly playerReactionFailure: number;
  readonly causedHelp: number;
  readonly causedTrade: number;
  readonly causedAggression: number;
  readonly causedQuestAccept: number;
  readonly causedQuestDecline: number;
  readonly causedTrustGain: number;
  readonly causedTrustLoss: number;
  readonly causedFear: number;
}

export interface LexemeWeighting {
  readonly baseWeight: KappaInt;
  readonly contextWeight: KappaInt;
  readonly successWeight: KappaInt;
  readonly riskPenalty: KappaInt;
  readonly decayPerDayKappa: KappaInt;
}

export interface LexemeMutation {
  readonly parentLexemeIds: readonly string[];
  readonly generation: number;
  readonly createdTick: number;
  readonly createdByNpcId?: string;
  readonly createdByFactionId?: string;
  readonly createdFromEventHash: string;
  readonly promoted: boolean;
  readonly quarantined: boolean;
}

export interface LexemeIntegrity {
  readonly kappa: typeof KAPPA;
  readonly schemaVersion: number;
  readonly contentHash: string;
}

/** Living Lexeme - Word as causal meaning organism */
export interface LivingLexeme {
  readonly id: string;
  readonly lemma: string;
  readonly language: LanguageCode;
  readonly invented: boolean;
  readonly morphemes: readonly string[];
  readonly semantics: {
    readonly concepts: readonly string[];
    readonly emotion: LexemeEmotion;
    readonly social: LexemeSocial;
    readonly worldBindings: LexemeWorldBindings;
  };
  readonly grammar: LexemeGrammar;
  readonly usage: LexemeUsage;
  readonly weighting: LexemeWeighting;
  readonly mutation: LexemeMutation;
  readonly integrity: LexemeIntegrity;
}

// =============================================================================
// PHRASE GENOME - Sentence as DNA
// =============================================================================

export interface PhraseSlot {
  readonly role: 'address' | 'subject' | 'verb' | 'object' | 'reason' |
    'place' | 'faction' | 'myth' | 'emotionalMarker' | 'closing' | 'memory_reference';
  readonly required: boolean;
  readonly lexemeIds?: readonly string[];
  readonly semanticRequirements?: readonly string[];
}

export interface PhraseConstraints {
  readonly minTrust?: KappaInt;
  readonly maxTrust?: KappaInt;
  readonly minFear?: KappaInt;
  readonly maxFear?: KappaInt;
  readonly minHunger?: KappaInt;
  readonly maxHunger?: KappaInt;
  readonly requiredFaction?: string;
  readonly requiredRole?: string;
  readonly requiredTruthMode?: SpeechTruthMode;
}

export interface PhraseOutcomeStats {
  readonly uses: number;
  readonly successfulUses: number;
  readonly failedUses: number;
  readonly averageKappaScore: KappaInt;
}

export interface PhraseMutation {
  readonly parentGenomeIds: readonly string[];
  readonly generation: number;
  readonly stability: KappaInt;
  readonly novelty: KappaInt;
}

/** PhraseGenome - Sentence template as DNA */
export interface PhraseGenome {
  readonly id: string;
  readonly intent: SpeechIntent;
  readonly languageMode: LanguageCode;
  readonly structure: readonly string[];
  readonly slots: readonly PhraseSlot[];
  readonly constraints: PhraseConstraints;
  readonly outcomeStats: PhraseOutcomeStats;
  readonly mutation: PhraseMutation;
  readonly truthMode: SpeechTruthMode;
}

// =============================================================================
// NPC IDIOLECT & FACTION DIALECT
// =============================================================================

export interface DialectVariant {
  readonly lexemeId: string;
  readonly variant: string;
  readonly register: SocialRegister;
  readonly weight: KappaInt;
}

export interface NpcIdiolect {
  readonly npcId: string;
  readonly preferredLanguage: LanguageCode;
  readonly speechPatterns: readonly string[];
  readonly learnedLexemeIds: readonly string[];
  readonly avoidedLexemeIds: readonly string[];
  readonly personalAssociations: Readonly<Record<string, string>>;
  readonly trustThresholds: {
    readonly whisperSecrets: KappaInt;
    readonly shareRumors: KappaInt;
    readonly requestHelp: KappaInt;
    readonly acceptQuests: KappaInt;
  };
}

export interface FactionDialect {
  readonly factionId: string;
  readonly baseLanguage: LanguageCode;
  readonly signatureMorphemes: readonly string[];
  readonly registerPreference: SocialRegister;
  readonly tabooWords: readonly string[];
  readonly honorifics: readonly string[];
  readonly curseWords: readonly string[];
  readonly ritualPhrases: readonly string[];
  readonly dialectVariants: readonly DialectVariant[];
}

// =============================================================================
// SPEECH OUTCOME - Learning without raw text storage
// =============================================================================

export interface SpeechSituation {
  readonly intent: SpeechIntent;
  readonly threatLevel: KappaInt;
  readonly trust: KappaInt;
  readonly fear: KappaInt;
  readonly hunger: KappaInt;
  readonly factionPressure: KappaInt;
  readonly politicalTension: KappaInt;
}

export interface PlayerReaction {
  readonly acceptedQuest: boolean;
  readonly declinedQuest: boolean;
  readonly attackedNpc: boolean;
  readonly traded: boolean;
  readonly helped: boolean;
  readonly lied: boolean;
  readonly leftConversation: boolean;
  readonly showedRespect: boolean;
  readonly showedDisrespect: boolean;
}

export interface WorldResult {
  readonly npcNeedImproved: boolean;
  readonly factionRelationChanged: boolean;
  readonly villageSafetyChanged: boolean;
  readonly questCompleted: boolean;
  readonly memoryCreated: boolean;
  readonly reputationChanged: KappaInt;
}

export interface SpeechScore {
  readonly survivalGain: KappaInt;
  readonly trustGain: KappaInt;
  readonly dutyGain: KappaInt;
  readonly socialGain: KappaInt;
  readonly riskCost: KappaInt;
  readonly finalKappa: KappaInt;
}

/** Speech outcome event - learns without storing raw text */
export interface SpeechOutcomeEvent {
  readonly eventId: string;
  readonly tick: number;
  readonly npcId: string;
  readonly playerId: string;
  readonly speechHash: string;
  readonly phraseGenomeId: string;
  readonly usedLexemeIds: readonly string[];
  readonly situation: SpeechSituation;
  readonly playerReaction: PlayerReaction;
  readonly worldResult: WorldResult;
  readonly score: SpeechScore;
  readonly truthMode: SpeechTruthMode;
}

// =============================================================================
// NPC BRAIN STATE (for language decisions)
// =============================================================================

export interface NpcLanguageState {
  readonly npcId: NpcId;
  readonly factionId: string;
  readonly role: string;
  readonly currentHunger: KappaInt;
  readonly currentTrust: KappaInt;
  readonly currentFear: KappaInt;
  readonly currentDuty: KappaInt;
  readonly currentPride: KappaInt;
  readonly currentRevenge: KappaInt;
  readonly pendingRequest?: {
    readonly type: 'food' | 'help' | 'trade' | 'quest' | 'information';
    readonly urgency: KappaInt;
  };
  readonly recentSpeechHashes: readonly string[];
  readonly lastConversationTick: number;
}

// =============================================================================
// DECISION OUTPUT
// =============================================================================

export interface UtteranceDecision {
  readonly speechHash: string;
  readonly intent: SpeechIntent;
  readonly phraseGenomeId: string;
  readonly selectedLexemeIds: readonly string[];
  readonly constructedText: string;
  readonly truthMode: SpeechTruthMode;
  readonly emotionalTone: LexemeEmotion;
  readonly confidence: KappaInt;
  readonly needsFallback: boolean;
}

// =============================================================================
// FACTORY FUNCTIONS (deterministic creation)
// =============================================================================

export function createKappaInt(value: number): KappaInt {
  return Math.round(value * KAPPA) as KappaInt;
}

export function createEmotion(
  fear = 0,
  anger = 0,
  joy = 0,
  trust = 0,
  shame = 0,
  pride = 0,
  hunger = 0,
  duty = 0,
  revenge = 0
): LexemeEmotion {
  return Object.freeze({
    fear: createKappaInt(fear),
    anger: createKappaInt(anger),
    joy: createKappaInt(joy),
    trust: createKappaInt(trust),
    shame: createKappaInt(shame),
    pride: createKappaInt(pride),
    hunger: createKappaInt(hunger),
    duty: createKappaInt(duty),
    revenge: createKappaInt(revenge),
  });
}

export function createSocial(
  register: SocialRegister,
  overrides?: Partial<LexemeSocial>
): LexemeSocial {
  const base: LexemeSocial = {
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
  };
  return Object.freeze({ ...base, ...overrides });
}

export function createLexemeIntegrity(contentHash: string): LexemeIntegrity {
  return Object.freeze({
    kappa: KAPPA,
    schemaVersion: 1,
    contentHash,
  });
}