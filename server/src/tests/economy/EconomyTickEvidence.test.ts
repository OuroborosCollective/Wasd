import { beforeEach, describe, expect, it } from "vitest";
import { EconomyService } from "../../economy/EconomyService";
import { VendorStockService } from "../../economy/VendorStockService";
import { VendorStockStore } from "../../economy/VendorStockStore";
import type { VendorStockPersistenceAdapter } from "../../economy/VendorStockPersistence";
import { WalletService } from "../../economy/WalletService";
import { WalletStore } from "../../economy/WalletStore";
import type { WalletPersistenceAdapter } from "../../economy/WalletPersistence";
import { VILLAGE_TRADER } from "../../economy/VillageVendors";
import { InventoryService } from "../../inventory/InventoryService";
import { InventoryStore } from "../../inventory/InventoryStore";
import type { InventoryPersistenceAdapter } from "../../inventory/InventoryPersistence";
import { RuntimeHistoryLog } from "../../history/RuntimeHistoryLog";

const persistence: InventoryPersistenceAdapter & WalletPersistenceAdapter & VendorStockPersistenceAdapter = {
  async loadPlayerInventory() { return null; },
  async savePlayerInventory() {},
  async loadWallet() { return null; },
  async saveWallet() {},
  async loadStock() { return null; },
  async saveStock() {},
  async health() { return { ok: true, driver: "memory" }; },
};

const POSITION = { x: VILLAGE_TRADER.position.x, y: VILLAGE_TRADER.position.y };

describe("Economy runtime tick evidence", () => {
  let inventory: InventoryService;
  let wallet: WalletService;
  let vendor: VendorStockService;
  let history: RuntimeHistoryLog;
  let economy: EconomyService;

  beforeEach(() => {
    inventory = new InventoryService(new InventoryStore(), persistence);
    wallet = new WalletService(new WalletStore(), persistence);
    vendor = new VendorStockService(new VendorStockStore(), persistence);
    history = new RuntimeHistoryLog();
    economy = new EconomyService(inventory, wallet, vendor, history);
  });

  it("rejects sell without mutating inventory, wallet, stock, or history", async () => {
    await inventory.addItem({ playerId: "seller", itemId: "wood_log", quantity: 2 });
    const result = await economy.sellResource({
      playerId: "seller",
      itemId: "wood_log",
      quantity: 1,
      playerPosition: POSITION,
      vendorId: VILLAGE_TRADER.id,
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: "invalid_tick" }));
    expect((await inventory.getPlayerInventory("seller")).slots).toEqual([
      expect.objectContaining({ itemId: "wood_log", quantity: 2 }),
    ]);
    expect((await wallet.getWallet("seller")).balances.coin).toBe(0);
    expect(await vendor.getItemQuantity(VILLAGE_TRADER.id, "wood_log")).toBe(0);
    expect(history.list()).toEqual([]);
  });

  it("rejects buy without mutating inventory, wallet, stock, or history", async () => {
    await wallet.addCoins({ playerId: "buyer", amount: 100 });
    await vendor.addItems(VILLAGE_TRADER.id, "wood_log", 5);
    const result = await economy.buyResource({
      playerId: "buyer",
      itemId: "wood_log",
      quantity: 1,
      playerPosition: POSITION,
      vendorId: VILLAGE_TRADER.id,
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: "invalid_tick" }));
    expect((await inventory.getPlayerInventory("buyer")).slots).toEqual([]);
    expect((await wallet.getWallet("buyer")).balances.coin).toBe(100);
    expect(await vendor.getItemQuantity(VILLAGE_TRADER.id, "wood_log")).toBe(5);
    expect(history.list()).toEqual([]);
  });

  it("rejects sell-all without mutating any state", async () => {
    await inventory.addItem({ playerId: "bulk", itemId: "wood_log", quantity: 2 });
    await inventory.addItem({ playerId: "bulk", itemId: "copper_ore", quantity: 1 });
    const result = await economy.sellAllResources({
      playerId: "bulk",
      playerPosition: POSITION,
      vendorId: VILLAGE_TRADER.id,
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: "invalid_tick" }));
    expect((await inventory.getPlayerInventory("bulk")).slots).toEqual([
      expect.objectContaining({ itemId: "copper_ore", quantity: 1 }),
      expect.objectContaining({ itemId: "wood_log", quantity: 2 }),
    ]);
    expect((await wallet.getWallet("bulk")).balances.coin).toBe(0);
    expect(await vendor.getItemQuantity(VILLAGE_TRADER.id, "wood_log")).toBe(0);
    expect(await vendor.getItemQuantity(VILLAGE_TRADER.id, "copper_ore")).toBe(0);
    expect(history.list()).toEqual([]);
  });
});
