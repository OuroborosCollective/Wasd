import { describe, it, expect, beforeEach } from "vitest";
import { QuestEngine } from "../modules/quest/QuestEngine.js";

describe("QuestEngine collect + sync", () => {
  let engine: QuestEngine;

  beforeEach(() => {
    engine = new QuestEngine();
  });

  it("checkCollectTurnInQuests removes items and completes quest", () => {
    const player: any = {
      quests: [
        {
          id: "q_collect",
          title: "Gather scrap",
          objectiveType: "collect",
          giverNpcId: "npc_3",
          targetNpcId: "npc_3",
          requiredItemId: "iron_scrap",
          requiredCount: 2,
          completed: false,
        },
      ],
      inventory: [
        { id: "iron_scrap", name: "Iron Scrap" },
        { id: "iron_scrap", name: "Iron Scrap" },
      ],
    };

    const rewards = engine.checkCollectTurnInQuests(player, "npc_3");
    expect(rewards.length).toBe(1);
    expect(player.quests[0].completed).toBe(true);
    expect(player.inventory.filter((i: any) => i.id === "iron_scrap").length).toBe(0);
  });

  it("getQuestSyncForClient reports collect progress", () => {
    const player: any = {
      quests: [
        {
          id: "q1",
          title: "Collect",
          objectiveType: "collect",
          requiredItemId: "iron_scrap",
          requiredCount: 3,
          completed: false,
        },
      ],
      inventory: [{ id: "iron_scrap" }],
    };
    const sync = engine.getQuestSyncForClient(player);
    expect(sync[0].progress).toBe(1);
    expect(sync[0].progressMax).toBe(3);
  });
});
