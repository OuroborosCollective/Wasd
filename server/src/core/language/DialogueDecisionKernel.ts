/**
 * @file server/src/core/language/DialogueDecisionKernel.ts
 * @description DialogueDecisionKernel - Meaning-first NPC intent selection.
 *
 * Decides what an NPC should say from internal state and world context. Static
 * text is only fallback; the decision itself is derived from tick, sequence,
 * NPC state, world state, stable hash, and registered phrase genomes.
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All decisions derive from stable hashes of state components
 */

import { KAPPA } from '../are/Kappa.js';
import { stableHash32 } from '../determinism/AREDeterminism.js';
import type {
  NpcLanguageState,
  SpeechIntent,
  SpeechTruthMode,
  PhraseGenome,
  UtteranceDecision,
  LexemeEmotion,
  KappaInt,
  SpeechSituation,
} from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import { buildSentence, createSentenceSeed } from './ProceduralGrammarEngine.js';
import { getLexemeSuccessRate, getGenomeAverageScore } from './LanguageOutcomeLearner.js';

const KERNEL_TAG = 'DIALOGUE_DECISION_KERNEL_V1';

type LanguageMode = PhraseGenome['languageMode'];

// =============================================================================
// INTENT SELECTION RULES
// =============================================================================

interface IntentRule {
  readonly intent: SpeechIntent;
  readonly trigger: IntentTrigger;
  readonly truthMode: SpeechTruthMode;
  readonly basePriority: number;
  readonly cooldownTicks: number;
}

interface IntentTrigger {
  readonly minHunger?: KappaInt;
  readonly maxHunger?: KappaInt;
  readonly minTrust?: KappaInt;
  readonly maxTrust?: KappaInt;
  readonly minFear?: KappaInt;
  readonly maxFear?: KappaInt;
  readonly minDuty?: KappaInt;
  readonly maxDuty?: KappaInt;
  readonly minPride?: KappaInt;
  readonly maxPride?: KappaInt;
  readonly requiredRole?: readonly string[];
  readonly requiredPendingRequest?: readonly string[];
}

const INTENT_RULES: readonly IntentRule[] = Object.freeze([
  {
    intent: 'warn',
    trigger: { minFear: createKappaInt(0.6) },
    truthMode: 'known_fact',
    basePriority: 90,
    cooldownTicks: 30,
  },
  {
    intent: 'threaten',
    trigger: { minFear: createKappaInt(0.8), minDuty: createKappaInt(0.5) },
    truthMode: 'belief',
    basePriority: 85,
    cooldownTicks: 60,
  },
  {
    intent: 'request',
    trigger: { minHunger: createKappaInt(0.5) },
    truthMode: 'known_fact',
    basePriority: 80,
    cooldownTicks: 50,
  },
  {
    intent: 'trade',
    trigger: { minTrust: createKappaInt(0.4) },
    truthMode: 'known_fact',
    basePriority: 60,
    cooldownTicks: 150,
  },
  {
    intent: 'recruit',
    trigger: { minDuty: createKappaInt(0.7) },
    truthMode: 'known_fact',
    basePriority: 55,
    cooldownTicks: 400,
  },
  {
    intent: 'greet',
    trigger: { minTrust: createKappaInt(0.3), maxTrust: createKappaInt(1) },
    truthMode: 'known_fact',
    basePriority: 50,
    cooldownTicks: 100,
  },
  {
    intent: 'teach',
    trigger: { minTrust: createKappaInt(0.5), requiredRole: ['Elder', 'Master', 'Scholar', 'Guide', 'Village Guide'] },
    truthMode: 'known_fact',
    basePriority: 45,
    cooldownTicks: 300,
  },
  {
    intent: 'thank',
    trigger: { minTrust: createKappaInt(0.7) },
    truthMode: 'known_fact',
    basePriority: 40,
    cooldownTicks: 200,
  },
  {
    intent: 'comfort',
    trigger: { minTrust: createKappaInt(0.6), minDuty: createKappaInt(0.4) },
    truthMode: 'belief',
    basePriority: 35,
    cooldownTicks: 250,
  },
  {
    intent: 'rumor_share',
    trigger: { maxTrust: createKappaInt(0.5), maxFear: createKappaInt(0.4) },
    truthMode: 'rumor',
    basePriority: 30,
    cooldownTicks: 180,
  },
  {
    intent: 'boast',
    trigger: { minPride: createKappaInt(0.7) },
    truthMode: 'belief',
    basePriority: 25,
    cooldownTicks: 350,
  },
  {
    intent: 'farewell',
    trigger: { minTrust: createKappaInt(0.2) },
    truthMode: 'known_fact',
    basePriority: 20,
    cooldownTicks: 100,
  },
]);

