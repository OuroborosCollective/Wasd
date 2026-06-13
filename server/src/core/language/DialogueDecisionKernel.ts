/**
 * @file server/src/core/language/DialogueDecisionKernel.ts
 * @description DialogueDecisionKernel - Meaning-first NPC intent selection.
 *
 * Decides what an NPC should say based on internal state (hunger, trust, fear, duty)
 * and world context, NOT on text matching. Selects intent, selects phrase genome,
 * and triggers grammar construction.
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
  PlayerReaction,
  WorldResult,
  SpeechScore,
} from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import {
  getLexeme,
  getLexemesByConcept,
  findLexemeForSlot,
  type LexemeBlueprint,
} from './LivingDudenArchive.js';
import {
  buildSentence,
  createSentenceSeed,
  type ConstructionResult,
} from './ProceduralGrammarEngine.js';
import {
  getLexemeSuccessRate,
  getGenomeAverageScore,
} from './LanguageOutcomeLearner.js';

const KERNEL_TAG = 'DIALOGUE_DECISION_KERNEL_V1';

// =============================================================================
// INTENT SELECTION RULES
// =============================================================================

interface IntentRule {
  intent: SpeechIntent;
  trigger: IntentTrigger;
  truthMode: SpeechTruthMode;
  basePriority: number;
  cooldownTicks: number;
}

interface IntentTrigger {
  minHunger?: KappaInt;
  maxHunger?: KappaInt;
  minTrust?: KappaInt;
  maxTrust?: KappaInt;
  minFear?: KappaInt;
  maxFear?: KappaInt;
  minDuty?: KappaInt;
  maxDuty?: KappaInt;
  minPride?: KappaInt;
  maxPride?: KappaInt;
  requiredRole?: readonly string[];
  requiredPendingRequest?: readonly string[];
}

/** All intent rules */
const INTENT_RULES: readonly IntentRule[] = Object.freeze([
  // Greeting - when trust is reasonable and no urgent needs
  {
    intent: 'greet',
    trigger: {
      minTrust: createKappaInt(0.3),
      maxTrust: createKappaInt(1.0),
    },
    truthMode: 'known_fact',
    basePriority: 50,
    cooldownTicks: 100,
  },

  // Request - when hungry or has pending request
  {
    intent: 'request',
    trigger: {
      minHunger: createKappaInt(0.5),
    },
    truthMode: 'known_fact',
    basePriority: 80,
    cooldownTicks: 50,
  },

  // Warn - when fear is high or danger present
  {
    intent: 'warn',
    trigger: {
      minFear: createKappaInt(0.6),
    },
    truthMode: 'known_fact',
    basePriority: 90,
    cooldownTicks: 30,
  },

  // Threaten - when fear is very high and NPC is cornered
  {
    intent: 'threaten',
    trigger: {
      minFear: createKappaInt(0.8),
      minDuty: createKappaInt(0.5),
    },
    truthMode: 'belief',
    basePriority: 85,
    cooldownTicks: 60,
  },

  // Thank - when trust is high
  {
    intent: 'thank',
    trigger: {
      minTrust: createKappaInt(0.7),
    },
    truthMode: 'known_fact',
    basePriority: 40,
    cooldownTicks: 200,
  },

  // Trade - when NPC has goods and trust is medium+
  {
    intent: 'trade',
    trigger: {
      minTrust: createKappaInt(0.4),
    },
    truthMode: 'known_fact',
    basePriority: 60,
    cooldownTicks: 150,
  },

  // Rumor share - when trust is low but NPC knows something
  {
    intent: 'rumor_share',
    trigger: {
      maxTrust: createKappaInt(0.5),
      maxFear: createKappaInt(0.4),
    },
    truthMode: 'rumor',
    basePriority: 30,
    cooldownTicks: 180,
  },

  // Comfort - when player seems upset and NPC has high trust
  {
    intent: 'comfort',
    trigger: {
      minTrust: createKappaInt(0.6),
      minDuty: createKappaInt(0.4),
    },
    truthMode: 'belief',
    basePriority: 35,
    cooldownTicks: 250,
  },

  // Teach - when NPC has knowledge (role-based)
  {
    intent: 'teach',
    trigger: {
      minTrust: createKappaInt(0.5),
      requiredRole: ['Elder', 'Master', 'Scholar', 'Guide'],
    },
    truthMode: 'known_fact',
    basePriority: 45,
    cooldownTicks: 300,
  },

  // Recruit - when faction needs members and NPC has high duty
  {
    intent: 'recruit',
    trigger: {
      minDuty: createKappaInt(0.7),
    },
    truthMode: 'known_fact',
    basePriority: 55,
    cooldownTicks: 400,
  },

  // Boast - when pride is high
  {
    intent: 'boast',
    trigger: {
      minPride: createKappaInt(0.7),
    },
    truthMode: 'belief',
    basePriority: 25,
    cooldownTicks: 350,
  },

  // Farewell
  {
    intent: 'farewell',
    trigger: {
      minTrust: createKappaInt(0.2),
    },
    truthMode: 'known_fact',
    basePriority: 20,
    cooldownTicks: 100,
  },
]);

