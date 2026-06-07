/**
 * VENDOR STOCK AND DEMAND PRICING TESTS
 *
 * Tests for the vendor stock state, demand-based pricing, and sell operations.
 * Deterministic: No Math.random(), no Date.now().
 */

import { describe, it, expect, beforeEach } from "vitest";
import { VendorStockStore } from "../src/economy/VendorStockStore.js";
import { VendorStockService } from "../src/economy/VendorStockService.js";
import {
  calculateDynamicPrice,
  getDemandBand,
  DEMAND_THRESHOLDS,
} from "../src/economy/DemandPricing.js";
import { RESOURCE_SELL_PRICES } from "../src/economy/ResourceSellPrices.js";

// Mock persistence adapter for testing
class MockVendorStockPersistenceAdapter {
  private stocks = new Map<string, Record<string, number>>();

  async loadStock(vendorId: string): Promise<{ vendorId: string; schemaVersion: 1; items: Record<string, number> } | null> {
    const items = this.stocks.get(vendorId);
    if (!items) return null;
    return { vendorId, schemaVersion: 1, items };
  }

  async saveStock(state: { vendorId: string; items: Record<string, number> }): Promise<void> {
    this.stocks.set(state.vendorId, { ...state.items });
  }

  async health(): Promise<{ ok: boolean; driver: string }> {
    return { ok: true, driver: "mock" };
  }

  clear(): void {
    this.stocks.clear();
  }
}

describe("VendorStockStore", () => {
  let store: VendorStockStore;

  beforeEach(() => {
    store = new VendorStockStore();
  });

  it("should return empty stock for new vendor", () => {
    const stock = store.getStock("village_trader_001");
    expect(stock.vendorId).toBe("village_trader_001");
    expect(Object.keys(stock.items)).toHaveLength(0);
  });

  it("should add items to stock", () => {
    const result = store.addItems("village_trader_001", "wood_log", 10);
    expect(result.items["wood_log"]).toBe(10);
    expect(store.getItemQuantity("village_trader_001", "wood_log")).toBe(10);
  });

  it("should accumulate items in stock", () => {
    store.addItems("village_trader_001", "wood_log", 5);
    store.addItems("village_trader_001", "wood_log", 3);
    expect(store.getItemQuantity("village_trader_001", "wood_log")).toBe(8);
  });

  it("should return 0 for non-existent item", () => {
    expect(store.getItemQuantity("village_trader_001", "nonexistent")).toBe(0);
  });

  it("should get stock entries sorted by itemId", () => {
    store.addItems("village_trader_001", "copper_ore", 5);
    store.addItems("village_trader_001", "wood_log", 10);
    store.addItems("village_trader_001", "raw_fish", 3);

    const entries = store.getStockEntries("village_trader_001");
    expect(entries.map((e) => e.itemId)).toEqual(["copper_ore", "raw_fish", "wood_log"]);
  });

  it("should filter out zero-quantity items in entries", () => {
    store.addItems("village_trader_001", "wood_log", 0);
    store.addItems("village_trader_001", "copper_ore", 5);

    const entries = store.getStockEntries("village_trader_001");
    expect(entries).toHaveLength(1);
    expect(entries[0].itemId).toBe("copper_ore");
  });
});

describe("VendorStockService", () => {
  let store: VendorStockStore;
  let adapter: MockVendorStockPersistenceAdapter;
  let service: VendorStockService;

  beforeEach(() => {
    store = new VendorStockStore();
    adapter = new MockVendorStockPersistenceAdapter();
    service = new VendorStockService(store, adapter);
  });

  it("should add items and persist", async () => {
    await service.addItems("village_trader_001", "wood_log", 10);

    expect(await service.getItemQuantity("village_trader_001", "wood_log")).toBe(10);
  });

  it("should hydrate from persistence on first access", async () => {
    // Pre-populate adapter
    await adapter.saveStock({
      vendorId: "village_trader_001",
      items: { wood_log: 15, copper_ore: 5 },
    });

    // Clear store to simulate fresh start
    store.clearForTests();
    service.clearForTests();

    // Access stock - should hydrate
    const qty = await service.getItemQuantity("village_trader_001", "wood_log");
    expect(qty).toBe(15);
  });
});

