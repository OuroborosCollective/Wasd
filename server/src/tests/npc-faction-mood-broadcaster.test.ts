import { beforeEach, describe, expect, it } from 'vitest';
import { NPCFactionMoodBroadcaster, type NPCFactionMoodTarget } from '../modules/npc/NPCFactionMoodBroadcaster';

describe('NPCFactionMoodBroadcaster', () => {
  let broadcaster: NPCFactionMoodBroadcaster;
  let mockNpcs: NPCFactionMoodTarget[];

  beforeEach(() => {
    broadcaster = new NPCFactionMoodBroadcaster();
    mockNpcs = [
      {
        id: 'npc-victor',
        factionId: 'heroes',
        position: { x: 10, y: 10 },
        traits: { faith: 0.5, aggression: 0.5, curiosity: 0.5 },
        memory: {},
      },
      {
        id: 'npc-loser',
        factionId: 'villains',
        position: { x: 10, y: 10 },
        traits: { faith: 0.5, aggression: 0.5, curiosity: 0.5 },
        memory: {},
      },
      {
        id: 'npc-far-away',
        factionId: 'heroes',
        position: { x: 9999, y: 9999 },
        traits: { faith: 0.5, aggression: 0.5, curiosity: 0.5 },
        memory: {},
      },
    ];
  });

  function apply() {
    return broadcaster.applyBossQuestCompleted({
      npcs: mockNpcs,
      bossFaction: 'villains',
      victoriousFaction: 'heroes',
      eventPosition: { x: 0, y: 0 },
      tick: 1000,
      sourceId: 'worldboss:frustinator',
    });
  }

  it('adds celebration resonance and faith boost to victorious faction NPCs', () => {
    const result = apply();
    const victor = mockNpcs[0];

    expect(result.celebration).toBe(1);
    expect(victor.memory?.resonanceFields).toHaveLength(1);
    expect(victor.memory?.resonanceFields?.[0]).toMatchObject({
      eventType: 'QUEST_COMPLETED_BOSS',
      sourceId: 'worldboss:frustinator',
      factionMood: 'celebration',
      createdAtTick: 1000,
      expiresAtTick: 7000,
    });
    expect(victor.traits?.faith).toBeGreaterThan(0.5);
    expect(victor.traits?.aggression).toBeLessThan(0.5);
  });

  it('adds mourning resonance and aggression boost to defeated boss faction NPCs', () => {
    const result = apply();
    const loser = mockNpcs[1];

    expect(result.mourning).toBe(1);
    expect(loser.memory?.resonanceFields?.[0].factionMood).toBe('mourning');
    expect(loser.traits?.faith).toBeLessThan(0.5);
    expect(loser.traits?.aggression).toBeGreaterThan(0.5);
  });

  it('ignores NPCs outside the resonance radius', () => {
    apply();
    const farAway = mockNpcs[2];

    expect(farAway.memory?.resonanceFields).toBeUndefined();
    expect(farAway.traits?.faith).toBe(0.5);
    expect(farAway.traits?.aggression).toBe(0.5);
  });

  it('clamps traits between zero and one', () => {
    mockNpcs[0].traits!.faith = 0.95;
    broadcaster.applyBossQuestCompleted({
      npcs: mockNpcs,
      bossFaction: 'villains',
      victoriousFaction: 'heroes',
      eventPosition: { x: 10, y: 10 },
      tick: 1000,
      sourceId: 'worldboss:frustinator',
    });

    expect(mockNpcs[0].traits?.faith).toBe(1);
  });

  it('prunes expired resonance fields and caps stored field count', () => {
    const capped = new NPCFactionMoodBroadcaster({ maxStoredFields: 2, fieldLifetimeTicks: 10 });
    const npc: NPCFactionMoodTarget = {
      id: 'npc-memory',
      factionId: 'heroes',
      position: { x: 0, y: 0 },
      traits: { faith: 0.5, aggression: 0.5, curiosity: 0.5 },
      memory: {
        resonanceFields: [
          { eventType: 'QUEST_COMPLETED_BOSS', sourceId: 'old', factionMood: 'celebration', intensity: 1, createdAtTick: 1, expiresAtTick: 5 },
        ],
      },
    };

    for (let tick = 10; tick < 13; tick += 1) {
      capped.applyBossQuestCompleted({
        npcs: [npc],
        bossFaction: 'villains',
        victoriousFaction: 'heroes',
        eventPosition: { x: 0, y: 0 },
        tick,
        sourceId: `worldboss:${tick}`,
      });
    }

    expect(npc.memory?.resonanceFields).toHaveLength(2);
    expect(npc.memory?.resonanceFields?.map((field) => field.sourceId)).toEqual(['worldboss:11', 'worldboss:12']);
  });
});
