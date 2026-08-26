import { beforeEach, describe, expect, it } from "vitest";
import { runtimeHistoryLog } from "../../history/RuntimeHistoryLog";
import type {
  NpcQuestPersistenceAdapter,
  PersistedNpcQuestPlayerState,
} from "../../quests/NpcQuestPersistence";
import { NpcQuestRuntime } from "../../quests/NpcQuestRuntime";
import { NpcQuestService } from "../../quests/NpcQuestService";

class MemoryQuestPersistence implements NpcQuestPersistenceAdapter {
  private readonly states = new Map<string, PersistedNpcQuestPlayerState>();
  public failNextSave = false;

  public async loadPlayerState(playerId: string): Promise<PersistedNpcQuestPlayerState | null> {
    const state = this.states.get(playerId);
    return state ? structuredClone(state) : null;
  }

  public async savePlayerState(state: PersistedNpcQuestPlayerState): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error("simulated_quest_persistence_failure");
    }
    this.states.set(state.playerId, structuredClone(state));
  }
}

const ACCEPT_EVIDENCE = {
  intentHash: "intent:quest:accept:1",
  tick: 10,
  chunkKey: "chunk:0:0",
} as const;

const GATHER_EVIDENCE = {
  intentHash: "intent:gather:wood:1",
  tick: 11,
  chunkKey: "chunk:0:0",
  eventType: "gather" as const,
  targetId: "wood_log",
  quantity: 1,
};

beforeEach(() => runtimeHistoryLog.clearForTests());

describe("NPC quest source mutation evidence", () => {
  it("persists and replays a source receipt without incrementing progress twice", async () => {
    const playerId = "quest-source-replay-player";
    const persistence = new MemoryQuestPersistence();
    const firstService = new NpcQuestService();
    const firstRuntime = new NpcQuestRuntime(firstService, persistence);

    expect((await firstRuntime.acceptQuest(playerId, "village_supply_order_001", ACCEPT_EVIDENCE)).ok).toBe(true);
    const first = await firstRuntime.updateQuestProgress(playerId, GATHER_EVIDENCE);
    const replay = await firstRuntime.updateQuestProgress(playerId, GATHER_EVIDENCE);

    expect(first).toEqual(expect.objectContaining({
      ok: true,
      result: expect.objectContaining({ replayed: false, historyHash: expect.any(String) }),
    }));
    expect(replay).toEqual(expect.objectContaining({
      ok: true,
      result: expect.objectContaining({ replayed: true, historyHash: first.ok ? first.result.historyHash : "" }),
    }));
    expect(firstService.getQuestProgress(playerId, "village_supply_order_001")?.objectives[0]?.current).toBe(1);

    const restartedService = new NpcQuestService();
    const restartedRuntime = new NpcQuestRuntime(restartedService, persistence);
    await restartedRuntime.hydratePlayer(playerId);
    const restartReplay = await restartedRuntime.updateQuestProgress(playerId, GATHER_EVIDENCE);

    expect(restartReplay).toEqual(expect.objectContaining({
      ok: true,
      result: expect.objectContaining({ replayed: true }),
    }));
    expect(restartedService.getQuestProgress(playerId, "village_supply_order_001")?.objectives[0]?.current).toBe(1);
  });

  it("rolls back quest state and history when receipt persistence fails", async () => {
    const playerId = "quest-source-rollback-player";
    const persistence = new MemoryQuestPersistence();
    const service = new NpcQuestService();
    const runtime = new NpcQuestRuntime(service, persistence);
    await runtime.acceptQuest(playerId, "village_supply_order_001", ACCEPT_EVIDENCE);
    const historyBefore = runtimeHistoryLog.list();
    persistence.failNextSave = true;

    const result = await runtime.updateQuestProgress(playerId, GATHER_EVIDENCE);

    expect(result).toEqual({ ok: false, reason: "persistence_failed" });
    expect(service.getQuestProgress(playerId, "village_supply_order_001")?.objectives[0]?.current).toBe(0);
    expect(runtimeHistoryLog.list()).toEqual(historyBefore);
  });
});
