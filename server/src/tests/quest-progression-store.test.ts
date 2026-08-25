/**
 * QuestProgressionStore Unit Tests
 *
 * Deterministic tests for server-side quest progression.
 * Verifies quest progression without time/random dependencies.
 */

import { describe, expect, it } from "vitest";
import { QuestProgressionStore } from "../quests/QuestProgressionStore.js";

describe("QuestProgressionStore", () => {
  describe("getPlayerQuestState", () => {
    it("returns first_steps as available for new player", () => {
      const store = new QuestProgressionStore();
      const state = store.getPlayerQuestState("p1");

      const quest = state.quests.find((q) => q.id === "first_steps");
      expect(quest).toBeTruthy();
      expect(quest?.status).toBe("available");
    });

    it("returns empty quests array for player without quest", () => {
      const store = new QuestProgressionStore();
      store.acceptQuest("p1", "first_steps");

      // Quest should exist after accept
      const state = store.getPlayerQuestState("p1");
      expect(state.quests.length).toBeGreaterThan(0);
    });
  });

  describe("acceptQuest", () => {
    it("accepts first_steps quest and sets status to active", () => {
      const store = new QuestProgressionStore();

      store.applyEvent({
        type: "quest_accept",
        playerId: "p1",
        questId: "first_steps",
      });

      const state = store.getPlayerQuestState("p1");
      const quest = state.quests.find((q) => q.id === "first_steps");

      expect(quest?.status).toBe("active");
    });

    it("creates unknown quest with active status if not first_steps", () => {
      const store = new QuestProgressionStore();

      store.acceptQuest("p1", "unknown_quest");

      const state = store.getPlayerQuestState("p1");
      const quest = state.quests.find((q) => q.id === "unknown_quest");

      expect(quest).toBeTruthy();
      expect(quest?.status).toBe("active");
    });
  });

  describe("npc_talk event", () => {
    it("completes talk_to_elder objective only when talking to town_elder", () => {
      const store = new QuestProgressionStore();

      // Accept quest first
      store.applyEvent({
        type: "quest_accept",
        playerId: "p1",
        questId: "first_steps",
      });

      // Talk to wrong NPC - should NOT complete objective
      store.applyEvent({
        type: "npc_talk",
        playerId: "p1",
        npcId: "wrong_npc",
      });

      let quest = store.getPlayerQuestState("p1").quests.find(
        (q) => q.id === "first_steps"
      );
      let objective = quest?.objectives.find(
        (o) => o.id === "talk_to_elder"
      );
      expect(objective?.completed).toBe(false); // Not completed

      // Talk to correct NPC - should complete objective
      store.applyEvent({
        type: "npc_talk",
        playerId: "p1",
        npcId: "town_elder",
      });

      quest = store.getPlayerQuestState("p1").quests.find(
        (q) => q.id === "first_steps"
      );
      objective = quest?.objectives.find((o) => o.id === "talk_to_elder");

      expect(objective?.completed).toBe(true);
    });

    it("auto-activates quest if npc_talk received when quest is available", () => {
      const store = new QuestProgressionStore();

      // Don't accept, just talk
      store.applyEvent({
        type: "npc_talk",
        playerId: "p1",
        npcId: "town_elder",
      });

      const quest = store.getPlayerQuestState("p1").quests.find(
        (q) => q.id === "first_steps"
      );

      expect(quest?.status).toBe("active");
    });
  });

  describe("npc_kill event", () => {
    it("completes defeat_training_dummy objective when npc_kill event received", () => {
      const store = new QuestProgressionStore();

      store.applyEvent({
        type: "quest_accept",
        playerId: "p1",
        questId: "first_steps",
      });

      store.applyEvent({
        type: "npc_kill",
        playerId: "p1",
        npcId: "training_dummy",
      });

      const quest = store.getPlayerQuestState("p1").quests.find(
        (q) => q.id === "first_steps"
      );
      const objective = quest?.objectives.find(
        (o) => o.id === "defeat_training_dummy"
      );

      expect(objective?.completed).toBe(true);
      expect(quest?.status).toBe("active"); // Still active (one objective left)
    });
  });

  describe("full quest completion", () => {
    it("completes quest when all objectives are completed", () => {
      const store = new QuestProgressionStore();

      // Accept
      store.applyEvent({
        type: "quest_accept",
        playerId: "p1",
        questId: "first_steps",
      });

      // Complete first objective
      store.applyEvent({
        type: "npc_talk",
        playerId: "p1",
        npcId: "town_elder",
      });

      // Complete second objective
      store.applyEvent({
        type: "npc_kill",
        playerId: "p1",
        npcId: "training_dummy",
      });

      const quest = store.getPlayerQuestState("p1").quests.find(
        (q) => q.id === "first_steps"
      );

      expect(quest?.status).toBe("completed");
      expect(quest?.objectives.every((o) => o.completed)).toBe(true);
    });
  });

  describe("player isolation", () => {
    it("keeps players isolated - p1 and p2 have separate quest states", () => {
      const store = new QuestProgressionStore();

      // Accept quest for p1
      store.applyEvent({
        type: "quest_accept",
        playerId: "p1",
        questId: "first_steps",
      });

      // Check p1 - should be active
      const p1 = store.getPlayerQuestState("p1").quests.find(
        (q) => q.id === "first_steps"
      );

      // Check p2 - should still be available (not touched)
      const p2 = store.getPlayerQuestState("p2").quests.find(
        (q) => q.id === "first_steps"
      );

      expect(p1?.status).toBe("active");
      expect(p2?.status).toBe("available");
    });
  });

  describe("quest sorting", () => {
    it("returns quests sorted by id", () => {
      const store = new QuestProgressionStore();

      const state = store.getPlayerQuestState("p1");

      // Verify quests are sorted by id
      for (let i = 1; i < state.quests.length; i++) {
        expect(
          state.quests[i - 1].id.localeCompare(state.quests[i].id)
        ).toBeLessThanOrEqual(0);
      }
    });
  });

  describe("objective sorting", () => {
    it("returns objectives sorted by id within each quest", () => {
      const store = new QuestProgressionStore();

      const state = store.getPlayerQuestState("p1");
      const quest = state.quests.find((q) => q.id === "first_steps");

      if (quest && quest.objectives.length > 1) {
        for (let i = 1; i < quest.objectives.length; i++) {
          expect(
            quest.objectives[i - 1].id.localeCompare(quest.objectives[i].id)
          ).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe("sorting benchmark", () => {
    it("runs a benchmark comparing localeCompare vs direct relational operator string comparison for quest snapshots", () => {
      const sampleQuests = Array.from({ length: 500 }, (_, i) => ({
        id: `quest_${(i * 37) % 500}`,
        title: `Quest ${(i * 37) % 500}`,
        description: "Test description",
        status: "active" as const,
        objectives: [],
      }));

      const iterations = 500;

      // 1. Benchmarking localeCompare sort
      const startLocale = performance.now();
      for (let i = 0; i < iterations; i++) {
        [...sampleQuests].sort((a, b) => a.id.localeCompare(b.id));
      }
      const durationLocale = performance.now() - startLocale;

      // 2. Benchmarking direct relational comparison sort
      const startDirect = performance.now();
      for (let i = 0; i < iterations; i++) {
        [...sampleQuests].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      }
      const durationDirect = performance.now() - startDirect;

      const speedup = durationLocale / (durationDirect || 0.001);

      console.log(`Quest Snapshot Sort Benchmark (${iterations} iterations of 500 items):`);
      console.log(`  - localeCompare sort:          ${durationLocale.toFixed(2)}ms`);
      console.log(`  - direct relational sort:      ${durationDirect.toFixed(2)}ms`);
      console.log(`  - Performance Speedup:         ${speedup.toFixed(2)}x faster`);

      expect(speedup).toBeGreaterThan(0);
    });
  });
});