// =============================================================================
// PHRASE GENOME REGISTRY (simplified)
// =============================================================================

interface RegisteredGenome {
  genome: PhraseGenome;
  lastUsedTick: number;
  useCount: number;
}

const genomeRegistry: Map<string, RegisteredGenome> = new Map();

/**
 * Register a phrase genome for use.
 */
export function registerPhraseGenome(genome: PhraseGenome): void {
  genomeRegistry.set(genome.id, {
    genome,
    lastUsedTick: 0,
    useCount: 0,
  });
}

/**
 * Get registered genome by ID.
 */
export function getRegisteredGenome(genomeId: string): PhraseGenome | undefined {
  return genomeRegistry.get(genomeId)?.genome;
}

/**
 * Create minimal fallback genome.
 */
function createFallbackGenome(intent: SpeechIntent, language: 'de' | 'en' | 'arel' | 'guild' | 'mythic' | 'mixed'): PhraseGenome {
  return Object.freeze({
    id: `fallback_${intent}_${language}`,
    intent,
    languageMode: language,
    structure: ['subject', 'verb', 'object'],
    slots: Object.freeze([
      Object.freeze({ role: 'subject', required: true }),
      Object.freeze({ role: 'verb', required: true }),
      Object.freeze({ role: 'object', required: false }),
    ]),
    constraints: Object.freeze({}),
    outcomeStats: Object.freeze({
      uses: 0,
      successfulUses: 0,
      failedUses: 0,
      averageKappaScore: createKappaInt(1.0),
    }),
    mutation: Object.freeze({
      parentGenomeIds: [],
      generation: 0,
      stability: createKappaInt(1.0),
      novelty: createKappaInt(0),
    }),
    truthMode: 'known_fact',
  });
}

// =============================================================================
// KERNEL STATE
// =============================================================================

interface KernelState {
  lastIntentTick: number;
  recentSpeechHashes: readonly string[];
  intentHistory: readonly SpeechIntent[];
}

const npcKernelState: Map<string, KernelState> = new Map();

function getOrCreateKernelState(npcId: string): KernelState {
  if (!npcKernelState.has(npcId)) {
    npcKernelState.set(npcId, {
      lastIntentTick: 0,
      recentSpeechHashes: [],
      intentHistory: [],
    });
  }
  return npcKernelState.get(npcId)!;
}

// =============================================================================
// MAIN DECISION FUNCTION
// =============================================================================

export interface DecisionContext {
  npcState: NpcLanguageState;
  worldState: {
    threatLevel: KappaInt;
    villageSafety: KappaInt;
    factionPressure: KappaInt;
    politicalTension: KappaInt;
  };
  tick: number;
  sequenceId: number;
}

/**
 * Decide utterance for NPC.
 * Deterministic: same state + same tick → same decision.
 */
export function decideUtterance(
  context: DecisionContext,
  options?: {
    preferFallback?: boolean;
    forceIntent?: SpeechIntent;
  }
): UtteranceDecision {
  const { npcState, worldState, tick, sequenceId } = context;
  const state = getOrCreateKernelState(npcState.npcId);

  // Determine speech situation
  const situation = buildSituation(npcState, worldState);

  // Select intent
  const intent = options?.forceIntent ?? selectIntent(npcState, situation, state, tick);

  // Select truth mode based on intent
  const rule = INTENT_RULES.find((r) => r.intent === intent);
  const truthMode = rule?.truthMode ?? 'known_fact';

  // Get or create phrase genome
  const genomeId = `${npcState.factionId}_${intent}_${npcState.role}`.toLowerCase();
  let genome = getRegisteredGenome(genomeId);

  if (!genome || options?.preferFallback) {
    // Use or create fallback
    genome = createFallbackGenome(intent, getPreferredLanguage(npcState.factionId));
  }

  // Create deterministic seed
  const seed = createSentenceSeed(npcState.npcId, intent, tick, sequenceId);

  // Build sentence
  const construction = buildSentence(genome, seed, {
    dialectOverride: getPreferredLanguage(npcState.factionId),
    preferFallback: options?.preferFallback,
  });

  if (!construction.success) {
    // Fallback to simple construction
    return buildFallbackUtterance(intent, npcState, situation, seed);
  }

  // Compute emotional tone from selected lexemes
  const emotionalTone = computeEmotionalTone(construction.fillers ?? []);

  // Compute confidence based on learning history
  const confidence = computeConfidence(genome.id, construction.fillers ?? []);

  // Update kernel state
  updateKernelState(npcState.npcId, tick, intent, construction.hash ?? '');

  return Object.freeze({
    speechHash: construction.hash ?? stableHash32(seed.toString()).toString(16),
    intent,
    phraseGenomeId: genome.id,
    selectedLexemeIds: (construction.fillers ?? []).map((f) => f.lexeme.id),
    constructedText: construction.text ?? '',
    truthMode,
    emotionalTone,
    confidence,
    needsFallback: false,
  });
}

