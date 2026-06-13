/**
 * @file server/src/core/language/ArelorianLinguisticKernel.ts
 * @description ArelorianLinguisticKernel - Language system integration with main tick loop.
 *
 * Wires the living language system into the ArelorianKernel tick loop.
 * Runs every 10 ticks (speech is slower than movement).
 *
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All decisions derive from stable hashes and ARE state
 */

import type { TickId } from '../are/types.js';
import type {
  NpcLanguageState,
  NpcId,
  KappaInt,
  SpeechOutcomeEvent,
  UtteranceDecision,
} from './LanguageTypes.js';
import { createKappaInt } from './LanguageTypes.js';
import {
  decideUtterance,
  type DecisionContext,
} from './DialogueDecisionKernel.js';
import { recordOutcome } from './LanguageOutcomeLearner.js';
import { seedDefaultDialects } from './DialectStores.js';
import { loadSeedData, getLexemeCount } from './LivingDudenArchive.js';
import { bridgePlayerSpeech } from './RumorSpeechBridge.js';

const LINGUISTIC_KERNEL_TAG = 'ARELORIAN_LINGUISTIC_KERNEL_V1';

// =============================================================================
// LINGUISTIC PROCESSING CONFIG
// =============================================================================

const LINGUISTIC_PROCESSING_INTERVAL = 10; // Every 10 ticks
const MAX_UTTERANCES_PER_TICK = 5; // Cap utterances per tick for performance
const LANGUAGE_TICK_MODULO = 100; // Full language processing every 100 ticks

// =============================================================================
// KERNEL STATE
// =============================================================================

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

const kernelState: LinguisticKernelState = Object.freeze({
  lastProcessingTick: 0,
  activeConversations: new Map(),
  pendingOutcomes: [],
  utteranceSequence: 0,
});

// =============================================================================
// NPC LANGUAGE STATE BUILDER
// =============================================================================

/**
 * Build NPC language state from ARE state.
 * This would integrate with WorldStateRegistry.
 */
export function buildNpcLanguageState(
  npcId: string,
  worldState: {
    factionId: string;
    role: string;
    hunger: number;
    trust: number;
    fear: number;
    duty: number;
    pride: number;
    revenge: number;
  }
): NpcLanguageState {
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
    recentSpeechHashes: [],
    lastConversationTick: 0,
  });
}

// =============================================================================
// MAIN LINGUISTIC PROCESSING
// =============================================================================

/**
 * Process linguistic updates for tick.
 * Called by ArelorianKernel every LINGUISTIC_PROCESSING_INTERVAL ticks.
 */
export function processLinguisticUpdate(
  tick: TickId,
  npcStates: readonly NpcLanguageState[],
  worldState: {
    threatLevel: KappaInt;
    villageSafety: KappaInt;
    factionPressure: KappaInt;
    politicalTension: KappaInt;
  },
  options?: {
    forceAll?: boolean;
    maxUtterances?: number;
  }
): readonly UtteranceDecision[] {
  const tickNum = Number(tick);

  // Skip if not processing interval
  if (tickNum % LINGUISTIC_PROCESSING_INTERVAL !== 0 && !options?.forceAll) {
    return [];
  }

  const utterances: UtteranceDecision[] = [];
  const maxUtterances = options?.maxUtterances ?? MAX_UTTERANCES_PER_TICK;

  // Select NPCs to process (deterministic based on tick)
  const selectedNpcs = selectNpcsForProcessing(npcStates, tickNum, maxUtterances);

  for (const npcState of selectedNpcs) {
    try {
      const decision = processNpcUtterance(npcState, worldState, tickNum);

      if (decision) {
        utterances.push(decision);
      }
    } catch (error) {
      // Log error but continue processing other NPCs
      console.error(`[LINGUISTIC_KERNEL] Error processing NPC ${npcState.npcId}:`, error);
    }
  }

  return Object.freeze(utterances);
}

/**
 * Select NPCs for processing this tick.
 * Deterministic: same inputs → same selection.
 */
