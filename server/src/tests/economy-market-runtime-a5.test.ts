import { beforeEach, describe, expect, it } from "vitest";
import { EconomyService } from "../economy/EconomyService.js";
import { VendorStockService } from "../economy/VendorStockService.js";
import { VendorStockStore } from "../economy/VendorStockStore.js";
import { WalletService } from "../economy/WalletService.js";
import { WalletStore } from "../economy/WalletStore.js";
import { createLocalMarketSnapshot } from "../economy/EconomySnapshotAdapter.js";
import { VILLAGE_TRADER } from "../economy/VillageVendors.js";
import { InventoryService } from "../inventory/InventoryService.js";
import { InventoryStore } from "../inventory/InventoryStore.js";
import { RuntimeHistoryLog } from "../history/RuntimeHistoryLog.js";

const memoryPersistence = {
  async loadWallet() { return null; },
  async saveWallet() {},
  async loadPlayerInventory() { return null; },
  async savePlayerInventory() {},
  async loadStock() { return null; },
  async saveStock() {},
  async health() { return { ok: true, driver: "memory" }; },
};

function nearVendorPosition() {
  return { x: VILLAGE_TRADER.position.x, y: VILLAGE_TRADER.position.y };
}

describe("A5 economy market runtime", () => {
  let inventoryStore: InventoryStore;
  let inventoryService: InventoryService;
  let walletStore: WalletStore;
  let walletService: WalletService;
  let vendorStockStore: VendorStockStore;
  let vendorStockService: VendorStockService;
  let history: RuntimeHistoryLog;
  let economy: EconomyService;

  beforeEach(() => {
    inventoryStore = new InventoryStore();
    inventoryService = new InventoryService(inventoryStore, memoryPersistence);
    walletStore = new WalletStore();
    walletService = new WalletService(walletStore, memoryPersistence);
    vendorStockStore = new VendorStockStore();
    vendorStockService = new VendorStockService(vendorStockStore, memoryPersistence);
    history = new RuntimeHistoryLog();
    economy = new EconomyService(inventoryService, walletService, vendorStockService, history);
  });

  it("buys from server-authoritative vendor stock and writes trade origin evidence", async () => {
    walletStore.addCoins("player_a", 10);
    vendorStockStore.addItems("village_trader_001", "wood_log", 5);

    const result = await economy.buyResource({
      playerId: "player_a",
      itemId: "wood_log",
      quantity: 2,
      playerPosition: nearVendorPosition(),
      currentTick: 44,
    });

    expect(result.ok).toBe(true);
    expect(result.reason).toBe("bought");
    expect(result.newBalance).toBe(8);
    expect(result.stockBefore).toBe(5);
    expect(result.stockAfter).toBe(3);
    expect(result.originUid).toMatch(/^buy:/);
    expect(result.historyHash).toBeTruthy();

    const inventory = await inventoryService.getPlayerInventory("player_a");
    expect(inventory.slots.find((slot) => slot.itemId === "wood_log")?.quantity).toBe(2);
    expect(inventoryStore.getMovementEvents("player_a").at(-1)?.origin?.source).toBe("trade_delta");
    expect(history.list()).toHaveLength(1);
  });

  it("rejects buy intent without mutating wallet, stock or inventory", async () => {
    walletStore.addCoins("player_a", 1);
    vendorStockStore.addItems("village_trader_001", "copper_ingot", 2);

    const result = await economy.buyResource({
      playerId: "player_a",
      itemId: "copper_ingot",
      quantity: 1,
      playerPosition: nearVendorPosition(),
      currentTick: 50,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_wallet");
    expect(walletStore.getWallet("player_a").balances.coin).toBe(1);
    expect(vendorStockStore.getItemQuantity("village_trader_001", "copper_ingot")).toBe(2);
    expect((await inventoryService.getPlayerInventory("player_a")).slots).toHaveLength(0);
    expect(history.list()).toHaveLength(0);
  });

  it("sell path writes a real runtime history entry", async () => {
    await inventoryService.addItem({ playerId: "player_a", itemId: "raw_fish", quantity: 3 });

    const result = await economy.sellResource({
      playerId: "player_a",
      itemId: "raw_fish",
      quantity: 2,
      playerPosition: nearVendorPosition(),
      currentTick: 60,
    });

    expect(result.ok).toBe(true);
    expect(result.historyHash).toBe(history.list()[0]?.entryHash);
    expect(history.list()[0]?.source).toBe("economy_sell");
  });

  it("creates a server-derived market snapshot from vendor stock", async () => {
    vendorStockStore.addItems("village_trader_001", "wood_log", 25);

    const snapshot = await createLocalMarketSnapshot({ vendorStockService });

    expect(snapshot.marketId).toBe("starter_village_market");
    expect(snapshot.prices.length).toBeGreaterThanOrEqual(2);
    expect(snapshot.prices.map((price) => price.itemId)).toEqual([...snapshot.prices.map((price) => price.itemId)].sort());
    expect(snapshot.snapshotHash).toBeTruthy();
  });
});