/**
 * Build speech situation from NPC and world state.
 */
function buildSituation(
  npcState: NpcLanguageState,
  worldState: DecisionContext['worldState']
): SpeechSituation {
  return Object.freeze({
    intent: 'greet', // Will be overridden by selectIntent
    threatLevel: worldState.threatLevel,
    trust: npcState.currentTrust,
    fear: npcState.currentFear,
    hunger: npcState.currentHunger,
    factionPressure: worldState.factionPressure,
    politicalTension: worldState.politicalTension,
  });
}

/**
 * Select best intent for current state.
 */
function selectIntent(
  npcState: NpcLanguageState,
  situation: SpeechSituation,
  state: KernelState,
  tick: number
): SpeechIntent {
  // Filter applicable intents
  const applicable = INTENT_RULES.filter((rule) => {
    // Check cooldown
    if (tick - state.lastIntentTick < rule.cooldownTicks) {
      return false;
    }

    // Check role requirement
    if (rule.trigger.requiredRole && !rule.trigger.requiredRole.includes(npcState.role)) {
      return false;
    }

    // Check pending request requirement
    if (rule.trigger.requiredPendingRequest && npcState.pendingRequest) {
      if (!rule.trigger.requiredPendingRequest.includes(npcState.pendingRequest.type)) {
        return false;
      }
    }

    // Check need thresholds
    return checkThreshold(npcState.currentHunger, rule.trigger.minHunger, rule.trigger.maxHunger) &&
      checkThreshold(npcState.currentTrust, rule.trigger.minTrust, rule.trigger.maxTrust) &&
      checkThreshold(npcState.currentFear, rule.trigger.minFear, rule.trigger.maxFear) &&
      checkThreshold(npcState.currentDuty, rule.trigger.minDuty, rule.trigger.maxDuty) &&
      checkThreshold(npcState.currentPride, rule.trigger.minPride, rule.trigger.maxPride);
  });

  if (applicable.length === 0) {
    return 'greet'; // Default fallback
  }

  // Compute priority scores with state modifiers
  const scored = applicable.map((rule) => ({
    rule,
    score: computeIntentScore(rule, npcState, situation, tick),
  }));

  // Sort by score (deterministic)
  scored.sort((a, b) => b.score - a.score);

  // Use deterministic selection based on tick and NPC ID
  const seed = stableHash32(`${npcState.npcId}:${tick}:${sequenceId}`);
  const index = seed % Math.min(scored.length, 3); // Pick from top 3

  return scored[index].rule.intent;
}

function checkThreshold(
  value: KappaInt,
  min?: KappaInt,
  max?: KappaInt
): boolean {
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

  // Urgency boost for high needs
  if (rule.intent === 'request' && npcState.currentHunger > createKappaInt(0.7)) {
    score += 30;
  }

  // Fear boost for warn/threaten
  if ((rule.intent === 'warn' || rule.intent === 'threaten') && npcState.currentFear > createKappaInt(0.6)) {
    score += 25;
  }

  // Trust-based adjustments
  if (rule.intent === 'teach' && npcState.currentTrust > createKappaInt(0.6)) {
    score += 15;
  }

  // Time-based variation (deterministic)
  const timeSeed = stableHash32(`${rule.intent}:${tick}`);
  score += (timeSeed % 20) - 10; // ±10 variation

  return score;
}

