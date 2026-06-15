import { KAPPA } from '../are/Kappa.js';
import { stableHash32 } from '../determinism/AREDeterminism.js';
import type {
  KappaInt,
  LanguageCode,
  LexemeEmotion,
  NpcLanguageState,
  PhraseGenome,
  SentencePosition,
  SpeechIntent,
  SpeechSituation,
  SpeechTruthMode,
  UtteranceDecision,
} from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import { getFactionBaseLanguage } from './DialectStores.js';
import { buildSentence, createSentenceSeed } from './ProceduralGrammarEngine.js';
import { getLexemeSuccessRate, getGenomeAverageScore } from './LanguageOutcomeLearner.js';
import { recordNpcSpeechTelemetry } from './LanguageShadowTelemetry.js';

const KERNEL_TAG = 'DIALOGUE_DECISION_KERNEL_V1';
const DEFAULT_STRUCTURE: readonly SentencePosition[] = Object.freeze(['subject', 'verb', 'object']);
const EMOTION_KEYS: readonly (keyof LexemeEmotion)[] = Object.freeze([
  'fear',
  'anger',
  'joy',
  'trust',
  'shame',
  'pride',
  'hunger',
  'duty',
  'revenge',
]);

type LanguageMode = PhraseGenome['languageMode'];

type FillerEmotionSource = {
  readonly lexeme: {
    readonly id?: string;
    readonly semantics: {
      readonly emotion: LexemeEmotion;
    };
  };
};

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
  { intent: 'warn', trigger: { minFear: createKappaInt(0.6) }, truthMode: 'known_fact', basePriority: 90, cooldownTicks: 30 },
  { intent: 'request', trigger: { minHunger: createKappaInt(0.5) }, truthMode: 'known_fact', basePriority: 80, cooldownTicks: 50 },
  { intent: 'trade', trigger: { minTrust: createKappaInt(0.4) }, truthMode: 'known_fact', basePriority: 60, cooldownTicks: 150 },
  { intent: 'recruit', trigger: { minDuty: createKappaInt(0.7) }, truthMode: 'known_fact', basePriority: 55, cooldownTicks: 400 },
  { intent: 'greet', trigger: { minTrust: createKappaInt(0.3), maxTrust: createKappaInt(1) }, truthMode: 'known_fact', basePriority: 50, cooldownTicks: 100 },
  { intent: 'teach', trigger: { minTrust: createKappaInt(0.5), requiredRole: ['Elder', 'Master', 'Scholar', 'Guide', 'Village Guide'] }, truthMode: 'known_fact', basePriority: 45, cooldownTicks: 300 },
  { intent: 'thank', trigger: { minTrust: createKappaInt(0.7) }, truthMode: 'known_fact', basePriority: 40, cooldownTicks: 200 },
  { intent: 'comfort', trigger: { minTrust: createKappaInt(0.6), minDuty: createKappaInt(0.4) }, truthMode: 'belief', basePriority: 35, cooldownTicks: 250 },
  { intent: 'rumor_share', trigger: { maxTrust: createKappaInt(0.5), maxFear: createKappaInt(0.4) }, truthMode: 'rumor', basePriority: 30, cooldownTicks: 180 },
  { intent: 'boast', trigger: { minPride: createKappaInt(0.7) }, truthMode: 'belief', basePriority: 25, cooldownTicks: 350 },
  { intent: 'farewell', trigger: { minTrust: createKappaInt(0.2) }, truthMode: 'known_fact', basePriority: 20, cooldownTicks: 100 },
]);

