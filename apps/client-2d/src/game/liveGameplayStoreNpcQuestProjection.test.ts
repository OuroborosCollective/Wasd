import { describe, expect, it } from "vitest";
import { LiveGameplayStore } from "./liveGameplayStore";

function composerSnapshot(input: {
  playerId: string;
  logicalIndex: number;
  revisionHash: string;
  questState?: "active" | "ready_to_complete" | "completed";
}) {
  return {
    schemaVersion: "live-gameplay-snapshot.v1",
    playerId: input.playerId,
    logicalIndex: input.logicalIndex,
    revisionHash: input.revisionHash,
    inventory: [],
    equipment: [],
    skills: [],
    resourceNodes: [],
    wallet: { coin: 0 },
    activeQuests: input.questState && input.questState !== "completed"
      ? [{
          questId: "village_supply_order_001",
          title: "Mira's First Supply Order",
          description: "Gather, process, and deliver wood planks for Mira.",
          state: input.questState,
          objectives: [{
            objectiveId: "return_to_mira",
            title: "Return to Mira",
            current: 1,
            required: 1,
            completed: true,
          }],
        }]
      : [],
    availableQuests: [],
    completedQuestIds: input.questState === "completed" ? ["village_supply_order_001"] : [],
    npcDialogues: [],
    npcReputations: [],
    npcMemories: [],
    npcRumors: [],
    worldSurface: {
      schemaVersion: "world-surface-model.v1",
      tick: input.logicalIndex,
      groups: [],
      points: [],
    },
  };
}

describe("LiveGameplayStore runtime truth projection", () => {
  it("accepts a coherent actor/tick/revision snapshot", () => {
    const store = new LiveGameplayStore();
    const playerId = "player_quest_projection";

    store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 77,
      revisionHash: "aabbcc77",
      questState: "active",
    }), playerId);

    const snapshot = store.getSnapshot();
    expect(snapshot.status).toBe("live");
    expect(snapshot.serverTick).toBe(77);
    expect(snapshot.activeQuests?.[0]?.questId).toBe("village_supply_order_001");
    expect(snapshot.quests[0]?.status).toBe("active");
  });

  it("keeps ready-to-complete active until the server records completion", () => {
    const store = new LiveGameplayStore();
    const playerId = "player_ready_projection";

    store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 12,
      revisionHash: "aabbcc12",
      questState: "ready_to_complete",
    }), playerId);

    expect(store.getSnapshot().activeQuests?.[0]?.state).toBe("ready_to_complete");
    expect(store.getSnapshot().quests[0]?.status).toBe("active");
  });

  it("marks a partial snapshot stale instead of inventing live state", () => {
    const store = new LiveGameplayStore();
    const playerId = "player_partial_projection";

    store.setSnapshot({
      schemaVersion: "live-gameplay-snapshot.v1",
      playerId,
      logicalIndex: 5,
      revisionHash: "aabbcc05",
      inventory: [],
    }, playerId);

    expect(store.getSnapshot().status).toBe("stale");
  });

  it("rejects an older snapshot and marks the current view stale", () => {
    const store = new LiveGameplayStore();
    const playerId = "player_monotone_projection";

    store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 20,
      revisionHash: "aabbcc20",
      questState: "active",
    }), playerId);
    store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 19,
      revisionHash: "aabbcc19",
      questState: "completed",
    }), playerId);

    expect(store.getSnapshot().status).toBe("stale");
    expect(store.getSnapshot().serverTick).toBe(20);
    expect(store.getSnapshot().quests[0]?.status).toBe("active");
  });

  it("rejects a different revision at the same tick", () => {
    const store = new LiveGameplayStore();
    const playerId = "player_revision_conflict";

    store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 30,
      revisionHash: "aabbcc30",
      questState: "active",
    }), playerId);
    store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 30,
      revisionHash: "ddeeff30",
      questState: "completed",
    }), playerId);

    expect(store.getSnapshot().status).toBe("stale");
    expect(store.getSnapshot().quests[0]?.status).toBe("active");
  });
});
