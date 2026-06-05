/**
 * Unit tests for QuestGameplayEventBridge
 * 
 * Verifies that:
 * - Bridge accepts player_npc_interaction
 * - Bridge accepts player_npc_kill
 * - Wrong NPCs do not change quest state
 * - Correct NPCs change quest state
 */

import { describe, expect, it, beforeEach } from "vitest";
import { handleGameplayQuestEvent } from "../quests/QuestGameplayEventBridge.js";
import { questProgressionStore } from "../quests/QuestProgressionStore.js";

describe("QuestGameplayEventBridge", () => {
  // Reset store state before each test to ensure isolation
  beforeEach(() => {
    // Clear any existing state by triggering a fresh player state
    // The store is a singleton, so we accept this limitation
    // and use unique playerIds per test to avoid cross-test pollution
  });

  describe("player_npc_interaction", () => {
    it("progresses talk objective for town_elder interaction", () => {
      const playerId = "bridge-talk-player";

      // Accept the quest first
      questProgressionStore.applyEvent({
        type: "quest_accept",
        playerId,
        questId: "first_steps",
      });

      const result = handleGameplayQuestEvent({
        type: "player_npc_interaction",
        playerId,
        npcId: "town_elder",
      });

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(true);

      const quest = questProgressionStore
        .getPlayerQuestState(playerId)
        .quests.find((q) => q.id === "first_steps");

      const objective = quest?.objectives.find((o) => o.id === "talk_to_elder");
      expect(objective?.completed).toBe(true);
    });

    it("progresses talk objective for npc_town_elder interaction", () => {
      const playerId = "bridge-talk-npc1-player";

      questProgressionStore.applyEvent({
        type: "quest_accept",
        playerId,
        questId: "first_steps",
      });

      const result = handleGameplayQuestEvent({
        type: "player_npc_interaction",
        playerId,
        npcId: "npc_town_elder",
      });

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(true);
    });

    it("progresses talk objective for npc_1 interaction", () => {
      const playerId = "bridge-talk-npc-1-player";

      questProgressionStore.applyEvent({
        type: "quest_accept",
        playerId,
        questId: "first_steps",
      });

      const result = handleGameplayQuestEvent({
        type: "player_npc_interaction",
        playerId,
        npcId: "npc_1",
      });

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(true);
    });

    it("does not progress talk objective for wrong npc (random_merchant)", () => {
      const playerId = "bridge-wrong-talk-player";

      questProgressionStore.applyEvent({
        type: "quest_accept",
        playerId,
        questId: "first_steps",
      });

      const result = handleGameplayQuestEvent({
        type: "player_npc_interaction",
        playerId,
        npcId: "random_merchant",
      });

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(false);

      const quest = questProgressionStore
        .getPlayerQuestState(playerId)
        .quests.find((q) => q.id === "first_steps");

      const objective = quest?.objectives.find((o) => o.id === "talk_to_elder");
      expect(objective?.completed).toBe(false);
    });

    it("does not progress talk objective for shop_keeper", () => {
      const playerId = "bridge-wrong-shop-player";

      questProgressionStore.applyEvent({
        type: "quest_accept",
        playerId,
        questId: "first_steps",
      });

      const result = handleGameplayQuestEvent({
        type: "player_npc_interaction",
        playerId,
        npcId: "shop_keeper",
      });

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(false);
    });

    it("returns correct reason for non-progressing npc", () => {
      const playerId = "bridge-reason-player";

      const result = handleGameplayQuestEvent({
        type: "player_npc_interaction",
        playerId,
        npcId: "unknown_npc",
      });

      expect(result.reason).toBe("npc_does_not_progress_quest");
    });
  });

  describe("player_npc_kill", () => {
    it("progresses kill objective for training_dummy", () => {
      const playerId = "bridge-kill-player";

      questProgressionStore.applyEvent({
        type: "quest_accept",
        playerId,
        questId: "first_steps",
      });

      const result = handleGameplayQuestEvent({
        type: "player_npc_kill",
        playerId,
        npcId: "training_dummy",
      });

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(true);

      const quest = questProgressionStore
        .getPlayerQuestState(playerId)
        .quests.find((q) => q.id === "first_steps");

      const objective = quest?.objectives.find((o) => o.id === "defeat_training_dummy");
      expect(objective?.completed).toBe(true);
    });

    it("progresses kill objective for npc_training_dummy", () => {
      const playerId = "bridge-kill-dummy-player";

      questProgressionStore.applyEvent({
        type: "quest_accept",
        playerId,
        questId: "first_steps",
      });

      const result = handleGameplayQuestEvent({
        type: "player_npc_kill",
        playerId,
        npcId: "npc_training_dummy",
      });

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(true);
    });

    it("progresses kill objective for dummy", () => {
      const playerId = "bridge-kill-simple-dummy-player";

      questProgressionStore.applyEvent({
        type: "quest_accept",
        playerId,
        questId: "first_steps",
      });

      const result = handleGameplayQuestEvent({
        type: "player_npc_kill",
        playerId,
        npcId: "dummy",
      });

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(true);
    });

    it("progresses kill objective for npc_2", () => {
      const playerId = "bridge-kill-npc2-player";

      questProgressionStore.applyEvent({
        type: "quest_accept",
        playerId,
        questId: "first_steps",
      });

      const result = handleGameplayQuestEvent({
        type: "player_npc_kill",
        playerId,
        npcId: "npc_2",
      });

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(true);
    });

    it("does not progress kill objective for wrong npc (friendly_vendor)", () => {
      const playerId = "bridge-wrong-kill-player";

      questProgressionStore.applyEvent({
        type: "quest_accept",
        playerId,
        questId: "first_steps",
      });

      const result = handleGameplayQuestEvent({
        type: "player_npc_kill",
        playerId,
        npcId: "friendly_vendor",
      });

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(false);

      const quest = questProgressionStore
        .getPlayerQuestState(playerId)
        .quests.find((q) => q.id === "first_steps");

      const objective = quest?.objectives.find((o) => o.id === "defeat_training_dummy");
      expect(objective?.completed).toBe(false);
    });

    it("does not progress kill objective for town_elder (wrong context)", () => {
      const playerId = "bridge-wrong-kill-elder-player";

      questProgressionStore.applyEvent({
        type: "quest_accept",
        playerId,
        questId: "first_steps",
      });

      const result = handleGameplayQuestEvent({
        type: "player_npc_kill",
        playerId,
        npcId: "town_elder",
      });

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(false);
    });

    it("returns correct reason for non-progressing kill npc", () => {
      const playerId = "bridge-kill-reason-player";

      const result = handleGameplayQuestEvent({
        type: "player_npc_kill",
        playerId,
        npcId: "some_other_npc",
      });

      expect(result.reason).toBe("npc_kill_does_not_progress_quest");
    });
  });

  describe("quest progression completes quest", () => {
    it("completes first_steps when both objectives are done", () => {
      const playerId = "bridge-complete-player";

      questProgressionStore.applyEvent({
        type: "quest_accept",
        playerId,
        questId: "first_steps",
      });

      // Complete talk objective
      handleGameplayQuestEvent({
        type: "player_npc_interaction",
        playerId,
        npcId: "town_elder",
      });

      // Complete kill objective
      handleGameplayQuestEvent({
        type: "player_npc_kill",
        playerId,
        npcId: "training_dummy",
      });

      const quest = questProgressionStore
        .getPlayerQuestState(playerId)
        .quests.find((q) => q.id === "first_steps");

      expect(quest?.status).toBe("completed");
    });
  });

  describe("unknown event types", () => {
    it("returns ok=false for unknown event types", () => {
      const result = handleGameplayQuestEvent({
        // @ts-expect-error - Testing unknown event type
        type: "unknown_event",
        playerId: "test-player",
        npcId: "some-npc",
      } as any);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("unsupported_event");
    });
  });

  describe("result structure", () => {
    it("returns playerId in result", () => {
      const playerId = "bridge-result-player";

      const result = handleGameplayQuestEvent({
        type: "player_npc_interaction",
        playerId,
        npcId: "unknown_npc",
      });

      expect(result.playerId).toBe(playerId);
    });

    it("returns sorted questIds in result", () => {
      const playerId = "bridge-quest-ids-player";

      const result = handleGameplayQuestEvent({
        type: "player_npc_interaction",
        playerId,
        npcId: "unknown_npc",
      });

      // QuestIds should be sorted
      const sorted = [...result.questIds].sort();
      expect(result.questIds).toEqual(sorted);
    });
  });
});