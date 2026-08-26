import { describe, expect, it } from "vitest";
import { normalizeLiveGameplaySnapshotWithWorldSurface } from "./liveGameplayWorldSurfaceSnapshot";

describe("liveGameplay NPC quest snapshot normalization", () => {
  it("keeps explicitly evidenced quest fields", () => {
    const snapshot = normalizeLiveGameplaySnapshotWithWorldSurface({
      activeQuests: [{
        questId: "wood_delivery_001",
        state: "active",
        objectives: [{
          objectiveId: "collect_wood_log",
          title: "Collect Wood Logs",
          current: 3,
          required: 5,
          completed: false,
        }],
      }],
      availableQuests: [{ questId: "plank_delivery_001", state: "available", objectives: [] }],
      completedQuestIds: ["starter_welcome"],
      npcDialogues: [{
        npcId: "npc_2",
        displayName: "Outpost Guard",
        dialogueState: "quest_active_missing_wood",
        line: "Bring the logs when you have them.",
        availableQuestIds: ["plank_delivery_001"],
        activeQuestIds: ["wood_delivery_001"],
        completedQuestIds: ["starter_welcome"],
      }],
      npcReputations: [{
        npcId: "npc_2",
        playerId: "player_1",
        reputation: 2,
        completedQuestIds: ["starter_welcome"],
      }],
    } as never);

    expect(snapshot.activeQuests?.[0]?.questId).toBe("wood_delivery_001");
    expect(snapshot.activeQuests?.[0]?.objectives[0]?.current).toBe(3);
    expect(snapshot.availableQuests?.[0]?.questId).toBe("plank_delivery_001");
    expect(snapshot.completedQuestIds).toEqual(["starter_welcome"]);
    expect(snapshot.npcDialogues?.[0]?.activeQuestIds).toEqual(["wood_delivery_001"]);
    expect(snapshot.npcReputations?.[0]?.reputation).toBe(2);
  });

  it("drops invalid objectives and unknown states instead of inventing progress", () => {
    const snapshot = normalizeLiveGameplaySnapshotWithWorldSurface({
      activeQuests: [{
        questId: "z_quest",
        state: "active",
        objectives: [
          { objectiveId: "valid", title: "Valid", current: 4, required: 4, completed: false },
          { objectiveId: "negative", title: "Invalid", current: -3, required: 2 },
          { objectiveId: "missing_required", title: "Invalid", current: 1 },
        ],
      }, {
        questId: "unknown_state",
        state: "invented",
        objectives: [],
      }],
      completedQuestIds: ["wood_delivery_001", "starter_welcome"],
    } as never);

    expect(snapshot.activeQuests?.map((quest) => quest.questId)).toEqual(["z_quest"]);
    expect(snapshot.activeQuests?.[0]?.objectives).toEqual([{
      objectiveId: "valid",
      title: "Valid",
      current: 4,
      required: 4,
      completed: false,
    }]);
    expect(snapshot.completedQuestIds).toEqual(["starter_welcome", "wood_delivery_001"]);
  });
});
