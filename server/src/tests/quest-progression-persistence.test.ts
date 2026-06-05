/**
 * Quest Progression Store Persistence Integration Tests
 *
 * Tests that QuestProgressionStore correctly persists and restores
 * quest state through the JsonQuestPersistenceAdapter.
 */

import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { QuestProgressionStore } from "../quests/QuestProgressionStore.js";
import { JsonQuestPersistenceAdapter } from "../quests/JsonQuestPersistenceAdapter.js";

let tempDir: string;
let testFilePath: string;

beforeEach(async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "wasd-quest-integration-"));
  tempDir = dir;
  testFilePath = path.join(dir, "quest-state.json");
});

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("QuestProgressionStore persistence", () => {
  describe("hydratePlayer", () => {
    it("loads persisted state for player", async () => {
      const adapter = new JsonQuestPersistenceAdapter(testFilePath);
      const storeA = new QuestProgressionStore(adapter);

      // Setup state
      storeA.applyEvent({
        type: "quest_accept",
        playerId: "p1",
        questId: "first_steps",
      });

      // Flush to persistence
      await storeA.flushPlayerForTests("p1");

      // Create new store with same adapter
      const storeB = new QuestProgressionStore(new JsonQuestPersistenceAdapter(testFilePath));
      await storeB.hydratePlayer("p1");

      const quest = storeB.getPlayerQuestState("p1").quests.find((q) => q.id === "first_steps");
      expect(quest?.status).toBe("active");
    });

    it("returns default state for non-hydrated player", async () => {
      const adapter = new JsonQuestPersistenceAdapter(testFilePath);
      const store = new QuestProgressionStore(adapter);

      const state = store.getPlayerQuestState("new-player");

      expect(state.quests.find((q) => q.id === "first_steps")?.status).toBe("available");
    });

    it("only hydrates once per playerId", async () => {
      const adapter = new JsonQuestPersistenceAdapter(testFilePath);
      const store = new QuestProgressionStore(adapter);

      await store.hydratePlayer("p1");
      await store.hydratePlayer("p1"); // Second call should be no-op

      // Should still work
      const state = store.getPlayerQuestState("p1");
      expect(state.playerId).toBe("p1");
    });
  });

  describe("applyEvent with persistence", () => {
    it("restores accepted and progressed quest state after restart", async () => {
      const adapter = new JsonQuestPersistenceAdapter(testFilePath);
      const storeA = new QuestProgressionStore(adapter);

      storeA.applyEvent({
        type: "quest_accept",
        playerId: "p1",
        questId: "first_steps",
      });

      storeA.applyEvent({
        type: "npc_talk",
        playerId: "p1",
        npcId: "town_elder",
      });

      // Flush to ensure persistence
      await storeA.flushPlayerForTests("p1");

      // Create new store instance
      const storeB = new QuestProgressionStore(new JsonQuestPersistenceAdapter(testFilePath));
      await storeB.hydratePlayer("p1");

      const quest = storeB.getPlayerQuestState("p1").quests.find((q) => q.id === "first_steps");
      const objective = quest?.objectives.find((o) => o.id === "talk_to_elder");

      expect(quest?.status).toBe("active");
      expect(objective?.completed).toBe(true);
    });

    it("restores fully completed quest state", async () => {
      const adapter = new JsonQuestPersistenceAdapter(testFilePath);
      const storeA = new QuestProgressionStore(adapter);

      storeA.applyEvent({
        type: "quest_accept",
        playerId: "p1",
        questId: "first_steps",
      });

      storeA.applyEvent({
        type: "npc_talk",
        playerId: "p1",
        npcId: "town_elder",
      });

      storeA.applyEvent({
        type: "npc_kill",
        playerId: "p1",
        npcId: "training_dummy",
      });

      await storeA.flushPlayerForTests("p1");

      const storeB = new QuestProgressionStore(new JsonQuestPersistenceAdapter(testFilePath));
      await storeB.hydratePlayer("p1");

      const quest = storeB.getPlayerQuestState("p1").quests.find((q) => q.id === "first_steps");

      expect(quest?.status).toBe("completed");
      expect(quest?.objectives.every((o) => o.completed)).toBe(true);
    });

    it("preserves player isolation across restarts", async () => {
      const adapter = new JsonQuestPersistenceAdapter(testFilePath);
      const storeA = new QuestProgressionStore(adapter);

      // Set up player A with completed quest
      storeA.applyEvent({
        type: "quest_accept",
        playerId: "player_a",
        questId: "first_steps",
      });

      storeA.applyEvent({
        type: "npc_talk",
        playerId: "player_a",
        npcId: "town_elder",
      });

      storeA.applyEvent({
        type: "npc_kill",
        playerId: "player_a",
        npcId: "training_dummy",
      });

      // Set up player B with only acceptance
      storeA.applyEvent({
        type: "quest_accept",
        playerId: "player_b",
        questId: "first_steps",
      });

      await storeA.flushPlayerForTests("player_a");
      await storeA.flushPlayerForTests("player_b");

      const storeB = new QuestProgressionStore(new JsonQuestPersistenceAdapter(testFilePath));
      await storeB.hydratePlayer("player_a");
      await storeB.hydratePlayer("player_b");

      const questA = storeB.getPlayerQuestState("player_a").quests.find((q) => q.id === "first_steps");
      const questB = storeB.getPlayerQuestState("player_b").quests.find((q) => q.id === "first_steps");

      expect(questA?.status).toBe("completed");
      expect(questB?.status).toBe("active");
    });
  });

  describe("store without adapter", () => {
    it("works without persistence adapter", () => {
      const store = new QuestProgressionStore();

      store.applyEvent({
        type: "quest_accept",
        playerId: "p1",
        questId: "first_steps",
      });

      const state = store.getPlayerQuestState("p1");
      expect(state.quests.find((q) => q.id === "first_steps")?.status).toBe("active");
    });

    it("hydratePlayer is no-op without adapter", async () => {
      const store = new QuestProgressionStore();

      await store.hydratePlayer("p1"); // Should not throw

      const state = store.getPlayerQuestState("p1");
      expect(state.quests.find((q) => q.id === "first_steps")?.status).toBe("available");
    });
  });

  describe("determinism across stores", () => {
    it("produces identical state from same events", async () => {
      const adapter1 = new JsonQuestPersistenceAdapter(testFilePath);
      const store1 = new QuestProgressionStore(adapter1);

      store1.applyEvent({
        type: "quest_accept",
        playerId: "p1",
        questId: "first_steps",
      });

      store1.applyEvent({
        type: "npc_talk",
        playerId: "p1",
        npcId: "town_elder",
      });

      await store1.flushPlayerForTests("p1");

      // Second store from same file
      const adapter2 = new JsonQuestPersistenceAdapter(testFilePath);
      const store2 = new QuestProgressionStore(adapter2);
      await store2.hydratePlayer("p1");

      const state1 = store1.getPlayerQuestState("p1");
      const state2 = store2.getPlayerQuestState("p1");

      // Compare as JSON for deep equality
      expect(JSON.stringify(state1)).toBe(JSON.stringify(state2));
    });
  });
});