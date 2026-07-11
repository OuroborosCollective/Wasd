import { describe, expect, it } from "vitest";
import { LiveGameplayStore } from "./liveGameplayStore";

const SOURCE_KEYS = [
  "character",
  "quests",
  "dialogues",
  "skills",
  "resources",
  "inventory",
  "crafting",
  "equipment",
  "wallet",
  "vendorEconomy",
  "camp",
  "discovery",
  "guild",
  "factions",
  "map",
  "workOrders",
] as const;

function sourceEvidence() {
  return Object.fromEntries(SOURCE_KEYS.map((key, index) => [
    key,
    { status: "live", hash: index.toString(16).padStart(8, "0") },
  ]));
}

function composerSnapshot(input: {
  playerId: string;
  logicalIndex: number;
  revisionHash: string;
  revisionSequence?: number;
  lastMutationHash?: string | null;
  questState?: "active" | "ready_to_complete" | "completed";
  includeEvidence?: boolean;
}) {
  return {
    schemaVersion: "live-gameplay-snapshot.v1",
    playerId: input.playerId,
    logicalIndex: input.logicalIndex,
    revisionHash: input.revisionHash,
    revisionSequence: input.revisionSequence ?? 0,
    lastMutationHash: input.lastMutationHash ?? null,
    sourceEvidence: input.includeEvidence === false ? undefined : sourceEvidence(),
    inventory: [],
    equipment: [],
    skills: [],
    resourceNodes: [],
    wallet: { coin: 0 },
    vendorEconomy: { vendors: [] },
    campNpcs: [],
    campStocks: [],
    worldPois: [],
    processingStations: [],
    discoveryStats: { discoveredPoiCount: 0, discoveredChunkCount: 0, visiblePoiCount: 0 },
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

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HISTORY_A = "c".repeat(8);

describe("LiveGameplayStore runtime truth projection", () => {
  it("accepts a coherent actor/tick/revision snapshot with complete module evidence", () => {
    const store = new LiveGameplayStore();
    const playerId = "player_quest_projection";

    expect(store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 77,
      revisionHash: HASH_A,
      questState: "active",
    }), playerId)).toBe(true);

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
      revisionHash: HASH_A,
      questState: "ready_to_complete",
    }), playerId);

    expect(store.getSnapshot().activeQuests?.[0]?.state).toBe("ready_to_complete");
    expect(store.getSnapshot().quests[0]?.status).toBe("active");
  });

  it("marks a snapshot stale when any module evidence is missing", () => {
    const store = new LiveGameplayStore();
    const playerId = "player_partial_projection";

    store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 5,
      revisionHash: HASH_A,
      includeEvidence: false,
    }), playerId);

    expect(store.getSnapshot().status).toBe("stale");
  });

  it("rejects an older snapshot and preserves the last evidenced state", () => {
    const store = new LiveGameplayStore();
    const playerId = "player_monotone_projection";

    store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 20,
      revisionHash: HASH_A,
      revisionSequence: 4,
      questState: "active",
    }), playerId);
    store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 19,
      revisionHash: HASH_B,
      revisionSequence: 5,
      questState: "completed",
    }), playerId);

    expect(store.getSnapshot().status).toBe("stale");
    expect(store.getSnapshot().serverTick).toBe(20);
    expect(store.getSnapshot().quests[0]?.status).toBe("active");
  });

  it("accepts a legitimate second revision in the same tick only with a higher runtime sequence", () => {
    const store = new LiveGameplayStore();
    const playerId = "player_revision_sequence";

    store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 30,
      revisionHash: HASH_A,
      revisionSequence: 7,
      questState: "active",
    }), playerId);
    expect(store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 30,
      revisionHash: HASH_B,
      revisionSequence: 8,
      questState: "completed",
    }), playerId)).toBe(true);

    expect(store.getSnapshot().status).toBe("live");
    expect(store.getSnapshot().quests[0]?.status).toBe("completed");
  });

  it("requires a strictly newer revision and matching mutation hash after an action", () => {
    const store = new LiveGameplayStore();
    const playerId = "player_action_confirmation";
    store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 40,
      revisionHash: HASH_A,
      revisionSequence: 10,
      questState: "active",
    }), playerId);
    const before = store.getEvidence();

    expect(store.setSnapshot(composerSnapshot({
      playerId,
      logicalIndex: 40,
      revisionHash: HASH_B,
      revisionSequence: 11,
      lastMutationHash: HISTORY_A,
      questState: "completed",
    }), playerId, {
      after: before,
      expectedMutationHash: HISTORY_A,
    })).toBe(true);
  });
});
