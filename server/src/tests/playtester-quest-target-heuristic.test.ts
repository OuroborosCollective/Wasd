// @ts-nocheck
import { describe, expect, it, vi } from "vitest";
import { AutonomousPlaytester } from "../modules/playtester/AutonomousPlaytester.js";

type TestPlayer = {
  id: string;
  position: { x: number; y: number };
  inventory?: Array<{ id: string; quantity?: number }>;
  quests?: any[];
};

function createBaseDeps(player: TestPlayer, npcs: any[]) {
  const sendToSyntheticSocket = vi.fn(async () => {});
  const checkTalkToQuests = vi.fn(() => []);
  const checkCollectTurnInQuests = vi.fn(() => []);
  const deps = {
    isSocketBound: () => true,
    bindSocketToPlayer: () => {},
    getOrCreatePlayer: () => player,
    ensurePlayerDefaults: () => {},
    applySpawnToPlayer: () => ({
      sceneId: "didis_hub",
      spawnKey: "sp_player_default",
      spawnPoint: { x: 0, y: 0, z: 0 },
    }),
    updateObserverPosition: () => {},
    processSceneTriggers: () => {},
    getChunkId: () => "0:0",
    getAllNpcs: () => npcs,
    getAllPlayers: () => [],
    getLootEntities: () => new Map<string, any>(),
    getWorldObjects: () => [],
    getQuestDefinitions: () => new Map<string, any>(),
    getQuestSyncForClient: () => player.quests ?? [],
    startQuest: () => null,
    checkTalkToQuests,
    checkCollectTurnInQuests,
    updateCombatQuests: () => [],
    sendToSyntheticSocket,
  };
  return {
    deps,
    sendToSyntheticSocket,
    checkTalkToQuests,
    checkCollectTurnInQuests,
  };
}

describe("AutonomousPlaytester quest target heuristic", () => {
  it("selects nearest talk_to quest NPC instead of first quest order", async () => {
    const player: TestPlayer = {
      id: "playtester_001",
      position: { x: 0, y: 0 },
      quests: [
        {
          id: "quest_far",
          objectiveType: "talk_to",
          targetNpcId: "npc_far",
          completed: false,
          progress: 0,
        },
        {
          id: "quest_near",
          objectiveType: "talk_to",
          targetNpcId: "npc_near",
          completed: false,
          progress: 0,
        },
      ],
    };
    const npcs = [
      { id: "npc_far", position: { x: 40, y: 40 } },
      { id: "npc_near", position: { x: 2, y: 1 } },
    ];
    const {
      deps,
      sendToSyntheticSocket,
      checkTalkToQuests,
      checkCollectTurnInQuests,
    } = createBaseDeps(player, npcs);
    const playtester = new AutonomousPlaytester(deps as any);

    await (playtester as any).executeDecision(
      "return_to_quest_target",
      Date.now(),
      player,
    );

    expect(sendToSyntheticSocket).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ type: "interact", npcId: "npc_near" }),
    );
    expect(checkTalkToQuests).toHaveBeenCalledWith(player, "npc_near");
    expect(checkCollectTurnInQuests).toHaveBeenCalledWith(player, "npc_near");
  });

  it("for collect objective prefers turn-in NPC for ready quest independent of order", async () => {
    const player: TestPlayer = {
      id: "playtester_001",
      position: { x: 0, y: 0 },
      inventory: [{ id: "item_ready", quantity: 1 }],
      quests: [
        {
          id: "collect_not_ready",
          objectiveType: "collect",
          targetNpcId: "npc_far",
          requiredItemId: "item_missing",
          requiredCount: 1,
          completed: false,
          progress: 0,
        },
        {
          id: "collect_ready",
          objectiveType: "collect",
          targetNpcId: "npc_near",
          requiredItemId: "item_ready",
          requiredCount: 1,
          completed: false,
          progress: 0,
        },
      ],
    };
    const npcs = [
      { id: "npc_far", position: { x: 60, y: 30 } },
      { id: "npc_near", position: { x: 2, y: 1 } },
    ];
    const { deps, sendToSyntheticSocket, checkCollectTurnInQuests } =
      createBaseDeps(player, npcs);
    const playtester = new AutonomousPlaytester(deps as any);

    await (playtester as any).executeDecision(
      "collect_required_item",
      Date.now(),
      player,
    );

    expect(sendToSyntheticSocket).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ type: "interact", npcId: "npc_near" }),
    );
    expect(checkCollectTurnInQuests).toHaveBeenCalledWith(player, "npc_near");
  });
});