function getPreferredLanguage(factionId: string): 'de' | 'en' | 'arel' | 'guild' | 'mythic' | 'mixed' {
  // Default based on faction (could be stored in FactionDialectStore)
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

function computeEmotionalTone(fillers: { lexeme: { semantics: { emotion: LexemeEmotion } } }[]): LexemeEmotion {
  // Sum emotions from all lexemes
  let fear = 0, anger = 0, joy = 0, trust = 0, shame = 0, pride = 0, hunger = 0, duty = 0, revenge = 0;
  let count = 0;

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
    count++;
  }

  if (count === 0) {
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

function computeConfidence(genomeId: string, fillers: { lexeme: { id: string } }[]): KappaInt {
  // Base confidence from genome history
  const avgScore = getGenomeAverageScore(genomeId);

  // Adjust based on lexeme success rates
  let lexemeConfidence = 0;
  let count = 0;
  for (const filler of fillers) {
    lexemeConfidence += getLexemeSuccessRate(filler.lexeme.id);
    count++;
  }

  if (count > 0) {
    lexemeConfidence = lexemeConfidence / count;
  } else {
    lexemeConfidence = 0.5;
  }

  // Combine (weighted average)
  const combined = (Number(avgScore) / KAPPA + lexemeConfidence) / 2;
  return createKappaInt(combined);
}

function updateKernelState(
  npcId: string,
  tick: number,
  intent: SpeechIntent,
  speechHash: string
): void {
  const state = getOrCreateKernelState(npcId);

  // Update recent hashes (ring buffer)
  const newHashes = [...state.recentSpeechHashes, speechHash].slice(-5);

  // Update intent history
  const newHistory = [...state.intentHistory, intent].slice(-10);

  npcKernelState.set(npcId, {
    lastIntentTick: tick,
    recentSpeechHashes: Object.freeze(newHashes),
    intentHistory: Object.freeze(newHistory),
  });
}

/**
 * Build fallback utterance when normal construction fails.
 */
function buildFallbackUtterance(
  intent: SpeechIntent,
  npcState: NpcLanguageState,
  situation: SpeechSituation,
  seed: number
): UtteranceDecision {
  // Simple fallback texts (deterministic selection)
  const fallbackTexts: Record<SpeechIntent, readonly string[]> = {
    greet: ['Greetings.', 'Well met.', 'Hello, traveler.'],
    farewell: ['Farewell.', 'Until next time.', 'Go safely.'],
    warn: ['Beware.', 'Danger approaches.', 'Stay alert!'],
    request: ['I need help.', 'Can you assist me?', 'I require aid.'],
    thank: ['Thank you.', 'I am grateful.', 'My thanks.'],
    threaten: ['You have been warned.', 'This is your final chance.', 'Do not test me.'],
    trade: ['I have goods to offer.', 'Perhaps we can trade.', 'I have something you need.'],
    teach: ['Listen and learn.', 'I shall share my knowledge.', 'Pay attention.'],
    pray: ['May the gods guide us.', 'Blessings upon you.', 'We pray for guidance.'],
    recruit: ['Join our cause.', 'We need capable hands.', 'Will you fight with us?'],
    betray: ['You fool.', 'This was inevitable.', 'You should not have trusted me.'],
    rumor_share: ['I have heard things...', 'Word on the road is...', 'They say that...'],
    accuse: ['You are to blame!', 'This is your doing!', 'I know it was you!'],
    comfort: ['It will be alright.', 'Do not despair.', 'We shall endure.'],
    boast: ['I am the best.', 'None can match me.', 'Fear my prowess.'],
    apologize: ['Forgive me.', 'I am sorry.', 'This was a mistake.'],
    brag: ['Have you seen my achievements?', 'I have done great deeds.', 'My accomplishments are many.'],
    mock: ['Ha! Pathetic.', 'You call that effort?', 'How disappointing.'],
  };

  const texts = fallbackTexts[intent] ?? ['...'];
  const index = stableHash32(seed.toString()) % texts.length;

  const speechHash = stableHash32(`${KERNEL_TAG}:${npcState.npcId}:${intent}:${seed}`).toString(16);

  return Object.freeze({
    speechHash,
    intent,
    phraseGenomeId: `fallback_${intent}`,
    selectedLexemeIds: [],
    constructedText: texts[index],
    truthMode: 'known_fact',
    emotionalTone: Object.freeze({
      fear: createKappaInt(0),
      anger: createKappaInt(0),
      joy: createKappaInt(intent === 'greet' ? 0.5 : 0),
      trust: createKappaInt(0.5),
      shame: createKappaInt(0),
      pride: createKappaInt(0),
      hunger: createKappaInt(0),
      duty: createKappaInt(0),
      revenge: createKappaInt(0),
    }),
    confidence: createKappaInt(0.3),
    needsFallback: true,
  });
}

// =============================================================================
// UTILITY
// =============================================================================

/**
 * Clear kernel state for NPC (for testing).
 */
export function clearKernelState(npcId: string): void {
  npcKernelState.delete(npcId);
}

/**
 * Clear all kernel state (for testing).
 */
export function clearAllKernelState(): void {
  npcKernelState.clear();
}

/**
 * Get kernel state for NPC.
 */
export function getKernelState(npcId: string): KernelState | undefined {
  return npcKernelState.get(npcId);
}