const FALLBACK_TEXT: Readonly<Record<SpeechIntent, readonly string[]>> = Object.freeze({
  greet: Object.freeze(['Ich erkenne dich.', 'Der Takt sieht dich.', 'Du stehst im Kreis.']),
  farewell: Object.freeze(['Der Weg bleibt offen.', 'Der Takt trennt uns.', 'Geh mit klarem Blick.']),
  warn: Object.freeze(['Achte auf die Zeichen.', 'Gefahr liegt im Feld.', 'Der Rand ist unruhig.']),
  request: Object.freeze(['Ich brauche echte Hilfe.', 'Meine Not ist sichtbar.', 'Hilf, wenn dein Weg es erlaubt.']),
  thank: Object.freeze(['Deine Hilfe zählt.', 'Der Dank bleibt im Gedächtnis.', 'Ich merke mir diese Tat.']),
  accuse: Object.freeze(['Deine Spur ist schwer.', 'Ich sehe den Bruch.', 'Diese Tat braucht Antwort.']),
  trade: Object.freeze(['Handel wartet.', 'Der Tausch ist offen.', 'Ware folgt Bedarf.']),
  teach: Object.freeze(['Lerne aus dem Takt.', 'Wissen wächst durch Wiederkehr.', 'Die Regel steht im Muster.']),
  pray: Object.freeze(['Der Kreis hört zu.', 'Das Licht bleibt wach.', 'Die Bitte steigt.']),
  recruit: Object.freeze(['Steh in der Pflicht.', 'Der Ruf sucht Hände.', 'Die Aufgabe braucht Mut.']),
  betray: Object.freeze(['Vertrauen reißt leise.', 'Der Schatten merkt sich Namen.', 'Ein Bruch bleibt ein Bruch.']),
  rumor_share: Object.freeze(['Ein Flüstern wandert.', 'Nicht alles ist bewiesen.', 'Der Markt trägt Gerüchte.']),
  threaten: Object.freeze(['Der Abstand schützt dich.', 'Zwing mich nicht zur Klinge.', 'Noch ist Frieden möglich.']),
  comfort: Object.freeze(['Ruhe findet Form.', 'Der Schmerz wird kleiner.', 'Du bist nicht allein im Takt.']),
  boast: Object.freeze(['Meine Tat steht hell.', 'Der Sieg trägt meinen Namen.', 'Ich hielt die Linie.']),
  apologize: Object.freeze(['Mein Fehler steht offen.', 'Ich suche Ausgleich.', 'Der Bruch soll heilen.']),
  brag: Object.freeze(['Meine Spur ist stark.', 'Ich trage den Ruhm.', 'Der Kreis kennt meinen Namen.']),
  mock: Object.freeze(['Dein Stolz stolpert.', 'Der Takt lacht leise.', 'Nicht jeder Schritt ist groß.']),
});

interface RegisteredGenome {
  readonly genome: PhraseGenome;
  readonly lastUsedTick: number;
  readonly useCount: number;
}

const genomeRegistry: Map<string, RegisteredGenome> = new Map();

export function registerPhraseGenome(genome: PhraseGenome): void {
  genomeRegistry.set(genome.id, { genome: Object.freeze(genome), lastUsedTick: 0, useCount: 0 });
}

export function getRegisteredGenome(genomeId: string): PhraseGenome | undefined {
  return genomeRegistry.get(genomeId)?.genome;
}