// =============================================================================
// PHRASE GENOME REGISTRY
// =============================================================================

interface RegisteredGenome {
  readonly genome: PhraseGenome;
  readonly lastUsedTick: number;
  readonly useCount: number;
}

const genomeRegistry: Map<string, RegisteredGenome> = new Map();

export function registerPhraseGenome(genome: PhraseGenome): void {
  genomeRegistry.set(genome.id, {
    genome,
    lastUsedTick: 0,
    useCount: 0,
  });
}

export function getRegisteredGenome(genomeId: string): PhraseGenome | undefined {
  return genomeRegistry.get(genomeId)?.genome;
}

function createFallbackGenome(intent: SpeechIntent, language: LanguageMode): PhraseGenome {
  return Object.freeze({
    id: `fallback_${intent}_${language}`,
    intent,
    languageMode: language,
    structure: Object.freeze(['subject', 'verb', 'object']),
    slots: Object.freeze([
      Object.freeze({ role: 'subject', required: true, semanticRequirements: [intent] }),
      Object.freeze({ role: 'verb', required: true, semanticRequirements: [intent] }),
      Object.freeze({ role: 'object', required: false, semanticRequirements: [intent] }),
    ]),
    constraints: Object.freeze({}),
    outcomeStats: Object.freeze({
      uses: 0,
      successfulUses: 0,
      failedUses: 0,
      averageKappaScore: createKappaInt(1),
    }),
    mutation: Object.freeze({
      parentGenomeIds: Object.freeze([]),
      generation: 0,
      stability: createKappaInt(1),
      novelty: createKappaInt(0),
    }),
    truthMode: 'known_fact',
  });
}

// =============================================================================
// KERNEL STATE
// =============================================================================

interface KernelState {
  readonly lastIntentTick: number;
  readonly recentSpeechHashes: readonly string[];
  readonly intentHistory: readonly SpeechIntent[];
}

const npcKernelState: Map<string, KernelState> = new Map();

function getOrCreateKernelState(npcId: string): KernelState {
  const existing = npcKernelState.get(npcId);
  if (existing) return existing;

  const created: KernelState = Object.freeze({
    lastIntentTick: Number.NEGATIVE_INFINITY,
    recentSpeechHashes: Object.freeze([]),
    intentHistory: Object.freeze([]),
  });
  npcKernelState.set(npcId, created);
  return created;
}

// =============================================================================
// MAIN DECISION FUNCTION
// =============================================================================

export interface DecisionContext {
  readonly npcState: NpcLanguageState;
  readonly worldState: {
    readonly threatLevel: KappaInt;
    readonly villageSafety: KappaInt;
    readonly factionPressure: KappaInt;
    readonly politicalTension: KappaInt;
  };
  readonly tick: number;
  readonly sequenceId: number;
}

export function decideUtterance(
  context: DecisionContext,
  options?: {
    readonly preferFallback?: boolean;
    readonly forceIntent?: SpeechIntent;
  }
): UtteranceDecision {
  const { npcState, worldState, tick, sequenceId } = context;
  const state = getOrCreateKernelState(npcState.npcId);
  const situation = buildSituation(npcState, worldState);
  const intent = options?.forceIntent ?? selectIntent(npcState, situation, state, tick, sequenceId);
  const rule = INTENT_RULES.find((candidate) => candidate.intent === intent);
  const truthMode = rule?.truthMode ?? 'known_fact';
  const language = getPreferredLanguage(npcState.factionId);

  const genomeId = `${npcState.factionId}_${intent}_${npcState.role}`.toLowerCase();
  const genome = !options?.preferFallback
    ? getRegisteredGenome(genomeId) ?? createFallbackGenome(intent, language)
    : createFallbackGenome(intent, language);

  const seed = createSentenceSeed(npcState.npcId, intent, tick, sequenceId);
  const construction = buildSentence(genome, seed, {
    dialectOverride: language,
    preferFallback: options?.preferFallback,
  });

  if (!construction.success || !construction.text?.trim()) {
    const fallback = buildFallbackUtterance(intent, npcState, truthMode, seed);
    updateKernelState(npcState.npcId, tick, intent, fallback.speechHash);
    return fallback;
  }

  const emotionalTone = computeEmotionalTone(construction.fillers ?? []);
  const confidence = computeConfidence(genome.id, construction.fillers ?? []);
  const speechHash = construction.hash ?? stableHash32(`${KERNEL_TAG}:${npcState.npcId}:${intent}:${seed}`).toString(16);
  updateKernelState(npcState.npcId, tick, intent, speechHash);

  return Object.freeze({
    npcId: npcState.npcId,
    speechHash,
    intent,
    phraseGenomeId: genome.id,
    selectedLexemeIds: (construction.fillers ?? []).map((filler) => filler.lexeme.id),
    constructedText: construction.text,
    truthMode,
    emotionalTone,
    confidence,
    needsFallback: false,
  });
}