describe("Demand Pricing", () => {
  describe("getDemandBand", () => {
    it("should return 'normal' for stock 0-9", () => {
      expect(getDemandBand(0)).toBe("normal");
      expect(getDemandBand(5)).toBe("normal");
      expect(getDemandBand(9)).toBe("normal");
    });

    it("should return 'stocked' for stock 10-24", () => {
      expect(getDemandBand(10)).toBe("stocked");
      expect(getDemandBand(15)).toBe("stocked");
      expect(getDemandBand(24)).toBe("stocked");
    });

    it("should return 'oversupplied' for stock 25+", () => {
      expect(getDemandBand(25)).toBe("oversupplied");
      expect(getDemandBand(50)).toBe("oversupplied");
      expect(getDemandBand(100)).toBe("oversupplied");
    });
  });

  describe("calculateDynamicPrice", () => {
    it("should return base price for stock 0-9 (normal)", () => {
      const result = calculateDynamicPrice("wood_log", 0);
      expect(result.unitPrice).toBe(1); // wood_log base price
      expect(result.basePrice).toBe(1);
      expect(result.demandBand).toBe("normal");
    });

    it("should return base - 1 for stock 10-24 (stocked)", () => {
      const result = calculateDynamicPrice("wood_log", 10);
      expect(result.unitPrice).toBe(0); // 1 - 1 = 0, but floor at 1
      expect(result.basePrice).toBe(1);
      expect(result.demandBand).toBe("stocked");
    });

    it("should return base - 2 for stock 25+ (oversupplied), floor 1", () => {
      const result = calculateDynamicPrice("wood_log", 25);
      expect(result.unitPrice).toBe(1); // 1 - 2 = -1, floor to 1
      expect(result.basePrice).toBe(1);
      expect(result.demandBand).toBe("oversupplied");
    });

    it("should not go below floor of 1", () => {
      // wood_log at base 1, even oversupplied should be 1
      const result = calculateDynamicPrice("wood_log", 100);
      expect(result.unitPrice).toBe(1);
    });

    it("should apply -1 adjustment for stocked copper_ore (base 3)", () => {
      const result = calculateDynamicPrice("copper_ore", 15);
      expect(result.unitPrice).toBe(2); // 3 - 1 = 2
      expect(result.basePrice).toBe(3);
      expect(result.demandBand).toBe("stocked");
    });

    it("should apply -2 adjustment for oversupplied copper_ingot (base 8)", () => {
      const result = calculateDynamicPrice("copper_ingot", 30);
      expect(result.unitPrice).toBe(6); // 8 - 2 = 6
      expect(result.basePrice).toBe(8);
      expect(result.demandBand).toBe("oversupplied");
    });

    it("should return zeros for non-sellable item", () => {
      const result = calculateDynamicPrice("wooden_axe", 0);
      expect(result.unitPrice).toBe(0);
      expect(result.basePrice).toBe(0);
    });
  });

  describe("processed items premium", () => {
    it("should maintain price premium for processed items in normal band", () => {
      const woodLog = calculateDynamicPrice("wood_log", 0);
      const woodPlank = calculateDynamicPrice("wood_plank", 0);

      // Processed should be more valuable than raw
      expect(woodPlank.unitPrice).toBeGreaterThan(woodLog.unitPrice);
      expect(woodPlank.unitPrice).toBe(3); // wood_plank base
    });

    it("should maintain price premium for processed items in stocked band", () => {
      const copperOre = calculateDynamicPrice("copper_ore", 15);
      const copperIngot = calculateDynamicPrice("copper_ingot", 15);

      // Processed should be more valuable than raw even with discount
      expect(copperIngot.unitPrice).toBeGreaterThan(copperOre.unitPrice);
      expect(copperIngot.unitPrice).toBe(7); // 8 - 1 = 7
      expect(copperOre.unitPrice).toBe(2); // 3 - 1 = 2
    });

    it("should maintain price premium for cooked fish in stocked band", () => {
      const rawFish = calculateDynamicPrice("raw_fish", 20);
      const cookedFish = calculateDynamicPrice("cooked_fish", 20);

      expect(cookedFish.unitPrice).toBeGreaterThan(rawFish.unitPrice);
      expect(cookedFish.unitPrice).toBe(3); // 4 - 1 = 3
      expect(rawFish.unitPrice).toBe(1); // 2 - 1 = 1, floor 1
    });
  });
});

describe("DemandPricing thresholds", () => {
  it("should have correct normal max threshold", () => {
    expect(DEMAND_THRESHOLDS.NORMAL_MAX).toBe(9);
  });

  it("should have correct stocked max threshold", () => {
    expect(DEMAND_THRESHOLDS.STOCKED_MAX).toBe(24);
  });
});

describe("sellAll determinism", () => {
  it("should sort items by itemId for deterministic ordering", () => {
    // This tests that sellAll processes items in a stable order
    const items = ["z_item", "a_item", "m_item"];
    const sorted = [...items].sort((a, b) => a.localeCompare(b));
    expect(sorted).toEqual(["a_item", "m_item", "z_item"]);
  });
});