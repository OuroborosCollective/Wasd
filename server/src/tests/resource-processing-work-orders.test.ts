import { describe, expect, it } from "vitest";
import { loadCraftingRecipesFromGameData } from "../crafting/CraftingGameData.js";
import { InventoryService } from "../inventory/InventoryService.js";
import { InventoryStore } from "../inventory/InventoryStore.js";
import type { PersistedPlayerInventoryState } from "../inventory/InventoryPersistence.js";
import { WalletService } from "../economy/WalletService.js";
import { WalletStore } from "../economy/WalletStore.js";
import type { PersistedWalletState } from "../economy/WalletPersistence.js";
import { SkillProgressionService } from "../skills/SkillProgressionService.js";
import { SkillProgressionStore } from "../skills/SkillProgressionStore.js";
import type { PersistedPlayerSkillState } from "../skills/SkillPersistence.js";
import { loadRegionalWorkOrdersFromGameData } from "../economy/WorkOrderGameData.js";
import { WorkOrderStore } from "../economy/WorkOrderStore.js";
import { WorkOrderService } from "../economy/WorkOrderService.js";

const inventoryPersistence = {
  async loadPlayerInventory(): Promise<PersistedPlayerInventoryState | null> {
    return null;
  },
  async savePlayerInventory(): Promise<void> {},
};

const walletPersistence = {
  async loadWallet(): Promise<PersistedWalletState | null> {
    return null;
  },
  async saveWallet(): Promise<void> {},
};

const skillPersistence = {
  async loadPlayerSkillState(): Promise<PersistedPlayerSkillState | null> {
    return null;
  },
  async savePlayerSkillState(): Promise<void> {},
};

