/**
 * ECONOMY SERVICE TESTS
 *
 * Server-authoritative resource selling contract tests.
 * Tests sell-resource and sell-all-resources operations.
 * Ensures fail-does-not-mutate behavior.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EconomyService } from "../economy/EconomyService.js";
import { WalletStore } from "../economy/WalletStore.js";
import { InventoryStore } from "../inventory/InventoryStore.js";
import { InventoryService } from "../inventory/InventoryService.js";

// Mock persistence adapter
const mockPersistence = {
  async loadWallet() { return null; },
  async saveWallet() {},
  async loadPlayerInventory() { return null; },
  async savePlayerInventory() {},
};

describe("EconomyService", () => {
  let economyService: EconomyService;
  let inventoryService: InventoryService;
  let walletStore: WalletStore;

  beforeEach(() => {
    walletStore = new WalletStore();
    const inventoryStore = new InventoryStore();
    inventoryService = new InventoryService(inventoryStore, mockPersistence);
    economyService = new EconomyService(inventoryService, {
      getWallet: async (playerId: string) => walletStore.getWallet(playerId),
      addCoins: async (input: { playerId: string; amount: number }) => {
        const state = walletStore.getWallet(input.playerId);
        const normalized = Math.max(0, Math.floor(Number(input.amount)));
        const next = { ...state, balances: { ...state.balances, coin: state.balances.coin + normalized } };
        walletStore.wallets.set(input.playerId, next);
        return next;
      },
      hydratePlayer: async () => {},
    } as any);
  });

  describe("sellResource", () => {
    it("should sell resource successfully", async () => {
      // Add wood_log to inventory
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 5 });

      const result = await economyService.sellResource({
        playerId: "player1",
        itemId: "wood_log",
        quantity: 3,
      });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe("sold");
      expect(result.quantitySold).toBe(3);
      expect(result.unitPrice).toBe(1);
      expect(result.totalCoins).toBe(3);
      expect(result.newBalance).toBe(3);

      // Verify inventory was reduced
      const inventory = await inventoryService.getPlayerInventory("player1");
      const woodSlot = inventory.slots.find((s) => s.itemId === "wood_log");
      expect(woodSlot?.quantity).toBe(2);
    });

    it("should fail for invalid player", async () => {
      const result = await economyService.sellResource({
        playerId: "",
        itemId: "wood_log",
        quantity: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("should fail for invalid quantity", async () => {
      const result = await economyService.sellResource({
        playerId: "player1",
        itemId: "wood_log",
        quantity: 0,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_quantity");
    });

    it("should fail for not_sellable item (tool)", async () => {
      // Add a tool to inventory
      await inventoryService.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });

      const result = await economyService.sellResource({
        playerId: "player1",
        itemId: "wooden_axe",
        quantity: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("not_sellable");
    });

    it("should fail for insufficient quantity", async () => {
      // Add only 1 wood_log
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 1 });

      const result = await economyService.sellResource({
        playerId: "player1",
        itemId: "wood_log",
        quantity: 5,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("insufficient_quantity");
    });

    it("should not mutate inventory on failure", async () => {
      // Add 1 wood_log
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 1 });

      // Try to sell 5 (more than available)
      const result = await economyService.sellResource({
        playerId: "player1",
        itemId: "wood_log",
        quantity: 5,
      });

      expect(result.ok).toBe(false);

      // Verify inventory is unchanged
      const inventory = await inventoryService.getPlayerInventory("player1");
      const woodSlot = inventory.slots.find((s) => s.itemId === "wood_log");
      expect(woodSlot?.quantity).toBe(1);
    });
  });

  describe("sellAllResources", () => {
    it("should sell all resources successfully", async () => {
      // Add multiple resource types
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 5 });
      await inventoryService.addItem({ playerId: "player1", itemId: "copper_ore", quantity: 2 });
      await inventoryService.addItem({ playerId: "player1", itemId: "raw_fish", quantity: 1 });

      const result = await economyService.sellAllResources({
        playerId: "player1",
      });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe("sold");
      // 5*1 + 2*3 + 1*2 = 5 + 6 + 2 = 13
      expect(result.totalCoins).toBe(13);
      expect(result.sold).toHaveLength(3);

      // Verify inventory is empty
      const inventory = await inventoryService.getPlayerInventory("player1");
      expect(inventory.slots.length).toBe(0);
    });

    it("should fail for nothing_to_sell", async () => {
      const result = await economyService.sellAllResources({
        playerId: "player1",
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("nothing_to_sell");
    });

    it("should not sell tools", async () => {
      // Add tools and resources
      await inventoryService.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 5 });

      const result = await economyService.sellAllResources({
        playerId: "player1",
      });

      expect(result.ok).toBe(true);
      expect(result.sold).toHaveLength(1); // Only wood_log
      expect(result.totalCoins).toBe(5); // 5 * 1

      // Verify tool is still in inventory
      const inventory = await inventoryService.getPlayerInventory("player1");
      const toolSlot = inventory.slots.find((s) => s.itemId === "wooden_axe");
      expect(toolSlot).toBeDefined();
      expect(toolSlot?.quantity).toBe(1);
    });

    it("should not mutate inventory on failure", async () => {
      // Add some resources
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 5 });

      // Create another service instance and try to sell from non-existent player
      const result = await economyService.sellAllResources({
        playerId: "nonexistent",
      });

      expect(result.ok).toBe(false);

      // Verify original inventory is unchanged
      const inventory = await inventoryService.getPlayerInventory("player1");
      const woodSlot = inventory.slots.find((s) => s.itemId === "wood_log");
      expect(woodSlot?.quantity).toBe(5);
    });
  });

  describe("price table", () => {
    it("should have correct prices for all resources", async () => {
      const prices: Record<string, number> = {
        wood_log: 1,
        copper_ore: 3,
        raw_fish: 2,
        wood_plank: 1,
        copper_ingot: 5,
        cooked_fish: 3,
      };

      for (const [itemId, expectedPrice] of Object.entries(prices)) {
        await inventoryService.addItem({ playerId: "player1", itemId, quantity: 1 });
        const result = await economyService.sellResource({
          playerId: "player1",
          itemId,
          quantity: 1,
        });
        expect(result.unitPrice).toBe(expectedPrice);
        expect(result.totalCoins).toBe(expectedPrice);
      }
    });
  });
});

describe("WalletStore", () => {
  it("should create default wallet with 0 coins", () => {
    const store = new WalletStore();
    const wallet = store.getWallet("player1");
    expect(wallet.balances.coin).toBe(0);
  });

  it("should add coins", () => {
    const store = new WalletStore();
    store.addCoins("player1", 10);
    const wallet = store.getWallet("player1");
    expect(wallet.balances.coin).toBe(10);
  });

  it("should accumulate coins", () => {
    const store = new WalletStore();
    store.addCoins("player1", 5);
    store.addCoins("player1", 3);
    const wallet = store.getWallet("player1");
    expect(wallet.balances.coin).toBe(8);
  });

  it("should clear for tests", () => {
    const store = new WalletStore();
    store.addCoins("player1", 10);
    store.clearForTests();
    const wallet = store.getWallet("player1");
    expect(wallet.balances.coin).toBe(0);
  });
});