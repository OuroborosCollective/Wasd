import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { QuestRewards } from "../modules/quests/QuestRewards.js";
import { QuestStateStore } from "../modules/quests/QuestStateStore.js";
import { QuestEngine } from "../modules/quest/QuestEngine.js";
import { resetContentDataRootCache } from "../modules/content/contentDataRoot.js";

const ORIGINAL_CONTENT_PACK_DIR = process.env.CONTENT_PACK_DIR;
const ORIGINAL_CONTENT_RESOLVER_CACHE = process.env.CONTENT_RESOLVER_CACHE;

function restoreContentEnv() {
  if (ORIGINAL_CONTENT_PACK_DIR === undefined) {
    delete process.env.CONTENT_PACK_DIR;
  } else {
    process.env.CONTENT_PACK_DIR = ORIGINAL_CONTENT_PACK_DIR;
  }

  if (ORIGINAL_CONTENT_RESOLVER_CACHE === undefined) {
    delete process.env.CONTENT_RESOLVER_CACHE;
  } else {
    process.env.CONTENT_RESOLVER_CACHE = ORIGINAL_CONTENT_RESOLVER_CACHE;
  }

  resetContentDataRootCache();
}

function createQuestContentPack(files: Record<string, unknown[]>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "quest-engine-pack-"));
  const questDir = path.join(root, "quests");
  fs.mkdirSync(questDir, { recursive: true });
  fs.writeFileSync(path.join(root, "content-pack-manifest.json"), JSON.stringify({ id: "test-pack" }), "utf-8");

  for (const [fileName, quests] of Object.entries(files)) {
    fs.writeFileSync(path.join(questDir, fileName), JSON.stringify(quests, null, 2), "utf-8");
  }

  process.env.CONTENT_PACK_DIR = root;
  process.env.CONTENT_RESOLVER_CACHE = "0";
  resetContentDataRootCache();

  return root;
}

// ---------------------------------------------------------------------------
// QuestRewards
// ---------------------------------------------------------------------------
describe("QuestRewards", () => {
  let rewards: QuestRewards;

  beforeEach(() => { rewards = new QuestRewards(); });

  it("grant() adds a reward to a player that has no rewards array", () => {
    const player: any = {};
    rewards.grant(player, { type: "gold", amount: 100 });
    expect(player.rewards).toHaveLength(1);
  });

  it("grant() returns the reward object", () => {
    const reward = { type: "xp", amount: 500 };
    const result = rewards.grant({}, reward);
    expect(result).toEqual(reward);
  });

  it("grant() pushes onto an existing rewards array", () => {
    const player: any = { rewards: [{ type: "item", id: "potion" }] };
    rewards.grant(player, { type: "gold", amount: 50 });
    expect(player.rewards).toHaveLength(2);
  });

  it("grant() preserves previously granted rewards", () => {
    const player: any = {};
    rewards.grant(player, { type: "xp", amount: 100 });
    rewards.grant(player, { type: "gold", amount: 50 });
    expect(player.rewards[0]).toEqual({ type: "xp", amount: 100 });
    expect(player.rewards[1]).toEqual({ type: "gold", amount: 50 });
  });
});

// ---------------------------------------------------------------------------
// QuestStateStore
// ---------------------------------------------------------------------------
describe("QuestStateStore", () => {
  let store: QuestStateStore;

  beforeEach(() => { store = new QuestStateStore(); });

  it("list() returns empty array for unknown player", () => {
    expect(store.list("nobody")).toEqual([]);
  });

  it("add() inserts a quest for a player", () => {
    store.add("p1", { id: "find_herb", completed: false });
    expect(store.list("p1")).toHaveLength(1);
  });

  it("list() returns the correct quest", () => {
    const quest = { id: "slay_dragon", completed: false };
    store.add("p1", quest);
    expect(store.list("p1")[0]).toEqual(quest);
  });

  it("multiple quests can be added for the same player", () => {
    store.add("p1", { id: "q1" });
    store.add("p1", { id: "q2" });
    store.add("p1", { id: "q3" });
    expect(store.list("p1")).toHaveLength(3);
  });

  it("quests are isolated per player", () => {
    store.add("p1", { id: "q1" });
    store.add("p2", { id: "q2" });
    expect(store.list("p1")).toHaveLength(1);
    expect(store.list("p2")).toHaveLength(1);
    expect(store.list("p1")[0].id).toBe("q1");
  });
});

