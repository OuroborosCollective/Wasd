import { describe, expect, it } from "vitest";
import { NpcQuestService } from "../../quests/NpcQuestService";

function completeInputs(service: NpcQuestService, playerId: string): void {
  service.updateQuestProgress(playerId, "gather", "wood_log", 2);
  service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
  service.updateQuestProgress(playerId, "sell", "wood_plank", 1);
  service.updateTalkObjective(playerId, "village_trader_001");
}

describe("NPC quest persistence truth", () => {
  it("restores active objective progress without replaying gameplay events", () => {
    const playerId = "npc-quest-persist-active";
    const first = new NpcQuestService();
    expect(first.acceptQuest(playerId, "village_supply_order_001").ok).toBe(true);
    first.updateQuestProgress(playerId, "gather", "wood_log", 1);

    const persisted = first.exportPlayerState(playerId);
    const restored = new NpcQuestService();
    restored.restorePlayerState(persisted);

    expect(restored.getQuestProgress(playerId, "village_supply_order_001")).toEqual(
      first.getQuestProgress(playerId, "village_supply_order_001"),
    );
  });

  it("does not call a sold order ready until the return objective is confirmed", () => {
    const playerId = "npc-quest-dialogue-return";
    const service = new NpcQuestService();
    service.acceptQuest(playerId, "village_supply_order_001");
    service.updateQuestProgress(playerId, "gather", "wood_log", 2);
    service.updateQuestProgress(playerId, "craft", "craft_wood_plank", 1);
    service.updateQuestProgress(playerId, "sell", "wood_plank", 1);

    expect(service.getQuestProgress(playerId, "village_supply_order_001")?.state).toBe("active");
    expect(service.getNpcDialogue(playerId, "village_trader_001").dialogueState).not.toBe("quest_ready_to_complete");

    service.updateTalkObjective(playerId, "village_trader_001");
    expect(service.getQuestProgress(playerId, "village_supply_order_001")?.state).toBe("ready_to_complete");
    expect(service.getNpcDialogue(playerId, "village_trader_001").dialogueState).toBe("quest_ready_to_complete");
  });

  it("restores completed and reward-claimed state across service restart", () => {
    const playerId = "npc-quest-persist-complete";
    const first = new NpcQuestService();
    first.acceptQuest(playerId, "village_supply_order_001");
    completeInputs(first, playerId);
    expect(first.completeQuest(playerId, "village_supply_order_001").ok).toBe(true);

    const restored = new NpcQuestService();
    restored.restorePlayerState(first.exportPlayerState(playerId));

    expect(restored.getQuestProgress(playerId, "village_supply_order_001")?.state).toBe("completed");
    expect(restored.acceptQuest(playerId, "village_supply_order_001")).toEqual({
      ok: false,
      reason: "quest_already_completed",
    });
  });
});
