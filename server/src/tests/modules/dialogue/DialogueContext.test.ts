import { describe, it, expect } from 'vitest';
import { buildDialogueContext } from '../../../modules/dialogue/DialogueContext';

describe('buildDialogueContext', () => {
  it('should map fully populated inputs correctly', () => {
    const npc = {
      id: 'npc_123',
      traits: { brave: true, greedy: false },
      lineage: 'elf',
      culture: 'forest',
      religion: 'nature',
      memory: ['met_player_before']
    };

    const player = {
      id: 'player_456'
    };

    const world = {
      events: ['eclipse'],
      oracleSignals: ['danger_north']
    };

    const context = buildDialogueContext(npc, player, world);

    expect(context).toEqual({
      npcId: 'npc_123',
      playerId: 'player_456',
      traits: { brave: true, greedy: false },
      lineage: 'elf',
      culture: 'forest',
      religion: 'nature',
      memory: ['met_player_before'],
      worldEvents: ['eclipse'],
      oracleSignals: ['danger_north']
    });
  });

  it('should handle missing optional properties gracefully', () => {
    const npc = { id: 'npc_123' };
    const player = {};
    const world = {};

    const context = buildDialogueContext(npc, player, world);

    expect(context).toEqual({
      npcId: 'npc_123',
      playerId: null,
      traits: {},
      lineage: null,
      culture: null,
      religion: null,
      memory: [],
      worldEvents: [],
      oracleSignals: []
    });
  });

  it('should handle null/undefined player or world', () => {
    const npc = { id: 'npc_123' };

    const context1 = buildDialogueContext(npc, null, null);
    expect(context1.playerId).toBeNull();
    expect(context1.worldEvents).toEqual([]);
    expect(context1.oracleSignals).toEqual([]);

    const context2 = buildDialogueContext(npc, undefined, undefined);
    expect(context2.playerId).toBeNull();
    expect(context2.worldEvents).toEqual([]);
    expect(context2.oracleSignals).toEqual([]);
  });
});
