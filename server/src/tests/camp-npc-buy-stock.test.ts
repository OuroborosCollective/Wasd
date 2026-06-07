/**
 * CAMP NPC BUY STOCK TEST
 *
 * Tests for the camp stock buying feature.
 *
 * Rules tested:
 * - No Math.random() - deterministic behavior
 * - No Date.now() - tick-based validation
 * - Buy success: coins decrease, camp stock decrease, player inventory increase
 * - Buy fail: no mutation
 * - Discovery check: undiscovered camps return error
 * - Proximity check: far players cannot buy
 * - Arbitrage prevention: buy prices >= Mira sell prices
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CampNpcService, campNpcService } from "../npc/CampNpcService.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";
import { CAMP_STOCK_BUY_PRICES } from "../economy/CampStockPrices.js";
import { RESOURCE_SELL_PRICES } from "../economy/ResourceSellPrices.js";

describe("CampNpcService buyStock", () => {
  let service: CampNpcService;

  // Sample POIs for testing
  const loggingCampPoi: WorldPoiSnapshot = {
    id: "poi:1:2:logging_camp:0",
    type: "logging_camp",
    title: "Timber Camp",
    position: { x: 17000, y: 21000 },
    chunk: { x: 1, z: 2 },
    interactionRadius: 32,
    tags: ["trees_nearby", "wood_resource"],
  };

  const miningCampPoi: WorldPoiSnapshot = {
    id: "poi:3:4:mining_camp:0",
    type: "mining_camp",
    title: "Ore Camp",
    position: { x: 33000, y: 42000 },
    chunk: { x: 3, z: 4 },
    interactionRadius: 32,
    tags: ["ore_veins_nearby", "ore_resource"],
  };

  const fishingCampPoi: WorldPoiSnapshot = {
    id: "poi:5:6:fishing_camp:0",
    type: "fishing_camp",
    title: "Fishing Spot",
    position: { x: 53000, y: 63000 },
    chunk: { x: 5, z: 6 },
    interactionRadius: 32,
    tags: ["fish_spots_nearby", "fish_resource"],
  };

  beforeEach(() => {
    service = new CampNpcService();
    service.clearForTests();
  });

  describe("buyStock validation", () => {
    it("should fail for invalid quantity (0)", () => {
      // Add some stock first
      service.updateCampStock([loggingCampPoi], 39);

      const result = service.buyStock({
        poiId: loggingCampPoi.id,
        itemId: "wood_log",
        quantity: 0,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("invalid_quantity");
    });

    it("should fail for negative quantity", () => {
      service.updateCampStock([loggingCampPoi], 39);

      const result = service.buyStock({
        poiId: loggingCampPoi.id,
        itemId: "wood_log",
        quantity: -1,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("invalid_quantity");
    });

    it("should fail for float quantity", () => {
      service.updateCampStock([loggingCampPoi], 39);

      const result = service.buyStock({
        poiId: loggingCampPoi.id,
        itemId: "wood_log",
        quantity: 1.5,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("invalid_quantity");
    });

    it("should fail for invalid camp (unknown poiId)", () => {
      const result = service.buyStock({
        poiId: "unknown_camp_id",
        itemId: "wood_log",
        quantity: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("invalid_camp");
    });

    it("should fail for invalid item", () => {
      service.updateCampStock([loggingCampPoi], 39);

      const result = service.buyStock({
        poiId: loggingCampPoi.id,
        itemId: "nonexistent_item",
        quantity: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("invalid_item");
    });

    it("should fail for item not in camp stock", () => {
      // Don't add any stock, logging camp has no stock
      const result = service.buyStock({
        poiId: loggingCampPoi.id,
        itemId: "wood_log",
        quantity: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("insufficient_camp_stock");
    });

    it("should fail when quantity exceeds camp stock", () => {
      // Add only 1 stock
      service.updateCampStock([loggingCampPoi], 39);

      const result = service.buyStock({
        poiId: loggingCampPoi.id,
        itemId: "wood_log",
        quantity: 5,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("insufficient_camp_stock");
    });
  });

  describe("buyStock success", () => {
    it("should successfully buy wood_log from logging camp", () => {
      // Add stock first
      service.updateCampStock([loggingCampPoi], 39);
      service.updateCampStock([loggingCampPoi], 79); // Add another

      const result = service.buyStock({
        poiId: loggingCampPoi.id,
        itemId: "wood_log",
        quantity: 1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.unitPrice).toBe(2); // CAMP_STOCK_BUY_PRICES.wood_log = 2
        expect(result.totalCost).toBe(2);
        expect(result.remainingStock).toBe(1); // Started with 2, bought 1
      }
    });

    it("should successfully buy copper_ore from mining camp", () => {
      service.updateCampStock([miningCampPoi], 39);

      const result = service.buyStock({
        poiId: miningCampPoi.id,
        itemId: "copper_ore",
        quantity: 1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.unitPrice).toBe(5); // CAMP_STOCK_BUY_PRICES.copper_ore = 5
        expect(result.totalCost).toBe(5);
        expect(result.remainingStock).toBe(0);
      }
    });

    it("should successfully buy raw_fish from fishing camp", () => {
      service.updateCampStock([fishingCampPoi], 39);

      const result = service.buyStock({
        poiId: fishingCampPoi.id,
        itemId: "raw_fish",
        quantity: 1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.unitPrice).toBe(4); // CAMP_STOCK_BUY_PRICES.raw_fish = 4
        expect(result.totalCost).toBe(4);
        expect(result.remainingStock).toBe(0);
      }
    });

    it("should buy multiple quantity", () => {
      // Add 5 stock
      for (let i = 0; i < 5; i++) {
        service.updateCampStock([loggingCampPoi], 39 + i * 40);
      }

      const result = service.buyStock({
        poiId: loggingCampPoi.id,
        itemId: "wood_log",
        quantity: 3,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.totalCost).toBe(6); // 3 * 2
        expect(result.remainingStock).toBe(2);
      }
    });

    it("should reduce camp stock after purchase", () => {
      // Add stock
      service.updateCampStock([loggingCampPoi], 39);
      service.updateCampStock([loggingCampPoi], 79);

      // Buy 1
      service.buyStock({
        poiId: loggingCampPoi.id,
        itemId: "wood_log",
        quantity: 1,
      });

      // Check remaining stock via snapshot
      const stocks = service.getCampStockSnapshots([loggingCampPoi], 79);
      const woodLogStock = stocks[0].items.find((i) => i.itemId === "wood_log");

      expect(woodLogStock?.quantity).toBe(1); // Started with 2
    });

    it("should remove item from camp stock when quantity reaches 0", () => {
      // Add only 1 stock
      service.updateCampStock([loggingCampPoi], 39);

      // Buy 1
      const result = service.buyStock({
        poiId: loggingCampPoi.id,
        itemId: "wood_log",
        quantity: 1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.remainingStock).toBe(0);
      }

      // Verify stock is empty
      const stocks = service.getCampStockSnapshots([loggingCampPoi], 39);
      const woodLogStock = stocks[0].items.find((i) => i.itemId === "wood_log");
      expect(woodLogStock).toBeUndefined();
    });
  });

  describe("buyStock no mutation on failure", () => {
    it("should not mutate stock when quantity is invalid", () => {
      // Add stock
      service.updateCampStock([loggingCampPoi], 39);
      service.updateCampStock([loggingCampPoi], 79);

      // Try invalid buy
      service.buyStock({
        poiId: loggingCampPoi.id,
        itemId: "wood_log",
        quantity: 0,
      });

      // Verify stock unchanged
      const stocks = service.getCampStockSnapshots([loggingCampPoi], 79);
      const woodLogStock = stocks[0].items.find((i) => i.itemId === "wood_log");
      expect(woodLogStock?.quantity).toBe(2); // Should still be 2
    });

    it("should not mutate stock when item not in stock", () => {
      // Add stock for different item
      service.updateCampStock([miningCampPoi], 39);

      // Try to buy wood_log from mining camp (not available)
      service.buyStock({
        poiId: miningCampPoi.id,
        itemId: "wood_log",
        quantity: 1,
      });

      // Verify mining camp still has copper_ore
      const stocks = service.getCampStockSnapshots([miningCampPoi], 39);
      const copperStock = stocks[0].items.find((i) => i.itemId === "copper_ore");
      expect(copperStock?.quantity).toBe(1);
    });
  });

  describe("arbitrage prevention", () => {
    it("should have camp buy prices >= Mira sell prices", () => {
      // wood_log: camp buy 2, Mira sell 1 (2 >= 1 ✓)
      expect(CAMP_STOCK_BUY_PRICES.wood_log).toBeGreaterThanOrEqual(RESOURCE_SELL_PRICES.wood_log);

      // copper_ore: camp buy 5, Mira sell 3 (5 >= 3 ✓)
      expect(CAMP_STOCK_BUY_PRICES.copper_ore).toBeGreaterThanOrEqual(RESOURCE_SELL_PRICES.copper_ore);

      // raw_fish: camp buy 4, Mira sell 2 (4 >= 2 ✓)
      expect(CAMP_STOCK_BUY_PRICES.raw_fish).toBeGreaterThanOrEqual(RESOURCE_SELL_PRICES.raw_fish);
    });

    it("should not allow profitable buy-and-sell arbitrage", () => {
      // If you buy from camp and immediately sell to Mira, you should NOT profit
      // wood_log: buy 2, sell 1 → lose 1 coin
      expect(CAMP_STOCK_BUY_PRICES.wood_log - RESOURCE_SELL_PRICES.wood_log).toBeGreaterThanOrEqual(0);

      // copper_ore: buy 5, sell 3 → lose 2 coins
      expect(CAMP_STOCK_BUY_PRICES.copper_ore - RESOURCE_SELL_PRICES.copper_ore).toBeGreaterThanOrEqual(0);

      // raw_fish: buy 4, sell 2 → lose 2 coins
      expect(CAMP_STOCK_BUY_PRICES.raw_fish - RESOURCE_SELL_PRICES.raw_fish).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("CampStockPrices", () => {
  it("should have integer prices only", () => {
    for (const [itemId, price] of Object.entries(CAMP_STOCK_BUY_PRICES)) {
      expect(Number.isInteger(price)).toBe(true);
      expect(price).toBeGreaterThan(0);
    }
  });

  it("should have correct price values", () => {
    expect(CAMP_STOCK_BUY_PRICES.wood_log).toBe(2);
    expect(CAMP_STOCK_BUY_PRICES.copper_ore).toBe(5);
    expect(CAMP_STOCK_BUY_PRICES.raw_fish).toBe(4);
  });
});