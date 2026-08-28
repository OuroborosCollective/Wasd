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

  it("benchmarks fast relational string comparison vs localeCompare for NPC quest sorting", () => {
    const sampleQuestIds: string[] = [];
    for (let i = 0; i < 500; i++) {
      sampleQuestIds.push(`quest_${(i * 37) % 500}_${i}`);
    }

    const iterations = 300;

    // 1. Benchmark localeCompare sorting
    const startLocale = performance.now();
    for (let i = 0; i < iterations; i++) {
      const copy = [...sampleQuestIds];
      copy.sort((a, b) => a.localeCompare(b));
    }
    const durationLocale = performance.now() - startLocale;

    // 2. Benchmark direct relational operator sorting
    const startDirect = performance.now();
    for (let i = 0; i < iterations; i++) {
      const copy = [...sampleQuestIds];
      copy.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    }
    const durationDirect = performance.now() - startDirect;

    const speedup = (durationLocale / Math.max(0.001, durationDirect)).toFixed(2);
    console.log(`\nNPC Quest Sort Benchmark (${iterations} iterations of ${sampleQuestIds.length} items):`);
    console.log(`  - localeCompare sort:          ${durationLocale.toFixed(2)}ms`);
    console.log(`  - direct relational sort:      ${durationDirect.toFixed(2)}ms`);
    console.log(`  - Performance Speedup:         ${speedup}x faster`);

    expect(durationDirect).toBeGreaterThan(0);
  });
});
