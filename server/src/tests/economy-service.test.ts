/**
 * ECONOMY SERVICE TESTS
 *
 * Server-authoritative resource selling contract tests.
 * Tests sell-resource and sell-all-resources operations.
 * Ensures fail-does-not-mutate behavior.
 * Tests vendor proximity requirements.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EconomyService } from "../economy/EconomyService.js";
import { WalletStore } from "../economy/WalletStore.js";
import { InventoryStore } from "../inventory/InventoryStore.js";
import { InventoryService } from "../inventory/InventoryService.js";
import { VILLAGE_TRADER } from "../economy/VillageVendors.js";

// Mock persistence adapter
const mockPersistence = {
  async loadWallet() { return null; },
  async saveWallet() {},
  async loadPlayerInventory() { return null; },
  async savePlayerInventory() {},
};

// Helper to create a position near the vendor (within interaction radius)
function nearVendorPosition() {
  return { x: VILLAGE_TRADER.position.x, y: VILLAGE_TRADER.position.y };
}

// Helper to create a position far from the vendor
function farVendorPosition() {
  return { x: VILLAGE_TRADER.position.x + 100, y: VILLAGE_TRADER.position.y + 100 };
}

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
    it("should sell resource successfully when near vendor", async () => {
      // Add wood_log to inventory
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 5 });

      const result = await economyService.sellResource({
        playerId: "player1",
        itemId: "wood_log",
        quantity: 3,
        playerPosition: nearVendorPosition(),
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
        playerPosition: nearVendorPosition(),
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("should fail for invalid quantity", async () => {
      const result = await economyService.sellResource({
        playerId: "player1",
        itemId: "wood_log",
        quantity: 0,
        playerPosition: nearVendorPosition(),
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
        playerPosition: nearVendorPosition(),
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
        playerPosition: nearVendorPosition(),
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
        playerPosition: nearVendorPosition(),
      });

      expect(result.ok).toBe(false);

      // Verify inventory is unchanged
      const inventory = await inventoryService.getPlayerInventory("player1");
      const woodSlot = inventory.slots.find((s) => s.itemId === "wood_log");
      expect(woodSlot?.quantity).toBe(1);
    });
  });

  describe("sellAllResources", () => {
    it("should sell all resources successfully when near vendor", async () => {
      // Add multiple resource types
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 5 });
      await inventoryService.addItem({ playerId: "player1", itemId: "copper_ore", quantity: 2 });
      await inventoryService.addItem({ playerId: "player1", itemId: "raw_fish", quantity: 1 });

      const result = await economyService.sellAllResources({
        playerId: "player1",
        playerPosition: nearVendorPosition(),
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
        playerPosition: nearVendorPosition(),
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
        playerPosition: nearVendorPosition(),
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

      // Try to sell from non-existent player
      const result = await economyService.sellAllResources({
        playerId: "nonexistent",
        playerPosition: nearVendorPosition(),
      });

      expect(result.ok).toBe(false);

      // Verify original inventory is unchanged
      const inventory = await inventoryService.getPlayerInventory("player1");
      const woodSlot = inventory.slots.find((s) => s.itemId === "wood_log");
      expect(woodSlot?.quantity).toBe(5);
    });
  });

  describe("vendor proximity", () => {
    it("should fail when player is too far from vendor", async () => {
      // Add resources
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 5 });

      // Try to sell from far away
      const result = await economyService.sellResource({
        playerId: "player1",
        itemId: "wood_log",
        quantity: 3,
        playerPosition: farVendorPosition(),
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("vendor_too_far");

      // Verify inventory is unchanged
      const inventory = await inventoryService.getPlayerInventory("player1");
      const woodSlot = inventory.slots.find((s) => s.itemId === "wood_log");
      expect(woodSlot?.quantity).toBe(5);
    });

    it("should fail sellAll when player is too far from vendor", async () => {
      // Add resources
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 5 });
      await inventoryService.addItem({ playerId: "player1", itemId: "copper_ore", quantity: 2 });

      // Try to sell all from far away
      const result = await economyService.sellAllResources({
        playerId: "player1",
        playerPosition: farVendorPosition(),
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("vendor_too_far");

      // Verify inventory is unchanged
      const inventory = await inventoryService.getPlayerInventory("player1");
      expect(inventory.slots.length).toBe(2);
    });

    it("should fail when player position is missing", async () => {
      // Add resources
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 5 });

      // Try to sell without position
      const result = await economyService.sellResource({
        playerId: "player1",
        itemId: "wood_log",
        quantity: 3,
        // No playerPosition
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("missing_player_position");

      // Verify inventory is unchanged
      const inventory = await inventoryService.getPlayerInventory("player1");
      const woodSlot = inventory.slots.find((s) => s.itemId === "wood_log");
      expect(woodSlot?.quantity).toBe(5);
    });

    it("should fail when player position is invalid", async () => {
      // Add resources
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 5 });

      // Try to sell with invalid position (Infinity)
      const result = await economyService.sellResource({
        playerId: "player1",
        itemId: "wood_log",
        quantity: 3,
        playerPosition: { x: Infinity, y: 0 },
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player_position");

      // Verify inventory is unchanged
      const inventory = await inventoryService.getPlayerInventory("player1");
      const woodSlot = inventory.slots.find((s) => s.itemId === "wood_log");
      expect(woodSlot?.quantity).toBe(5);
    });

    it("should fail for invalid vendor ID", async () => {
      // Add resources
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 5 });

      // Try to sell with non-existent vendor
      const result = await economyService.sellResource({
        playerId: "player1",
        itemId: "wood_log",
        quantity: 3,
        playerPosition: nearVendorPosition(),
        vendorId: "nonexistent_vendor",
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_vendor");

      // Verify inventory is unchanged
      const inventory = await inventoryService.getPlayerInventory("player1");
      const woodSlot = inventory.slots.find((s) => s.itemId === "wood_log");
      expect(woodSlot?.quantity).toBe(5);
    });

    it("should succeed at edge of vendor interaction radius", async () => {
      // Add resources
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 5 });

      // Position exactly at edge of interaction radius (32 units)
      const edgePosition = {
        x: VILLAGE_TRADER.position.x + 31,
        y: VILLAGE_TRADER.position.y,
      };

      const result = await economyService.sellResource({
        playerId: "player1",
        itemId: "wood_log",
        quantity: 3,
        playerPosition: edgePosition,
      });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe("sold");

      // Verify inventory was reduced
      const inventory = await inventoryService.getPlayerInventory("player1");
      const woodSlot = inventory.slots.find((s) => s.itemId === "wood_log");
      expect(woodSlot?.quantity).toBe(2);
    });
  });

  describe("price table", () => {
    // Define prices in outer scope so both tests can reference it
    const prices: Record<string, number> = {
      // Raw gathered resources
      wood_log: 1,
      copper_ore: 3,
      raw_fish: 2,
      // Processed resources (premium values)
      wood_plank: 3,
      copper_ingot: 8,
      cooked_fish: 4,
    };

    it("should have correct prices for all resources", async () => {
      // Premium pricing: processed items are worth more than raw inputs
      for (const [itemId, expectedPrice] of Object.entries(prices)) {
        await inventoryService.addItem({ playerId: "player1", itemId, quantity: 1 });
        const result = await economyService.sellResource({
          playerId: "player1",
          itemId,
          quantity: 1,
          playerPosition: nearVendorPosition(),
        });
        expect(result.unitPrice).toBe(expectedPrice);
        expect(result.totalCoins).toBe(expectedPrice);
      }
    });

    it("should have processed items worth more than raw inputs", async () => {
      // Test the economy loop: processing should be profitable
      // wood_log x2 = 2 coins raw, wood_plank = 3 coins processed (+1)
      // copper_ore x2 = 6 coins raw, copper_ingot = 8 coins processed (+2)
      // raw_fish x1 = 2 coins raw, cooked_fish = 4 coins processed (+2)

      // Sell raw copper_ore x2
      await inventoryService.addItem({ playerId: "player1", itemId: "copper_ore", quantity: 2 });
      const rawResult = await economyService.sellResource({
        playerId: "player1",
        itemId: "copper_ore",
        quantity: 2,
        playerPosition: nearVendorPosition(),
      });
      expect(rawResult.totalCoins).toBe(6); // 2 ore x 3 coins

      // Sell raw wood_log x2
      await inventoryService.addItem({ playerId: "player1", itemId: "wood_log", quantity: 2 });
      const woodResult = await economyService.sellResource({
        playerId: "player1",
        itemId: "wood_log",
        quantity: 2,
        playerPosition: nearVendorPosition(),
      });
      expect(woodResult.totalCoins).toBe(2); // 2 logs x 1 coin

      // Processed items should be worth more per unit than raw
      expect(prices.wood_plank).toBeGreaterThan(prices.wood_log);
      expect(prices.copper_ingot).toBeGreaterThan(prices.copper_ore);
      expect(prices.cooked_fish).toBeGreaterThan(prices.raw_fish);
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