function selectNpcsForProcessing(
  npcStates: readonly NpcLanguageState[],
  tick: number,
  maxCount: number
): readonly NpcLanguageState[] {
  if (npcStates.length <= maxCount) {
    return npcStates;
  }

  // Deterministic selection using stable hash
  const selected: NpcLanguageState[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < maxCount; i++) {
    const seed = tick + i * 1000;
    let index = Math.abs(seed % npcStates.length);

    // Avoid duplicates
    let attempts = 0;
    while (usedIndices.has(index) && attempts < 10) {
      index = (index + 1) % npcStates.length;
      attempts++;
    }

    usedIndices.add(index);
    selected.push(npcStates[index]);
  }

  return Object.freeze(selected);
}

/**
 * Process single NPC utterance.
 */
function processNpcUtterance(
  npcState: NpcLanguageState,
  worldState: {
    threatLevel: KappaInt;
    villageSafety: KappaInt;
    factionPressure: KappaInt;
    politicalTension: KappaInt;
  },
  tick: number
): UtteranceDecision | undefined {
  const sequenceId = kernelState.utteranceSequence++;

  const context: DecisionContext = {
    npcState,
    worldState,
    tick,
    sequenceId,
  };

  // Decide utterance
  const decision = decideUtterance(context);

  // Update conversation tracking
  updateConversationState(npcState.npcId, tick, decision);

  return decision;
}

/**
 * Update conversation state after NPC speech.
 */
function updateConversationState(
  npcId: string,
  tick: number,
  decision: UtteranceDecision
): void {
  // In a real implementation, this would update activeConversations
  // For now, we just increment sequence
}

// =============================================================================
// PLAYER SPEECH BRIDGING
// =============================================================================

/**
 * Process player speech to NPC.
 */
export function processPlayerSpeech(
  playerId: string,
  npcId: string,
  rawText: string,
  tick: number
): {
  bridgeResult: ReturnType<typeof bridgePlayerSpeech>;
  npcResponse?: UtteranceDecision;
} {
  // Bridge player speech through safety quarantine
  const bridgeResult = bridgePlayerSpeech(playerId, rawText, tick, npcId);

  // NPC will respond based on bridged understanding
  // This would trigger NPC response in a full implementation

  return { bridgeResult };
}

// =============================================================================
// OUTCOME RECORDING
// =============================================================================

/**
 * Record speech outcome for learning.
 */
export function recordSpeechOutcome(outcome: SpeechOutcomeEvent): void {
  recordOutcome(outcome);
}

// =============================================================================
// INITIALIZATION
// =============================================================================

let initialized = false;

/**
 * Initialize language system.
 * Called during server startup.
 */
export async function initializeLinguisticKernel(): Promise<void> {
  if (initialized) return;

  console.log(`[${LINGUISTIC_KERNEL_TAG}] Initializing...`);

  // Seed faction dialects
  seedDefaultDialects();

  // Load seed data would happen here
  // await loadSeedDataFromFiles();

  console.log(`[${LINGUISTIC_KERNEL_TAG}] Initialized with ${getLexemeCount()} lexemes`);

  initialized = true;
}

/**
 * Check if kernel is initialized.
 */
export function isLinguisticKernelInitialized(): boolean {
  return initialized;
}

// =============================================================================
// TELEMETRY (side-channel)
// =============================================================================

/**
 * Get language system statistics.
 */
export function getLinguisticStats(): {
  isInitialized: boolean;
  lexemeCount: number;
  activeConversations: number;
  pendingOutcomes: number;
  utteranceSequence: number;
} {
  return Object.freeze({
    isInitialized: initialized,
    lexemeCount: getLexemeCount(),
    activeConversations: kernelState.activeConversations.size,
    pendingOutcomes: kernelState.pendingOutcomes.length,
    utteranceSequence: kernelState.utteranceSequence,
  });
}

// =============================================================================
// CLEANUP (for testing)
// =============================================================================

/**
 * Reset kernel state (for testing).
 */
export function resetLinguisticKernel(): void {
  kernelState.utteranceSequence = 0;
  kernelState.activeConversations.clear();
  kernelState.pendingOutcomes.length = 0;
}

/**
 * Full shutdown (for testing).
 */
export function shutdownLinguisticKernel(): void {
  resetLinguisticKernel();
  initialized = false;
}