function createFallbackGenome(intent: SpeechIntent, language: LanguageMode, truthMode: SpeechTruthMode): PhraseGenome {
  return Object.freeze({
    id: `runtime_fallback_${intent}_${language}`,
    intent,
    languageMode: language,
    structure: DEFAULT_STRUCTURE,
    slots: Object.freeze([
      Object.freeze({ role: 'subject' as const, required: true as const, semanticRequirements: [intent] }),
      Object.freeze({ role: 'verb' as const, required: true as const, semanticRequirements: [intent] }),
      Object.freeze({ role: 'object' as const, required: false as const, semanticRequirements: [intent] }),
    ]),
    constraints: Object.freeze({}),
    outcomeStats: Object.freeze({ uses: 0, successfulUses: 0, failedUses: 0, averageKappaScore: createKappaInt(1) }),
    mutation: Object.freeze({ parentGenomeIds: Object.freeze([]), generation: 0, stability: createKappaInt(1), novelty: createKappaInt(0) }),
    truthMode,
  });
}

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
  options?: { readonly preferFallback?: boolean; readonly forceIntent?: SpeechIntent }
): UtteranceDecision {
  const { npcState, worldState, tick, sequenceId } = context;
  const state = getOrCreateKernelState(npcState.npcId);
  const situation = buildSituation(npcState, worldState);
  const intent = options?.forceIntent ?? selectIntent(npcState, situation, state, tick, sequenceId);
  const rule = INTENT_RULES.find((candidate) => candidate.intent === intent);
  const ruleTruthMode = rule?.truthMode ?? 'known_fact';
  const preferredLanguage = getPreferredLanguage(npcState.factionId);
  const genome = !options?.preferFallback
    ? resolvePhraseGenome(npcState, intent) ?? createFallbackGenome(intent, preferredLanguage, ruleTruthMode)
    : createFallbackGenome(intent, preferredLanguage, ruleTruthMode);
  const truthMode = genome.truthMode ?? ruleTruthMode;
  const seed = createSentenceSeed(npcState.npcId, intent, tick, sequenceId);
  const construction = buildSentence(genome, seed, { dialectOverride: genome.languageMode, preferFallback: options?.preferFallback });

  if (!construction.success || !construction.text?.trim()) {
    const fallback = buildFallbackUtterance(intent, npcState, truthMode, seed, genome.id);
    updateKernelState(npcState.npcId, tick, intent, fallback.speechHash);
    recordNpcSpeechTelemetry({ tick, sequenceId, npcState, decision: fallback, phraseGenome: genome });
    return fallback;
  }

  const fillers = construction.fillers ?? [];
  const emotionalTone = computeEmotionalTone(fillers);
  const confidence = computeConfidence(genome.id, fillers);
  const speechHash = construction.hash ?? stableHash32(`${KERNEL_TAG}:${npcState.npcId}:${intent}:${seed}`).toString(16);
  updateKernelState(npcState.npcId, tick, intent, speechHash);

  const decision = Object.freeze({
    npcId: npcState.npcId,
    speechHash,
    intent,
    phraseGenomeId: genome.id,
    selectedLexemeIds: fillers.map((filler) => filler.lexeme.id),
    constructedText: construction.text,
    truthMode,
    emotionalTone,
    confidence,
    needsFallback: false,
  });

  recordNpcSpeechTelemetry({ tick, sequenceId, npcState, decision, phraseGenome: genome });
  return decision;
}

