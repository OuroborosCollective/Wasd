import { beforeEach, describe, expect, it } from "vitest";
import { NpcQuestService } from "../quests/NpcQuestService";

const QUEST_ID = "village_supply_order_001";
const NPC_ID = "village_trader_001";

function completeObjectives(service: NpcQuestService, playerId: string): void {
  service.updateQuestProgress(playerId, "gather", "wood_log", 2);
  service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
  service.updateQuestProgress(playerId, "sell", "wood_plank", 1);
  service.updateTalkObjective(playerId, NPC_ID);
}

describe("NpcQuestService", () => {
  let service: NpcQuestService;

  beforeEach(() => {
    service = new NpcQuestService();
  });

  describe("read-only projections", () => {
    it("projects an available quest without creating player state", () => {
      const playerId = "read-only-player";
      expect(service.getAvailableQuests(playerId).map((quest) => quest.questId)).toEqual([QUEST_ID]);
      expect(service.getActiveQuests(playerId)).toEqual([]);
      expect(service.getCompletedQuestIds(playerId)).toEqual([]);
      expect(service.getNpcReputation(playerId, NPC_ID)).toBeNull();
      expect(service.exportPlayerState(playerId)).toEqual(expect.objectContaining({
        playerId,
        activeQuests: [],
        completedQuestIds: [],
        rewardClaimedQuestIds: [],
        reputations: [],
      }));
    });

    it("returns null for an unknown quest and unknown NPC reputation", () => {
      expect(service.getQuestProgress("player", "unknown_quest")).toBeNull();
      expect(service.getNpcReputation("player", "unknown_npc")).toBeNull();
    });
  });

  describe("acceptQuest", () => {
    it("accepts a valid quest and rejects duplicate acceptance", () => {
      const playerId = "accept-player";
      expect(service.acceptQuest(playerId, QUEST_ID)).toEqual(expect.objectContaining({ ok: true }));
      expect(service.getQuestProgress(playerId, QUEST_ID)?.state).toBe("active");
      expect(service.acceptQuest(playerId, QUEST_ID)).toEqual({
        ok: false,
        reason: "quest_already_active",
      });
    });

    it("rejects missing actor and unknown quest", () => {
      expect(service.acceptQuest("", QUEST_ID)).toEqual({ ok: false, reason: "missing_player" });
      expect(service.acceptQuest("player", "unknown_quest")).toEqual({ ok: false, reason: "missing_quest" });
    });
  });

  describe("objective progression", () => {
    it("matches gather, recipe-id craft, sell and talk events", () => {
      const playerId = "progress-player";
      service.acceptQuest(playerId, QUEST_ID);
      service.updateQuestProgress(playerId, "gather", "wood_log", 5);
      service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
      service.updateQuestProgress(playerId, "sell", "wood_plank", 1);

      let progress = service.getQuestProgress(playerId, QUEST_ID)!;
      expect(progress.objectives.map((objective) => [objective.objectiveId, objective.current])).toEqual([
        ["gather_wood_logs", 2],
        ["process_wood_plank", 1],
        ["sell_wood_plank", 1],
        ["return_to_mira", 0],
      ]);
      expect(progress.state).toBe("active");
      expect(service.getNpcDialogue(playerId, NPC_ID).dialogueState).not.toBe("quest_ready_to_complete");

      service.updateTalkObjective(playerId, NPC_ID);
      progress = service.getQuestProgress(playerId, QUEST_ID)!;
      expect(progress.state).toBe("ready_to_complete");
      expect(service.getNpcDialogue(playerId, NPC_ID).dialogueState).toBe("quest_ready_to_complete");
    });

    it("ignores nonmatching events without inventing progress", () => {
      const playerId = "nonmatching-player";
      service.acceptQuest(playerId, QUEST_ID);
      service.updateQuestProgress(playerId, "craft", "wood_plank", 1);
      service.updateTalkObjective(playerId, "unknown_npc");
      const progress = service.getQuestProgress(playerId, QUEST_ID)!;
      expect(progress.objectives.every((objective) => objective.current === 0)).toBe(true);
    });

    it("rejects a missing player actor", () => {
      expect(service.updateQuestProgress("", "gather", "wood_log", 1)).toEqual({
        ok: false,
        reason: "missing_player",
      });
      expect(service.updateTalkObjective("", NPC_ID)).toEqual({
        ok: false,
        reason: "missing_player",
      });
    });
  });

  describe("dialogue state", () => {
    it("advances only from recorded objective state", () => {
      const playerId = "dialogue-player";
      expect(service.getNpcDialogue(playerId, NPC_ID).dialogueState).toBe("quest_available");
      service.acceptQuest(playerId, QUEST_ID);
      expect(service.getNpcDialogue(playerId, NPC_ID).dialogueState).toBe("quest_active_missing_wood");
      service.updateQuestProgress(playerId, "gather", "wood_log", 2);
      expect(service.getNpcDialogue(playerId, NPC_ID).dialogueState).toBe("quest_active_ready_to_process");
      service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
      expect(service.getNpcDialogue(playerId, NPC_ID).dialogueState).toBe("quest_active_ready_to_sell");
      service.updateQuestProgress(playerId, "sell", "wood_plank", 1);
      expect(service.getNpcDialogue(playerId, NPC_ID).dialogueState).toBe("quest_active_ready_to_sell");
      service.updateTalkObjective(playerId, NPC_ID);
      expect(service.getNpcDialogue(playerId, NPC_ID).dialogueState).toBe("quest_ready_to_complete");
    });
  });

  describe("completion and persistence", () => {
    it("requires every objective and records completion/reputation once", () => {
      const playerId = "complete-player";
      service.acceptQuest(playerId, QUEST_ID);
      expect(service.completeQuest(playerId, QUEST_ID)).toEqual({
        ok: false,
        reason: "objective_not_complete",
      });
      completeObjectives(service, playerId);
      const completed = service.completeQuest(playerId, QUEST_ID);
      expect(completed).toEqual(expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          reward: expect.objectContaining({ coins: 10, gatheringXp: 25, craftingXp: 25, reputation: 1 }),
          reputation: expect.objectContaining({ reputation: 1 }),
        }),
      }));
      expect(service.getQuestProgress(playerId, QUEST_ID)?.state).toBe("completed");
      expect(service.getNpcDialogue(playerId, NPC_ID).dialogueState).toBe("quest_completed");
      expect(service.completeQuest(playerId, QUEST_ID)).toEqual({
        ok: false,
        reason: "quest_not_available",
      });
    });

    it("exports and restores active and completed state", () => {
      const activePlayer = "persist-active";
      service.acceptQuest(activePlayer, QUEST_ID);
      service.updateQuestProgress(activePlayer, "gather", "wood_log", 1);
      const activeState = service.exportPlayerState(activePlayer);

      const restoredActive = new NpcQuestService();
      restoredActive.restorePlayerState(activeState);
      expect(restoredActive.getQuestProgress(activePlayer, QUEST_ID)).toEqual(
        service.getQuestProgress(activePlayer, QUEST_ID),
      );

      const completePlayer = "persist-complete";
      service.acceptQuest(completePlayer, QUEST_ID);
      completeObjectives(service, completePlayer);
      service.completeQuest(completePlayer, QUEST_ID);
      const restoredComplete = new NpcQuestService();
      restoredComplete.restorePlayerState(service.exportPlayerState(completePlayer));
      expect(restoredComplete.getQuestProgress(completePlayer, QUEST_ID)?.state).toBe("completed");
      expect(restoredComplete.getNpcReputation(completePlayer, NPC_ID)?.reputation).toBe(1);
    });
  });

  describe("QuestSnapshot projection", () => {
    it("keeps ready-to-complete active until persisted completion", () => {
      const playerId = "projection-player";
      service.acceptQuest(playerId, QUEST_ID);
      completeObjectives(service, playerId);
      expect(service.toQuestSnapshots(playerId).find((quest) => quest.id === QUEST_ID)?.status).toBe("active");
      service.completeQuest(playerId, QUEST_ID);
      expect(service.toQuestSnapshots(playerId).find((quest) => quest.id === QUEST_ID)?.status).toBe("completed");
    });
  });

  describe("sorting & performance", () => {
    it("verifies relational string comparison produces identical sort output to localeCompare for quest sorting", () => {
      const sampleQuests = Array.from({ length: 500 }, (_, i) => ({
        questId: `quest_id_${(i * 37) % 500}`,
        npcId: `npc_id_${(i * 13) % 100}`,
      }));

      // Verify identical sorting output
      const sortedLocale = [...sampleQuests].sort((a, b) => a.questId.localeCompare(b.questId));
      const sortedRelational = [...sampleQuests].sort((a, b) => (a.questId < b.questId ? -1 : a.questId > b.questId ? 1 : 0));
      expect(sortedRelational).toEqual(sortedLocale);
    });
  });
});
