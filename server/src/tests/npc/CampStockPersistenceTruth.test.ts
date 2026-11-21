import { rm } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { CampNpcService, type CampStockStateSnapshot } from "../../npc/CampNpcService";
import type { CampStockPersistenceAdapter } from "../../npc/CampStockPersistence";
import { CampStockRuntime } from "../../npc/CampStockRuntime";
import { JsonCampStockPersistenceAdapter } from "../../npc/JsonCampStockPersistenceAdapter";

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

  describe("JsonCampStockPersistenceAdapter unit and performance tests", () => {
    const testFilePath = path.resolve(process.cwd(), "data", "test-camp-stock-state.json");

    it("saves, loads, and normalizes camp stock state deterministically using JsonCampStockPersistenceAdapter", async () => {
      try {
        await rm(testFilePath, { force: true });
        const adapter = new JsonCampStockPersistenceAdapter(testFilePath);

        const poiA = "poi:3:3:forest_camp:0";
        const poiB = "poi:1:1:logging_camp:0";

        // Save unsorted items
        await adapter.saveStockState(poiA, {
          items: { wood_plank: 10, stone: 5, copper_ingot: 2 },
          lastProcessedCycle: 12,
        });

        await adapter.saveStockState(poiB, {
          items: { iron_ore: 8, coal: 15 },
          lastProcessedCycle: 15,
        });

        const stateA = await adapter.loadStockState(poiA);
        expect(stateA).not.toBeNull();
        expect(Object.keys(stateA!.items)).toEqual(["copper_ingot", "stone", "wood_plank"]);

        const stateB = await adapter.loadStockState(poiB);
        expect(stateB).not.toBeNull();
        expect(Object.keys(stateB!.items)).toEqual(["coal", "iron_ore"]);
      } finally {
        await rm(testFilePath, { force: true });
      }
    });

    it("benchmarks direct relational string comparison vs localeCompare for camp stock POI and item sorting", () => {
      const samplePois = Array.from({ length: 500 }, (_, i) => ({
        poiId: `poi:${(i * 37) % 100}:${(i * 91) % 100}:camp_${i % 20}:${i}`,
        items: {
          [`item_z_${i}`]: i,
          [`item_a_${i}`]: i + 1,
          [`item_m_${i}`]: i + 2,
        },
        lastProcessedCycle: i,
      }));

      const iterations = 200;

      // 1. Benchmark localeCompare sorting
      const startLocale = performance.now();
      for (let k = 0; k < iterations; k++) {
        [...samplePois]
          .map((entry) => ({
            poiId: entry.poiId,
            items: Object.entries(entry.items).sort((a, b) => a[0].localeCompare(b[0])),
          }))
          .sort((a, b) => a.poiId.localeCompare(b.poiId));
      }
      const durationLocale = performance.now() - startLocale;

      // 2. Benchmark direct relational operator sorting
      const startRelational = performance.now();
      for (let k = 0; k < iterations; k++) {
        [...samplePois]
          .map((entry) => ({
            poiId: entry.poiId,
            items: Object.entries(entry.items).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
          }))
          .sort((a, b) => (a.poiId < b.poiId ? -1 : a.poiId > b.poiId ? 1 : 0));
      }
      const durationRelational = performance.now() - startRelational;

      const speedup = durationLocale / (durationRelational || 0.001);

      console.log(`[Camp Stock Persistence Sort Benchmark] (${iterations} iterations over 500 POIs):`);
      console.log(`  - localeCompare sort:    ${durationLocale.toFixed(2)}ms`);
      console.log(`  - relational comparison: ${durationRelational.toFixed(2)}ms (${speedup.toFixed(2)}x speedup)`);
    });
  });
});
