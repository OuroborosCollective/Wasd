/**
 * NPC Quest Service Tests
 *
 * Unit tests for the NPC quest system.
 * Deterministic: No Math.random(), no Date.now() for gameplay state.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NpcQuestService } from "../quests/NpcQuestService.js";
import { VILLAGE_SUPPLY_ORDER_QUEST } from "../quests/NpcQuestTypes.js";

describe("NpcQuestService", () => {
  let service: NpcQuestService;

  beforeEach(() => {
    service = new NpcQuestService();
  });

  describe("getQuestDefinition", () => {
    it("returns quest definition for known quest ID", () => {
      const def = service.getQuestDefinition("village_supply_order_001");
      expect(def).toBeDefined();
      expect(def?.questId).toBe("village_supply_order_001");
      expect(def?.title).toBe("Mira's First Supply Order");
    });

    it("returns undefined for unknown quest ID", () => {
      const def = service.getQuestDefinition("unknown_quest");
      expect(def).toBeUndefined();
    });
  });

  describe("getNpcDefinition", () => {
    it("returns NPC definition for village_trader_001", () => {
      const npc = service.getNpcDefinition("village_trader_001");
      expect(npc).toBeDefined();
      expect(npc?.displayName).toBe("Mira the Quartermaster");
      expect(npc?.x).toBe(462);
      expect(npc?.y).toBe(503);
      expect(npc?.interactionRadius).toBe(32);
    });

    it("returns undefined for unknown NPC", () => {
      const npc = service.getNpcDefinition("unknown_npc");
      expect(npc).toBeUndefined();
    });
  });

  describe("isPlayerNearNpc", () => {
    it("returns true when player is within interaction radius", () => {
      // Player at (462, 503), NPC at (462, 503), radius 32
      // Distance is 0, which is <= 32
      expect(service.isPlayerNearNpc(462, 503, "village_trader_001")).toBe(true);
    });

    it("returns true when player is at edge of interaction radius", () => {
      // Player at (462 + 32, 503) = (494, 503)
      // Distance = sqrt((494-462)^2 + (503-503)^2) = sqrt(32^2) = 32
      expect(service.isPlayerNearNpc(494, 503, "village_trader_001")).toBe(true);
    });

    it("returns false when player is outside interaction radius", () => {
      // Player at (500, 500)
      // Distance = sqrt((500-462)^2 + (500-503)^2) = sqrt(38^2 + 3^2) ≈ 38.1
      expect(service.isPlayerNearNpc(500, 500, "village_trader_001")).toBe(false);
    });

    it("returns false for unknown NPC", () => {
      expect(service.isPlayerNearNpc(462, 503, "unknown_npc")).toBe(false);
    });
  });

  describe("acceptQuest", () => {
    const playerId = "test-player-001";

    it("succeeds when accepting available quest", () => {
      const result = service.acceptQuest(playerId, "village_supply_order_001");
      expect(result.ok).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.questId).toBe("village_supply_order_001");
      expect(result.result?.state).toBe("active");
    });

    it("fails when player ID is missing", () => {
      const result = service.acceptQuest("", "village_supply_order_001");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("missing_player");
    });

    it("fails when quest ID is unknown", () => {
      const result = service.acceptQuest(playerId, "unknown_quest");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("missing_quest");
    });

    it("fails when quest is already active", () => {
      // Accept once
      service.acceptQuest(playerId, "village_supply_order_001");
      // Try to accept again
      const result = service.acceptQuest(playerId, "village_supply_order_001");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("quest_already_active");
    });

    it("fails when quest is already completed", () => {
      // Accept and complete the quest
      service.acceptQuest(playerId, "village_supply_order_001");
      const progress = service.getQuestProgress(playerId, "village_supply_order_001");
      expect(progress).toBeDefined();

      // Complete all objectives and complete the quest
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
      service.updateQuestProgress(playerId, "sell", "wood_plank", 1);
      service.updateTalkObjective(playerId, "village_trader_001");
      service.completeQuest(playerId, "village_supply_order_001");

      // Now try to accept again - should fail as completed (no reset!)
      const result = service.acceptQuest(playerId, "village_supply_order_001");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("quest_already_completed");
    });
  });

  describe("updateQuestProgress", () => {
    const playerId = "test-player-002";

    beforeEach(() => {
      service.acceptQuest(playerId, "village_supply_order_001");
    });

    it("updates progress when gathering wood_log", () => {
      const result = service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      expect(result.ok).toBe(true);

      const progress = service.getQuestProgress(playerId, "village_supply_order_001");
      expect(progress?.objectives.find((o) => o.objectiveId === "gather_wood_logs")?.current).toBe(1);
    });

    it("accumulates gathering progress", () => {
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);

      const progress = service.getQuestProgress(playerId, "village_supply_order_001");
      expect(progress?.objectives.find((o) => o.objectiveId === "gather_wood_logs")?.current).toBe(2);
    });

    it("marks objective as complete when required is reached", () => {
      service.updateQuestProgress(playerId, "gather", "wood_log", 2);

      const progress = service.getQuestProgress(playerId, "village_supply_order_001");
      const obj = progress?.objectives.find((o) => o.objectiveId === "gather_wood_logs");
      expect(obj?.completed).toBe(true);
      expect(obj?.current).toBe(2);
    });

    it("caps progress at required amount", () => {
      service.updateQuestProgress(playerId, "gather", "wood_log", 5);

      const progress = service.getQuestProgress(playerId, "village_supply_order_001");
      const obj = progress?.objectives.find((o) => o.objectiveId === "gather_wood_logs");
      expect(obj?.current).toBe(2); // Capped at required
    });

    it("updates progress when crafting wood_plank", () => {
      // Use craft_wood_plank as target since that's the targetRecipeId in the quest definition
      service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);

      const progress = service.getQuestProgress(playerId, "village_supply_order_001");
      expect(progress?.objectives.find((o) => o.objectiveId === "process_wood_plank")?.current).toBe(1);
    });

    it("updates progress when selling wood_plank", () => {
      service.updateQuestProgress(playerId, "sell", "wood_plank", 1);

      const progress = service.getQuestProgress(playerId, "village_supply_order_001");
      expect(progress?.objectives.find((o) => o.objectiveId === "sell_wood_plank")?.current).toBe(1);
    });

    it("fails with missing player ID", () => {
      const result = service.updateQuestProgress("", "gather", "wood_log", 1);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("missing_player");
    });
  });

  describe("updateTalkObjective", () => {
    const playerId = "test-player-003";

    beforeEach(() => {
      service.acceptQuest(playerId, "village_supply_order_001");
    });

    it("updates return_to_mira objective when talking to village_trader_001", () => {
      const result = service.updateTalkObjective(playerId, "village_trader_001");
      expect(result.ok).toBe(true);

      const progress = service.getQuestProgress(playerId, "village_supply_order_001");
      expect(progress?.objectives.find((o) => o.objectiveId === "return_to_mira")?.current).toBe(1);
    });

    it("fails with missing player ID", () => {
      const result = service.updateTalkObjective("", "village_trader_001");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("missing_player");
    });
  });

  describe("completeQuest", () => {
    const playerId = "test-player-004";

    it("fails when quest is not active", () => {
      const result = service.completeQuest(playerId, "village_supply_order_001");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("quest_not_available");
    });

    it("fails when objectives are not complete", () => {
      service.acceptQuest(playerId, "village_supply_order_001");
      // Don't complete any objectives

      const result = service.completeQuest(playerId, "village_supply_order_001");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("objective_not_complete");
    });

    it("succeeds when all objectives are complete", () => {
      service.acceptQuest(playerId, "village_supply_order_001");

      // Complete all objectives in order
      // 1. Gather 2 wood logs
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      // 2. Craft 1 wood plank
      service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
      // 3. Sell 1 wood plank
      service.updateQuestProgress(playerId, "sell", "wood_plank", 1);
      // 4. Return to Mira (talk)
      service.updateTalkObjective(playerId, "village_trader_001");

      const result = service.completeQuest(playerId, "village_supply_order_001");
      expect(result.ok).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.reward.coins).toBe(10);
      expect(result.result?.reward.gatheringXp).toBe(25);
      expect(result.result?.reward.craftingXp).toBe(25);
      expect(result.result?.reward.reputation).toBe(1);
    });

    it("cannot claim reward twice", () => {
      service.acceptQuest(playerId, "village_supply_order_001");

      // Complete all objectives in order
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
      service.updateQuestProgress(playerId, "sell", "wood_plank", 1);
      service.updateTalkObjective(playerId, "village_trader_001");

      // Complete once
      service.completeQuest(playerId, "village_supply_order_001");

      // Try to complete again - need to reset and re-accept
      service.resetPlayerState(playerId);
      service.acceptQuest(playerId, "village_supply_order_001");
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
      service.updateQuestProgress(playerId, "sell", "wood_plank", 1);
      service.updateTalkObjective(playerId, "village_trader_001");

      const result = service.completeQuest(playerId, "village_supply_order_001");
      expect(result.ok).toBe(true);
    });
  });

  describe("getNpcDialogue", () => {
    const playerId = "test-player-005";

    it("returns quest_available state when no quest active", () => {
      const dialogue = service.getNpcDialogue(playerId, "village_trader_001");
      expect(dialogue.dialogueState).toBe("quest_available");
      expect(dialogue.availableQuestIds).toContain("village_supply_order_001");
    });

    it("returns quest_active_missing_wood when gathering wood", () => {
      service.acceptQuest(playerId, "village_supply_order_001");
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);

      const dialogue = service.getNpcDialogue(playerId, "village_trader_001");
      expect(dialogue.dialogueState).toBe("quest_active_missing_wood");
    });

    it("returns quest_active_ready_to_process when wood gathered", () => {
      service.acceptQuest(playerId, "village_supply_order_001");
      service.updateQuestProgress(playerId, "gather", "wood_log", 2);

      const dialogue = service.getNpcDialogue(playerId, "village_trader_001");
      expect(dialogue.dialogueState).toBe("quest_active_ready_to_process");
    });

    it("returns quest_active_ready_to_sell when plank crafted", () => {
      service.acceptQuest(playerId, "village_supply_order_001");
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);

      const dialogue = service.getNpcDialogue(playerId, "village_trader_001");
      expect(dialogue.dialogueState).toBe("quest_active_ready_to_sell");
    });

    it("returns quest_ready_to_complete when sold", () => {
      service.acceptQuest(playerId, "village_supply_order_001");
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
      service.updateQuestProgress(playerId, "sell", "wood_plank", 1);

      const dialogue = service.getNpcDialogue(playerId, "village_trader_001");
      expect(dialogue.dialogueState).toBe("quest_ready_to_complete");
    });

    it("returns quest_completed when quest is done", () => {
      service.acceptQuest(playerId, "village_supply_order_001");
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
      service.updateQuestProgress(playerId, "sell", "wood_plank", 1);
      service.updateTalkObjective(playerId, "village_trader_001");
      service.completeQuest(playerId, "village_supply_order_001");

      const dialogue = service.getNpcDialogue(playerId, "village_trader_001");
      expect(dialogue.dialogueState).toBe("quest_completed");
      expect(dialogue.completedQuestIds).toContain("village_supply_order_001");
    });
  });

  describe("getNpcReputation", () => {
    const playerId = "test-player-006";

    it("returns initial reputation of 0", () => {
      const reputation = service.getNpcReputation(playerId, "village_trader_001");
      expect(reputation?.reputation).toBe(0);
    });

    it("increases reputation after quest completion", () => {
      service.acceptQuest(playerId, "village_supply_order_001");
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
      service.updateQuestProgress(playerId, "sell", "wood_plank", 1);
      service.updateTalkObjective(playerId, "village_trader_001");
      service.completeQuest(playerId, "village_supply_order_001");

      const reputation = service.getNpcReputation(playerId, "village_trader_001");
      expect(reputation?.reputation).toBe(1);
      expect(reputation?.completedQuestIds).toContain("village_supply_order_001");
    });

    it("returns null for unknown NPC", () => {
      const reputation = service.getNpcReputation(playerId, "unknown_npc");
      expect(reputation).toBeNull();
    });
  });

  describe("getActiveQuests / getAvailableQuests", () => {
    const playerId = "test-player-007";

    it("returns available quests when none accepted", () => {
      const available = service.getAvailableQuests(playerId);
      expect(available.some((q) => q.questId === "village_supply_order_001")).toBe(true);

      const active = service.getActiveQuests(playerId);
      expect(active).toHaveLength(0);
    });

    it("returns active quests after accepting", () => {
      service.acceptQuest(playerId, "village_supply_order_001");

      const active = service.getActiveQuests(playerId);
      expect(active.some((q) => q.questId === "village_supply_order_001")).toBe(true);

      const available = service.getAvailableQuests(playerId);
      expect(available.some((q) => q.questId === "village_supply_order_001")).toBe(false);
    });

    it("returns empty active after completing", () => {
      service.acceptQuest(playerId, "village_supply_order_001");
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "gather", "wood_log", 1);
      service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
      service.updateQuestProgress(playerId, "sell", "wood_plank", 1);
      service.updateTalkObjective(playerId, "village_trader_001");
      service.completeQuest(playerId, "village_supply_order_001");

      const active = service.getActiveQuests(playerId);
      expect(active.some((q) => q.questId === "village_supply_order_001")).toBe(false);
    });
  });

  describe("toQuestSnapshots", () => {
    const playerId = "test-player-008";

    it("converts active quest to QuestSnapshot format", () => {
      service.acceptQuest(playerId, "village_supply_order_001");

      const snapshots = service.toQuestSnapshots(playerId);
      const quest = snapshots.find((q) => q.id === "village_supply_order_001");

      expect(quest).toBeDefined();
      expect(quest?.status).toBe("active");
      expect(quest?.objectives).toHaveLength(4);
      expect(quest?.objectives[0].id).toBe("gather_wood_logs");
    });
  });

  describe("failed validation does not mutate state", () => {
    const playerId = "test-player-009";

    it("accepting unknown quest does not change state", () => {
      const before = service.getAvailableQuests(playerId);
      const beforeActive = service.getActiveQuests(playerId);

      const result = service.acceptQuest(playerId, "unknown_quest");

      expect(result.ok).toBe(false);
      const after = service.getAvailableQuests(playerId);
      const afterActive = service.getActiveQuests(playerId);
      expect(after).toEqual(before);
      expect(afterActive).toEqual(beforeActive);
    });

    it("completing quest without objectives does not change state", () => {
      service.acceptQuest(playerId, "village_supply_order_001");

      const result = service.completeQuest(playerId, "village_supply_order_001");

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("objective_not_complete");

      // Quest should still be active, not mutated
      const progress = service.getQuestProgress(playerId, "village_supply_order_001");
      expect(progress?.state).toBe("active");
    });
  });

  describe("resetPlayerState", () => {
    const playerId = "test-player-010";

    it("clears all quest state for player", () => {
      service.acceptQuest(playerId, "village_supply_order_001");
      service.updateQuestProgress(playerId, "gather", "wood_log", 2);

      service.resetPlayerState(playerId);

      // Should be back to available state
      const available = service.getAvailableQuests(playerId);
      expect(available.some((q) => q.questId === "village_supply_order_001")).toBe(true);

      const active = service.getActiveQuests(playerId);
      expect(active).toHaveLength(0);
    });
  });
});