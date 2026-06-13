import type { TickId } from '../are/types.js';
import type { NpcLanguageState, NpcId, KappaInt, SpeechOutcomeEvent, UtteranceDecision } from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import { decideUtterance, type DecisionContext } from './DialogueDecisionKernel.js';
import { recordOutcome } from './LanguageOutcomeLearner.js';
import { seedDefaultDialects } from './DialectStores.js';
import { getLexemeCount } from './LivingDudenArchive.js';
import { bridgePlayerSpeech } from './RumorSpeechBridge.js';

const LINGUISTIC_PROCESSING_INTERVAL = 10;
const MAX_UTTERANCES_PER_TICK = 5;

interface LinguisticKernelState {
  lastProcessingTick: number;
  activeConversations: Map<string, ConversationState>;
  pendingOutcomes: SpeechOutcomeEvent[];
  utteranceSequence: number;
}

interface ConversationState {
  readonly npcId: string;
  readonly playerId: string;
  readonly startTick: number;
  readonly lastSpeechTick: number;
  readonly utteranceCount: number;
  readonly trustLevel: KappaInt;
}

const kernelState: LinguisticKernelState = {
  lastProcessingTick: 0,
  activeConversations: new Map(),
  pendingOutcomes: [],
  utteranceSequence: 0,
};

export interface NpcLanguageStateInput {
  readonly factionId: string;
  readonly role: string;
  readonly hunger: number;
  readonly trust: number;
  readonly fear: number;
  readonly duty: number;
  readonly pride: number;
  readonly revenge: number;
  readonly recentSpeechHashes?: readonly string[];
  readonly lastConversationTick?: number;
}

export interface LinguisticWorldStateInput {
  readonly threatLevel: KappaInt;
  readonly villageSafety: KappaInt;
  readonly factionPressure: KappaInt;
  readonly politicalTension: KappaInt;
}

export function buildNpcLanguageState(npcId: string, worldState: NpcLanguageStateInput): NpcLanguageState {
  return Object.freeze({
    npcId: npcId as NpcId,
    factionId: worldState.factionId,
    role: worldState.role,
    currentHunger: createKappaInt(worldState.hunger),
    currentTrust: createKappaInt(worldState.trust),
    currentFear: createKappaInt(worldState.fear),
    currentDuty: createKappaInt(worldState.duty),
    currentPride: createKappaInt(worldState.pride),
    currentRevenge: createKappaInt(worldState.revenge),
    recentSpeechHashes: Object.freeze([...(worldState.recentSpeechHashes ?? [])]),
    lastConversationTick: worldState.lastConversationTick ?? 0,
  });
}

export function processLinguisticUpdate(
  tick: TickId,
  npcStates: readonly NpcLanguageState[],
  worldState: LinguisticWorldStateInput,
  options?: { readonly forceAll?: boolean; readonly maxUtterances?: number }
): readonly UtteranceDecision[] {
  const tickNum = Number(tick);
  if (!Number.isSafeInteger(tickNum) || tickNum < 0) return Object.freeze([]);
  if (tickNum % LINGUISTIC_PROCESSING_INTERVAL !== 0 && !options?.forceAll) return Object.freeze([]);

  const maxUtterances = options?.maxUtterances ?? MAX_UTTERANCES_PER_TICK;
  const selectedNpcs = selectNpcsForProcessing(npcStates, tickNum, maxUtterances);
  const utterances: UtteranceDecision[] = [];

  for (const npcState of selectedNpcs) {
    const decision = processNpcUtterance(npcState, worldState, tickNum);
    if (decision) utterances.push(decision);
  }

  kernelState.lastProcessingTick = tickNum;
  return Object.freeze(utterances);
}

function selectNpcsForProcessing(npcStates: readonly NpcLanguageState[], tick: number, maxCount: number): readonly NpcLanguageState[] {
  if (npcStates.length <= maxCount) return Object.freeze([...npcStates]);
  const selected: NpcLanguageState[] = [];
  const usedIndices = new Set<number>();
  const safeMax = Math.max(0, Math.min(maxCount, npcStates.length));
  for (let i = 0; i < safeMax; i++) {
    let index = Math.abs((tick + i * 1000) % npcStates.length);
    let attempts = 0;
    while (usedIndices.has(index) && attempts < npcStates.length) {
      index = (index + 1) % npcStates.length;
      attempts++;
    }
    if (usedIndices.has(index)) continue;
    usedIndices.add(index);
    selected.push(npcStates[index]);
  }
  return Object.freeze(selected);
}

function processNpcUtterance(npcState: NpcLanguageState, worldState: LinguisticWorldStateInput, tick: number): UtteranceDecision | undefined {
  const sequenceId = kernelState.utteranceSequence++;
  const context: DecisionContext = { npcState, worldState, tick, sequenceId };
  const decision = decideUtterance(context);
  updateConversationState(npcState.npcId, tick, decision);
  return decision;
}

function updateConversationState(npcId: string, tick: number, decision: UtteranceDecision): void {
  const key = `${npcId}:runtime`;
  const existing = kernelState.activeConversations.get(key);
  kernelState.activeConversations.set(key, Object.freeze({
    npcId,
    playerId: 'runtime',
    startTick: existing?.startTick ?? tick,
    lastSpeechTick: tick,
    utteranceCount: (existing?.utteranceCount ?? 0) + 1,
    trustLevel: decision.emotionalTone.trust,
  }));
}

export function processPlayerSpeech(playerId: string, npcId: string, text: string, tick: number): { readonly bridgeResult: ReturnType<typeof bridgePlayerSpeech>; readonly npcResponse?: UtteranceDecision } {
  return Object.freeze({ bridgeResult: bridgePlayerSpeech(playerId, text, tick, npcId) });
}

export function recordSpeechOutcome(outcome: SpeechOutcomeEvent): void {
  recordOutcome(outcome);
}

let initialized = false;

export async function initializeLinguisticKernel(): Promise<void> {
  if (initialized) return;
  seedDefaultDialects();
  initialized = true;
}

export function isLinguisticKernelInitialized(): boolean {
  return initialized;
}

export function getLinguisticStats(): { readonly isInitialized: boolean; readonly lexemeCount: number; readonly activeConversations: number; readonly pendingOutcomes: number; readonly utteranceSequence: number; readonly lastProcessingTick: number } {
  return Object.freeze({
    isInitialized: initialized,
    lexemeCount: getLexemeCount(),
    activeConversations: kernelState.activeConversations.size,
    pendingOutcomes: kernelState.pendingOutcomes.length,
    utteranceSequence: kernelState.utteranceSequence,
    lastProcessingTick: kernelState.lastProcessingTick,
  });
}

export function resetLinguisticKernel(): void {
  kernelState.lastProcessingTick = 0;
  kernelState.utteranceSequence = 0;
  kernelState.activeConversations.clear();
  kernelState.pendingOutcomes.length = 0;
}

export function shutdownLinguisticKernel(): void {
  resetLinguisticKernel();
  initialized = false;
}
