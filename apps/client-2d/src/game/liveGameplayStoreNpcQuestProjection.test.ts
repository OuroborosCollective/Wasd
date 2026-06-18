import { describe, expect, it } from 'vitest';
import { LiveGameplayStore } from './liveGameplayStore';

describe('LiveGameplayStore NPC quest projection', () => {
  it('projects live-gameplay-snapshot quest progress into the visible quest journal stream', () => {
    const store = new LiveGameplayStore();

    store.setSnapshot({
      schemaVersion: 'live-gameplay-snapshot.v1',
      playerId: 'player_quest_projection',
      logicalIndex: 77,
      inventory: [],
      equipment: [],
      skills: [],
      resourceNodes: [],
      wallet: { coin: 0 },
      activeQuests: [
        {
          questId: 'village_supply_order_001',
          title: "Mira's First Supply Order",
          description: 'Gather, process, and deliver wood planks for Mira.',
          state: 'active',
          objectives: [
            {
              objectiveId: 'gather_wood_logs',
              title: 'Gather 2 Wood Logs',
              current: 1,
              required: 2,
              completed: false,
            },
          ],
        },
      ],
      availableQuests: [
        {
          questId: 'plank_delivery_001',
          title: 'Plank Delivery',
          description: 'Bring planks to the outpost.',
          state: 'available',
          objectives: [],
        },
      ],
      completedQuestIds: ['starter_welcome'],
      npcDialogues: [
        {
          npcId: 'village_trader_001',
          displayName: 'Mira the Quartermaster',
          dialogueState: 'quest_active_missing_wood',
          line: 'Still gathering wood logs?',
          availableQuestIds: ['plank_delivery_001'],
          activeQuestIds: ['village_supply_order_001'],
          completedQuestIds: ['starter_welcome'],
        },
      ],
      npcReputations: [],
      npcMemories: [],
      npcRumors: [],
      worldSurface: {
        schemaVersion: 'world-surface-model.v1',
        tick: 77,
        groups: [],
        points: [],
      },
    });

    const snapshot = store.getSnapshot();

    expect(snapshot.status).toBe('live');
    expect(snapshot.serverTick).toBe(77);
    expect(snapshot.activeQuests?.[0]?.questId).toBe('village_supply_order_001');
    expect(snapshot.npcDialogues?.[0]?.activeQuestIds).toEqual(['village_supply_order_001']);
    expect(snapshot.quests.map((quest) => quest.id)).toEqual([
      'plank_delivery_001',
      'starter_welcome',
      'village_supply_order_001',
    ]);
    expect(snapshot.quests.find((quest) => quest.id === 'village_supply_order_001')?.title).toBe("Mira's First Supply Order");
    expect(snapshot.quests.find((quest) => quest.id === 'village_supply_order_001')?.objectives[0]).toEqual({
      id: 'gather_wood_logs',
      label: 'Gather 2 Wood Logs',
      current: 1,
      required: 2,
      completed: false,
    });
  });

  it('merges composer quest progress into a legacy snapshot packet without dropping quest truth', () => {
    const store = new LiveGameplayStore();

    store.setSnapshot({
      snapshot: {
        status: 'live',
        quests: [],
        skills: [],
        resources: [],
      },
      liveGameplaySnapshot: {
        schemaVersion: 'live-gameplay-snapshot.v1',
        playerId: 'player_packet_projection',
        logicalIndex: 12,
        inventory: [],
        equipment: [],
        skills: [],
        resourceNodes: [],
        activeQuests: [
          {
            questId: 'village_supply_order_001',
            state: 'ready_to_complete',
            objectives: [
              {
                objectiveId: 'return_to_mira',
                title: 'Return to Mira',
                current: 1,
                required: 1,
                completed: true,
              },
            ],
          },
        ],
        availableQuests: [],
        completedQuestIds: [],
        npcDialogues: [],
        npcReputations: [],
        npcMemories: [],
        npcRumors: [],
      },
    });

    const snapshot = store.getSnapshot();
    const quest = snapshot.quests[0];

    expect(snapshot.activeQuests?.[0]?.state).toBe('ready_to_complete');
    expect(quest?.id).toBe('village_supply_order_001');
    expect(quest?.status).toBe('completed');
    expect(quest?.objectives[0]?.completed).toBe(true);
  });
});