function buildSituation(
  npcState: NpcLanguageState,
  worldState: DecisionContext['worldState']
): SpeechSituation {
  return Object.freeze({
    intent: 'greet',
    threatLevel: worldState.threatLevel,
    trust: npcState.currentTrust,
    fear: npcState.currentFear,
    hunger: npcState.currentHunger,
    factionPressure: worldState.factionPressure,
    politicalTension: worldState.politicalTension,
  });
}

function selectIntent(
  npcState: NpcLanguageState,
  situation: SpeechSituation,
  state: KernelState,
  tick: number,
  sequenceId: number
): SpeechIntent {
  const applicable = INTENT_RULES.filter((rule) => {
    if (Number.isFinite(state.lastIntentTick) && tick - state.lastIntentTick < rule.cooldownTicks) return false;
    if (rule.trigger.requiredRole && !roleMatches(npcState.role, rule.trigger.requiredRole)) return false;
    if (rule.trigger.requiredPendingRequest) {
      if (!npcState.pendingRequest) return false;
      if (!rule.trigger.requiredPendingRequest.includes(npcState.pendingRequest.type)) return false;
    }

    return checkThreshold(npcState.currentHunger, rule.trigger.minHunger, rule.trigger.maxHunger) &&
      checkThreshold(npcState.currentTrust, rule.trigger.minTrust, rule.trigger.maxTrust) &&
      checkThreshold(npcState.currentFear, rule.trigger.minFear, rule.trigger.maxFear) &&
      checkThreshold(npcState.currentDuty, rule.trigger.minDuty, rule.trigger.maxDuty) &&
      checkThreshold(npcState.currentPride, rule.trigger.minPride, rule.trigger.maxPride);
  });

  if (applicable.length === 0) return 'greet';

  const scored = applicable
    .map((rule) => ({ rule, score: computeIntentScore(rule, npcState, situation, tick) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.rule.intent.localeCompare(b.rule.intent);
    });

  const seed = stableHash32(`${npcState.npcId}:${tick}:${sequenceId}:${state.intentHistory.join(',')}`);
  const pickable = Math.min(scored.length, 3);
  return scored[seed % pickable].rule.intent;
}

function roleMatches(role: string, allowed: readonly string[]): boolean {
  const normalized = role.toLowerCase();
  return allowed.some((candidate) => normalized.includes(candidate.toLowerCase()));
}

function checkThreshold(value: KappaInt, min?: KappaInt, max?: KappaInt): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

function computeIntentScore(
  rule: IntentRule,
  npcState: NpcLanguageState,
  situation: SpeechSituation,
  tick: number
): number {
  let score = rule.basePriority;

  if (rule.intent === 'request' && npcState.currentHunger > createKappaInt(0.7)) score += 30;
  if ((rule.intent === 'warn' || rule.intent === 'threaten') && npcState.currentFear > createKappaInt(0.6)) score += 25;
  if (rule.intent === 'teach' && npcState.currentTrust > createKappaInt(0.6)) score += 15;
  if (rule.intent === 'warn' && situation.threatLevel > createKappaInt(0.6)) score += 20;
  if (rule.intent === 'recruit' && situation.factionPressure > createKappaInt(0.6)) score += 10;

  const variation = stableHash32(`${rule.intent}:${tick}:${npcState.npcId}`) % 21;
  score += variation - 10;
  return score;
}

function getPreferredLanguage(factionId: string): LanguageMode {
  switch (factionId.toLowerCase()) {
    case 'shadow_register':
      return 'guild';
    case 'sun_order':
      return 'mythic';
    case 'merchant_league':
      return 'en';
    default:
      return 'de';
  }
}

function computeEmotionalTone(fillers: readonly { readonly lexeme: { readonly semantics: { readonly emotion: LexemeEmotion } } }[]): LexemeEmotion {
  if (fillers.length === 0) return neutralEmotion();

  let fear = 0;
  let anger = 0;
  let joy = 0;
  let trust = 0;
  let shame = 0;
  let pride = 0;
  let hunger = 0;
  let duty = 0;
  let revenge = 0;

  for (const filler of fillers) {
    const emotion = filler.lexeme.semantics.emotion;
    fear += Number(emotion.fear);
    anger += Number(emotion.anger);
    joy += Number(emotion.joy);
    trust += Number(emotion.trust);
    shame += Number(emotion.shame);
    pride += Number(emotion.pride);
    hunger += Number(emotion.hunger);
    duty += Number(emotion.duty);
    revenge += Number(emotion.revenge);
  }

  const count = fillers.length;
  return Object.freeze({
    fear: Math.floor(fear / count) as KappaInt,
    anger: Math.floor(anger / count) as KappaInt,
    joy: Math.floor(joy / count) as KappaInt,
    trust: Math.floor(trust / count) as KappaInt,
    shame: Math.floor(shame / count) as KappaInt,
    pride: Math.floor(pride / count) as KappaInt,
    hunger: Math.floor(hunger / count) as KappaInt,
    duty: Math.floor(duty / count) as KappaInt,
    revenge: Math.floor(revenge / count) as KappaInt,
  });
}

function neutralEmotion(): LexemeEmotion {
  return Object.freeze({
    fear: createKappaInt(0),
    anger: createKappaInt(0),
    joy: createKappaInt(0),
    trust: createKappaInt(0.5),
    shame: createKappaInt(0),
    pride: createKappaInt(0),
    hunger: createKappaInt(0),
    duty: createKappaInt(0),
    revenge: createKappaInt(0),
  });
}

function computeConfidence(genomeId: string, fillers: readonly { readonly lexeme: { readonly id: string } }[]): KappaInt {
  const avgScore = Number(getGenomeAverageScore(genomeId)) / KAPPA;
  const lexemeConfidence = fillers.length > 0
    ? fillers.reduce((sum, filler) => sum + getLexemeSuccessRate(filler.lexeme.id), 0) / fillers.length
    : 0.5;
  return createKappaInt((avgScore + lexemeConfidence) / 2);
}

function updateKernelState(npcId: string, tick: number, intent: SpeechIntent, speechHash: string): void {
  const state = getOrCreateKernelState(npcId);
  npcKernelState.set(npcId, Object.freeze({
    lastIntentTick: tick,
    recentSpeechHashes: Object.freeze([...state.recentSpeechHashes, speechHash].slice(-5)),
    intentHistory: Object.freeze([...state.intentHistory, intent].slice(-10)),
  }));
}

function buildFallbackUtterance(
  intent: SpeechIntent,
  npcState: NpcLanguageState,
  truthMode: SpeechTruthMode,
  seed: number
): UtteranceDecision {
  const fallbackTexts: Record<SpeechIntent, readonly string[]> = {
    greet: ['Greetings.', 'Well met.', 'Hello, traveler.'],
    farewell: ['Farewell.', 'Until next time.', 'Go safely.'],
    warn: ['Beware.', 'Danger approaches.', 'Stay alert.'],
    request: ['I need help.', 'Can you assist me?', 'I require aid.'],
    thank: ['Thank you.', 'I am grateful.', 'My thanks.'],
    threaten: ['You have been warned.', 'This is your final chance.', 'Do not test me.'],
    trade: ['I have goods to offer.', 'Perhaps we can trade.', 'I have something you need.'],
    teach: ['Listen and learn.', 'I shall share my knowledge.', 'Pay attention.'],
    pray: ['May the gods guide us.', 'Blessings upon you.', 'We pray for guidance.'],
    recruit: ['Join our cause.', 'We need capable hands.', 'Will you fight with us?'],
    betray: ['You fool.', 'This was inevitable.', 'You should not have trusted me.'],
    rumor_share: ['I have heard things.', 'Word on the road is strange.', 'They say much and prove little.'],
    accuse: ['You are to blame.', 'This is your doing.', 'I know it was you.'],
    comfort: ['It will be alright.', 'Do not despair.', 'We shall endure.'],
    boast: ['I know my worth.', 'Few can match me.', 'My deeds speak clearly.'],
    apologize: ['Forgive me.', 'I am sorry.', 'This was a mistake.'],
    brag: ['My accomplishments are many.', 'I have done great deeds.', 'I stand by my record.'],
    mock: ['Ha. Pathetic.', 'You call that effort?', 'How disappointing.'],
  };

  const texts = fallbackTexts[intent] ?? ['...'];
  const index = stableHash32(seed.toString()) % texts.length;
  const speechHash = stableHash32(`${KERNEL_TAG}:${npcState.npcId}:${intent}:${seed}`).toString(16);

  return Object.freeze({
    npcId: npcState.npcId,
    speechHash,
    intent,
    phraseGenomeId: `fallback_${intent}`,
    selectedLexemeIds: Object.freeze([]),
    constructedText: texts[index],
    truthMode,
    emotionalTone: neutralEmotion(),
    confidence: createKappaInt(0.3),
    needsFallback: true,
  });
}

// =============================================================================
// UTILITY
// =============================================================================

export function clearKernelState(npcId: string): void {
  npcKernelState.delete(npcId);
}

export function clearAllKernelState(): void {
  npcKernelState.clear();
}

export function getKernelState(npcId: string): KernelState | undefined {
  return npcKernelState.get(npcId);
}
