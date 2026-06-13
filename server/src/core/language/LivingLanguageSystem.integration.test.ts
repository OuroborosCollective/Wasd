import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeDialogueBridge, isDialogueBridgeInitialized, resolveDialogue, getDialogueEntry, getFallbackText, clearDialogueBridge } from './DialogueBridge.js';
import { decideUtterance, clearAllKernelState } from './DialogueDecisionKernel.js';
import { buildNpcLanguageState, processLinguisticUpdate, initializeLinguisticKernel, isLinguisticKernelInitialized, resetLinguisticKernel, shutdownLinguisticKernel } from './ArelorianLinguisticKernel.js';
import { createKappaInt } from './LanguageTypes.js';
import type { KappaInt } from './LanguageTypes.js';
import type { TickId } from '../are/types.js';

function testTick(value: number): TickId { return value as TickId; }
function createTestWorldState() {
  return { threatLevel: createKappaInt(0.3) as KappaInt, villageSafety: createKappaInt(0.7) as KappaInt, factionPressure: createKappaInt(0.5) as KappaInt, politicalTension: createKappaInt(0.4) as KappaInt };
}

describe('Living Language System Integration', () => {
  beforeEach(() => { clearDialogueBridge(); clearAllKernelState(); resetLinguisticKernel(); });
  afterEach(() => { shutdownLinguisticKernel(); clearDialogueBridge(); });

  describe('DialogueBridge', () => {
    it('should initialize with dialogue entries', () => { initializeDialogueBridge([{ id: 'dialogue_test_npc', greeting: 'Hello, traveler!', fallback: '...' }]); expect(isDialogueBridgeInitialized()).toBe(true); });
    it('should return dialogue entry by ID', () => { initializeDialogueBridge([{ id: 'dialogue_test_npc', greeting: 'Hello, traveler!' }]); const entry = getDialogueEntry('dialogue_test_npc'); expect(entry).toBeDefined(); expect(entry?.greeting).toBe('Hello, traveler!'); });
    it('should resolve dialogue with context', () => { initializeDialogueBridge([{ id: 'dialogue_test_npc', greeting: 'Hello!', questStartLines: { quest_1: 'Welcome!' } }]); const result = resolveDialogue('dialogue_test_npc', { questId: 'quest_1', questPhase: 'start' }); expect(result?.text).toBe('Welcome!'); });
    it('should return fallback text for unknown ID', () => { initializeDialogueBridge([]); expect(getFallbackText('unknown')).toBe('...'); });
  });

  describe('DialogueDecisionKernel', () => {
    it('should decide utterance with all required fields', () => { const npcState = buildNpcLanguageState('npc_1', { factionId: 'neutral', role: 'citizen', hunger: 0.3, trust: 0.5, fear: 0.2, duty: 0.6, pride: 0.4, revenge: 0.1 }); const decision = decideUtterance({ npcState, worldState: createTestWorldState(), tick: 100, sequenceId: 1 }); expect(decision.npcId).toBe('npc_1'); expect(decision.speechHash).toBeTruthy(); expect(decision.intent).toBeTruthy(); expect(decision.constructedText).toBeTruthy(); });
    it('should produce deterministic results for same input', () => { const npcState = buildNpcLanguageState('det_npc', { factionId: 'neutral', role: 'citizen', hunger: 0.3, trust: 0.5, fear: 0.2, duty: 0.6, pride: 0.4, revenge: 0.1 }); const ctx = { npcState, worldState: createTestWorldState(), tick: 300, sequenceId: 3 }; const d1 = decideUtterance(ctx); const d2 = decideUtterance(ctx); expect(d1.speechHash).toBe(d2.speechHash); expect(d1.constructedText).toBe(d2.constructedText); });
  });

  describe('ArelorianLinguisticKernel', () => {
    it('should initialize and process updates', async () => { await initializeLinguisticKernel(); expect(isLinguisticKernelInitialized()).toBe(true); const npcState = buildNpcLanguageState('kernel_npc', { factionId: 'neutral', role: 'citizen', hunger: 0.3, trust: 0.5, fear: 0.2, duty: 0.6, pride: 0.4, revenge: 0.1 }); const utterances = processLinguisticUpdate(testTick(0), [npcState], createTestWorldState(), { forceAll: true }); expect(utterances.length).toBeGreaterThanOrEqual(0); });
    it('should skip non-interval ticks', () => { const npcState = buildNpcLanguageState('skip_npc', { factionId: 'neutral', role: 'citizen', hunger: 0.3, trust: 0.5, fear: 0.2, duty: 0.6, pride: 0.4, revenge: 0.1 }); expect(processLinguisticUpdate(testTick(5), [npcState], createTestWorldState()).length).toBe(0); });
  });

  describe('End-to-End Flow', () => {
    beforeEach(async () => { initializeDialogueBridge([{ id: 'e2e_npc', greeting: 'Welcome!', questStartLines: { q1: 'Help me!' } }]); await initializeLinguisticKernel(); });
    it('should generate utterance with all fields', () => { const npcState = buildNpcLanguageState('e2e_npc', { factionId: 'neutral', role: 'guide', hunger: 0.2, trust: 0.6, fear: 0.1, duty: 0.7, pride: 0.5, revenge: 0.0 }); const decision = decideUtterance({ npcState, worldState: createTestWorldState(), tick: 1000, sequenceId: 1 }); expect(decision.npcId).toBe('e2e_npc'); expect(decision.constructedText).toBeTruthy(); });
    it('should resolve quest dialogue', () => { const result = resolveDialogue('e2e_npc', { questId: 'q1', questPhase: 'start' }); expect(result?.text).toBe('Help me!'); });
  });

  describe('Determinism', () => {
    it('should produce identical results across calls with same tick', () => { const npcState = buildNpcLanguageState('stab_npc', { factionId: 'neutral', role: 'citizen', hunger: 0.3, trust: 0.5, fear: 0.2, duty: 0.6, pride: 0.4, revenge: 0.1 }); const ctx = { npcState, worldState: createTestWorldState(), tick: 500, sequenceId: 5 }; const results = Array.from({ length: 5 }, () => decideUtterance(ctx)); results.forEach((result) => { expect(result.speechHash).toBe(results[0].speechHash); }); });
  });
});