function buildSituation(npcState: NpcLanguageState, worldState: DecisionContext['worldState']): SpeechSituation {
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

function selectIntent(npcState: NpcLanguageState, situation: SpeechSituation, state: KernelState, tick: number, sequenceId: number): SpeechIntent {
  const applicable = INTENT_RULES.filter((rule) => {
    if (Number.isFinite(state.lastIntentTick) && tick - state.lastIntentTick < rule.cooldownTicks) return false;
    if (rule.trigger.requiredRole && !roleMatches(npcState.role, rule.trigger.requiredRole)) return false;
    return checkThreshold(npcState.currentHunger, rule.trigger.minHunger, rule.trigger.maxHunger)
      && checkThreshold(npcState.currentTrust, rule.trigger.minTrust, rule.trigger.maxTrust)
      && checkThreshold(npcState.currentFear, rule.trigger.minFear, rule.trigger.maxFear)
      && checkThreshold(npcState.currentDuty, rule.trigger.minDuty, rule.trigger.maxDuty)
      && checkThreshold(npcState.currentPride, rule.trigger.minPride, rule.trigger.maxPride);
  });

  if (applicable.length === 0) return 'greet';
  const scored = applicable
    .map((rule) => ({ rule, score: computeIntentScore(rule, npcState, situation, tick) }))
    .sort((a, b) => b.score - a.score || a.rule.intent.localeCompare(b.rule.intent));
  const seed = stableHash32(`${npcState.npcId}:${tick}:${sequenceId}:${state.intentHistory.join(',')}`);
  return scored[seed % Math.min(scored.length, 3)].rule.intent;
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

function computeIntentScore(rule: IntentRule, npcState: NpcLanguageState, situation: SpeechSituation, tick: number): number {
  let score = rule.basePriority;
  if (rule.intent === 'request' && npcState.currentHunger > createKappaInt(0.7)) score += 30;
  if (rule.intent === 'warn' && situation.threatLevel > createKappaInt(0.6)) score += 20;
  if (rule.intent === 'teach' && npcState.currentTrust > createKappaInt(0.6)) score += 15;
  return score + (stableHash32(`${rule.intent}:${tick}:${npcState.npcId}`) % 21) - 10;
}

function keyPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown';
}

function resolvePhraseGenome(npcState: NpcLanguageState, intent: SpeechIntent): PhraseGenome | undefined {
  const faction = keyPart(npcState.factionId);
  const role = keyPart(npcState.role);
  const candidates = [
    `${faction}_${intent}_${role}`,
    `${faction}_${intent}`,
    `default_${intent}_${role}`,
    `default_${intent}`,
  ];
  for (const genomeId of candidates) {
    const genome = getRegisteredGenome(genomeId);
    if (genome) return genome;
  }
  return undefined;
}

function getPreferredLanguage(factionId: string): LanguageCode {
  return getFactionBaseLanguage(factionId);
}

function computeEmotionalTone(fillers: readonly FillerEmotionSource[]): LexemeEmotion {
  if (fillers.length === 0) return neutralEmotion();
  const sums: Record<keyof LexemeEmotion, number> = {
    fear: 0,
    anger: 0,
    joy: 0,
    trust: 0,
    shame: 0,
    pride: 0,
    hunger: 0,
    duty: 0,
    revenge: 0,
  };

  for (const filler of fillers) {
    for (const key of EMOTION_KEYS) {
      sums[key] += Number(filler.lexeme.semantics.emotion[key]);
    }
  }

  return Object.freeze({
    fear: createKappaInt(sums.fear / fillers.length),
    anger: createKappaInt(sums.anger / fillers.length),
    joy: createKappaInt(sums.joy / fillers.length),
    trust: createKappaInt(sums.trust / fillers.length),
    shame: createKappaInt(sums.shame / fillers.length),
    pride: createKappaInt(sums.pride / fillers.length),
    hunger: createKappaInt(sums.hunger / fillers.length),
    duty: createKappaInt(sums.duty / fillers.length),
    revenge: createKappaInt(sums.revenge / fillers.length),
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

function fallbackEmotion(npcState: NpcLanguageState): LexemeEmotion {
  return Object.freeze({
    fear: npcState.currentFear,
    anger: createKappaInt(0),
    joy: createKappaInt(0),
    trust: npcState.currentTrust,
    shame: createKappaInt(0),
    pride: npcState.currentPride,
    hunger: npcState.currentHunger,
    duty: npcState.currentDuty,
    revenge: npcState.currentRevenge,
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
  seed: number,
  phraseGenomeId: string
): UtteranceDecision {
  const options = FALLBACK_TEXT[intent] ?? FALLBACK_TEXT.greet;
  const index = stableHash32(`${KERNEL_TAG}:fallback:${npcState.npcId}:${npcState.factionId}:${npcState.role}:${intent}:${seed}`) % options.length;
  const text = options[index];
  const speechHash = stableHash32(`${KERNEL_TAG}:${npcState.npcId}:${intent}:${seed}:${text}`).toString(16);
  return Object.freeze({
    npcId: npcState.npcId,
    speechHash,
    intent,
    phraseGenomeId,
    selectedLexemeIds: Object.freeze([]),
    constructedText: text,
    truthMode,
    emotionalTone: fallbackEmotion(npcState),
    confidence: createKappaInt(0.3),
    needsFallback: true,
  });
}

export function clearKernelState(npcId: string): void {
  npcKernelState.delete(npcId);
}

export function clearAllKernelState(): void {
  npcKernelState.clear();
}

export function getKernelState(npcId: string): KernelState | undefined {
  return npcKernelState.get(npcId);
}
