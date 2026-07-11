import { describe, expect, it } from "vitest";
import { CampNpcService, type CampStockStateSnapshot } from "../../npc/CampNpcService";
import type { CampStockPersistenceAdapter } from "../../npc/CampStockPersistence";
import { CampStockRuntime } from "../../npc/CampStockRuntime";

class MemoryCampStockPersistence implements CampStockPersistenceAdapter {
  private readonly states = new Map<string, CampStockStateSnapshot>();

  public async loadStockState(poiId: string): Promise<CampStockStateSnapshot | null> {
    const state = this.states.get(poiId);
    return state ? structuredClone(state) : null;
  }

  public async saveStockState(poiId: string, state: CampStockStateSnapshot | null): Promise<void> {
    if (state) this.states.set(poiId, structuredClone(state));
    else this.states.delete(poiId);
  }
}

describe("Camp stock persistence truth", () => {
  it("restores committed stock after a process restart", async () => {
    const poiId = "poi:1:1:logging_camp:0";
    const persistence = new MemoryCampStockPersistence();
    const firstService = new CampNpcService();
    const firstRuntime = new CampStockRuntime(firstService, persistence);
    const committed: CampStockStateSnapshot = {
      items: { wood_log: 3 },
      lastProcessedCycle: 8,
    };

    await firstRuntime.commitStockState(poiId, committed);

    const restartedService = new CampNpcService();
    const restartedRuntime = new CampStockRuntime(restartedService, persistence);
    await restartedRuntime.hydratePoi(poiId);

    expect(restartedService.getStockState(poiId)).toEqual(committed);
  });

  it("persists rollback deletion instead of allowing projected stock to reappear", async () => {
    const poiId = "poi:2:2:mining_camp:0";
    const persistence = new MemoryCampStockPersistence();
    const service = new CampNpcService();
    const runtime = new CampStockRuntime(service, persistence);

    await runtime.commitStockState(poiId, { items: { copper_ore: 2 }, lastProcessedCycle: 4 });
    await runtime.restoreStockState(poiId, undefined);

    const restartedService = new CampNpcService();
    const restartedRuntime = new CampStockRuntime(restartedService, persistence);
    await restartedRuntime.hydratePoi(poiId);
    expect(restartedService.getStockState(poiId)).toBeUndefined();
  });
});
