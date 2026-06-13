import { beforeEach, describe, expect, it } from 'vitest';
import { NPCSystem } from './NPCSystem.js';
import { loadGameDataNpcsIntoSystem } from './NPCGameDataStore.js';
import {
  buildNpcLanguageState,
  clearAllIdiolects,
  clearAllKernelState,
  clearArchive,
  createKappaInt,
  decideUtterance,
  getLexeme,
  loadLivingDudenGameData,
  seedDefaultDialects,
} from '../../core/language/index.js';

describe('NPC game-data + Living Duden runtime proof', () => {
  beforeEach(() => {
    clearAllKernelState();
    clearAllIdiolects();
    clearArchive();
    seedDefaultDialects();
  });

  it('loads game-data NPCs and uses the loaded NPC as a live language source', () => {
    const npcSystem = new NPCSystem();
    const npcReport = loadGameDataNpcsIntoSystem(npcSystem);
    const dudenReport = loadLivingDudenGameData();

    expect(npcReport.npcDefinitionsRead).toBeGreaterThanOrEqual(10);
    expect(npcReport.spawnRowsRead).toBeGreaterThanOrEqual(10);
    expect(npcReport.npcsLoaded).toBeGreaterThanOrEqual(10);
    expect(npcReport.missingSpawnDefinitions).toEqual([]);
    expect(dudenReport.lexemesLoaded).toBeGreaterThanOrEqual(1);
    expect(getLexeme('arel_greeting_wacht')).toBeDefined();

    const guide = npcSystem.getNPC('npc_guide');
    expect(guide).toBeDefined();
    expect(guide?.name).toBe('Linnea');
    expect(guide?.position).toEqual({ x: 1.5, y: 0, z: 1.5 });
    expect(guide?.memory?.spawn).toEqual({ x: 1.5, y: 1.5, z: 1.5 });
    expect(guide?.memory?.source).toBe('game-data/npc');
    expect(guide?.memory?.dialogueId).toBe('dialogue_guide');

    const npcState = buildNpcLanguageState(guide!.id, {
      factionId: guide?.faction ?? 'Neutral',
      role: guide?.role ?? 'Village Guide',
      hunger: 0.2,
      trust: 0.7,
      fear: 0.1,
      duty: 0.6,
      pride: 0.4,
      revenge: 0,
      lastConversationTick: 1200,
    });
    const worldState = Object.freeze({
      threatLevel: createKappaInt(0.1),
      villageSafety: createKappaInt(0.8),
      factionPressure: createKappaInt(0.2),
      politicalTension: createKappaInt(0.1),
    });

    const context = Object.freeze({ npcState, worldState, tick: 1200, sequenceId: 7 });
    const first = decideUtterance(context, { forceIntent: 'greet' });
    const second = decideUtterance(context, { forceIntent: 'greet' });

    expect(first.npcId).toBe('npc_guide');
    expect(first.constructedText.length).toBeGreaterThan(0);
    expect(first.speechHash).toBe(second.speechHash);
    expect(first.constructedText).toBe(second.constructedText);
  });
});