describe("resource processing and work-order runtime truth", () => {
  it("loads deterministic crafting recipes from game-data", () => {
    const recipes = loadCraftingRecipesFromGameData();
    const ids = recipes.map((recipe) => recipe.id);

    expect(ids).toEqual([...ids].sort());
    expect(new Set(ids).size).toBe(ids.length);

    const sawmill = recipes.find((recipe) => recipe.id === "saw_wood_planks");
    expect(sawmill).toBeDefined();
    expect(sawmill?.stationType).toBe("workbench");
    expect(sawmill?.ingredients).toEqual([{ itemId: "wood_log", quantity: 3 }]);
    expect(sawmill?.outputs).toEqual([{ itemId: "wood_plank", quantity: 2 }]);

    const reinforcedPickaxe = recipes.find((recipe) => recipe.id === "craft_reinforced_pickaxe");
    expect(reinforcedPickaxe?.ingredients).toContainEqual({ itemId: "wood_plank", quantity: 2 });
    expect(reinforcedPickaxe?.ingredients).toContainEqual({ itemId: "copper_ingot", quantity: 3 });
  });

  it("derives regional work-order needs and stable snapshots from game-data", () => {
    const gameData = loadRegionalWorkOrdersFromGameData();
    const store = new WorkOrderStore(gameData);
    const first = store.listSnapshots(500);
    const second = store.listSnapshots(500);

    expect(gameData.regions[0].needs.length).toBeGreaterThan(0);
    expect(first).toEqual(second);
    expect(first.map((order) => order.workOrderId)).toEqual([
      "outpost_copper_order",
      "outpost_fish_order",
      "outpost_wood_order",
    ]);

    const woodOrder = first.find((order) => order.workOrderId === "outpost_wood_order");
    expect(woodOrder?.itemId).toBe("wood_plank");
    expect(woodOrder?.requiredCount).toBe(50);
    expect(woodOrder?.progressPermille).toBe(0);
  });

  it("delivers work-order items through real inventory, wallet and skill services", async () => {
    const inventoryStore = new InventoryStore();
    const inventoryService = new InventoryService(inventoryStore, inventoryPersistence);
    const walletStore = new WalletStore();
    const walletService = new WalletService(walletStore, walletPersistence);
    const skillStore = new SkillProgressionStore();
    const skillService = new SkillProgressionService(skillStore, skillPersistence);
    const store = new WorkOrderStore(loadRegionalWorkOrdersFromGameData());
    const service = new WorkOrderService(store, {
      getInventoryService: async () => inventoryService,
      getWalletService: async () => walletService,
      getSkillProgressionService: async () => skillService,
    });

    await inventoryService.addItem({ playerId: "player_work_order", itemId: "wood_plank", quantity: 60 });

    const partial = await service.deliver({
      playerId: "player_work_order",
      workOrderId: "outpost_wood_order",
      quantity: 20,
      currentTick: 100,
    });

    expect(partial.ok).toBe(true);
    expect(partial.reason).toBe("delivered");
    expect(partial.rewardApplied).toBe(false);
    expect(store.getSnapshot("outpost_wood_order", 100)?.deliveredCount).toBe(20);

    const completed = await service.deliver({
      playerId: "player_work_order",
      workOrderId: "outpost_wood_order",
      quantity: 99,
      currentTick: 101,
    });

    expect(completed.ok).toBe(true);
    expect(completed.reason).toBe("completed");
    expect(completed.deliveredCount).toBe(30);
    expect(completed.rewardApplied).toBe(true);
    expect(completed.contributionHash).toMatch(/^[0-9a-f]+$/);

    const inventory = await inventoryService.getPlayerInventory("player_work_order");
    expect(inventory.slots.find((slot) => slot.itemId === "wood_plank")?.quantity).toBe(10);
    expect((await walletService.getWallet("player_work_order")).balances.coin).toBe(250);
    expect((await skillService.getPlayerSkillState("player_work_order")).skills.find((skill) => skill.id === "crafting")?.xp).toBe(150);
  });

  it("does not mutate work-order progress when inventory is missing", async () => {
    const inventoryService = new InventoryService(new InventoryStore(), inventoryPersistence);
    const walletService = new WalletService(new WalletStore(), walletPersistence);
    const skillService = new SkillProgressionService(new SkillProgressionStore(), skillPersistence);
    const store = new WorkOrderStore(loadRegionalWorkOrdersFromGameData());
    const service = new WorkOrderService(store, {
      getInventoryService: async () => inventoryService,
      getWalletService: async () => walletService,
      getSkillProgressionService: async () => skillService,
    });

    const before = store.getSnapshot("outpost_fish_order", 200);
    const result = await service.deliver({
      playerId: "player_empty",
      workOrderId: "outpost_fish_order",
      quantity: 10,
      currentTick: 201,
    });
    const after = store.getSnapshot("outpost_fish_order", 202);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_items");
    expect(after?.deliveredCount).toBe(before?.deliveredCount);
    expect((await walletService.getWallet("player_empty")).balances.coin).toBe(0);
  });

  it("benchmarks precomputed listDefinitions vs uncached localeCompare array sorting", () => {
    const gameData = loadRegionalWorkOrdersFromGameData();
    const store = new WorkOrderStore(gameData);

    // Verify listDefinitions returns frozen precomputed array
    const list1 = store.listDefinitions();
    const list2 = store.listDefinitions();
    expect(list1).toBe(list2);
    expect(list1.map((d) => d.id)).toEqual([...list1.map((d) => d.id)].sort());

    const iterations = 50000;

    // 1. Precomputed cached list call benchmark
    const startCached = performance.now();
    for (let i = 0; i < iterations; i++) {
      const defs = store.listDefinitions();
    }
    const durationCached = performance.now() - startCached;

    // 2. Uncached copy + localeCompare benchmark
    const startUncached = performance.now();
    for (let i = 0; i < iterations; i++) {
      const defs = [...gameData.workOrders].sort((a, b) => a.id.localeCompare(b.id));
    }
    const durationUncached = performance.now() - startUncached;

    console.log(`[WorkOrderStore Benchmark - ${iterations} calls]`);
    console.log(`  - Precomputed cached list:                  ${durationCached.toFixed(4)}ms`);
    console.log(`  - Dynamic copy + localeCompare sort:        ${durationUncached.toFixed(4)}ms`);
    console.log(`  - Speedup:                                  ${(durationUncached / Math.max(0.001, durationCached)).toFixed(2)}x`);

    expect(durationCached).toBeLessThan(durationUncached);
  });
});