// ---------------------------------------------------------------------------
// QuestEngine
// ---------------------------------------------------------------------------

describe("QuestEngine", () => {
  let engine: QuestEngine;

  beforeEach(() => {
    restoreContentEnv();
    engine = new QuestEngine();
  });

  afterEach(() => {
    restoreContentEnv();
  });

  describe("addQuest", () => {
    it("assigns 'custom' objective when quest definition lacks objectives", () => {
      const questDef = {
        id: "test_quest_no_obj",
        title: "Test Quest",
        giverNpc: "npc_1",
      };

      engine.addQuest(questDef);

      const quests = engine.getQuestDefinitions();
      const addedQuest = quests.get("test_quest_no_obj");

      expect(addedQuest).toBeDefined();
      expect(addedQuest.objective).toBe("custom");
    });

    it("extracts objective type from the first objective when present", () => {
      const questDef = {
        id: "test_quest_with_obj",
        title: "Test Quest with Obj",
        giverNpc: "npc_2",
        objectives: [
          { type: "gather", item: "wood", amount: 10 }
        ]
      };

      engine.addQuest(questDef);

      const quests = engine.getQuestDefinitions();
      const addedQuest = quests.get("test_quest_with_obj");

      expect(addedQuest).toBeDefined();
      expect(addedQuest.objective).toBe("gather");
    });
  });

  describe("quest game-data loading", () => {
    it("loads resource expansion quests from additive quest game-data", () => {
      const quests = engine.getQuestDefinitions();

      expect(quests.get("starter_welcome")?.title).toBe("Welcome to Millbrook");
      expect(quests.get("wood_delivery_001")?.title).toBe("Wood Delivery");
      expect(quests.get("plank_delivery_001")?.requiredItemId).toBe("wood_plank");
    });

    it("keeps merged quest order deterministic", () => {
      const ids = [...engine.getQuestDefinitions().keys()];
      const sortedIds = [...ids].sort((a, b) => a.localeCompare(b));

      expect(ids).toEqual(sortedIds);
    });

    it("rejects duplicate quest ids across quest game-data files", () => {
      createQuestContentPack({
        "quests.json": [
          { id: "duplicate_resource_quest", title: "Base Quest", objectiveType: "talk_to", targetNpcId: "npc_1" },
        ],
        "resource-expansion-quests.json": [
          { id: "duplicate_resource_quest", title: "Resource Quest", objectiveType: "collect", requiredItemId: "wood_log" },
        ],
      });

      expect(() => new QuestEngine()).toThrow(/Duplicate quest id in quest game-data: duplicate_resource_quest/);
    });

    it("advances resource quest progress through real collect turn-in events", () => {
      const player: any = {
        id: "resource-player-001",
        quests: [
          { id: "starter_welcome", completed: true },
        ],
        inventory: [
          { id: "wood_log", quantity: 5 },
        ],
      };

      const started = engine.startQuest(player, "wood_delivery_001");
      expect(started).toBeDefined();

      expect(engine.getQuestSyncForClient(player)).toContainEqual(expect.objectContaining({
        id: "wood_delivery_001",
        objectiveType: "collect",
        progress: 5,
        progressMax: 5,
      }));

      const completed = engine.checkCollectTurnInQuests(player, "npc_2");

      expect(completed).toHaveLength(1);
      expect(completed[0].quest.id).toBe("wood_delivery_001");
      expect(player.quests.find((q: any) => q.id === "wood_delivery_001")?.completed).toBe(true);
      expect(engine.countItemInInventory(player, "wood_log")).toBe(0);
      expect(player.gold).toBe(75);
      expect(player.xp).toBe(125);
    });
  });
});
