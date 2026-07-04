import { describe, expect, it } from "vitest";
import type { VendorStockState } from "../../economy/VendorStockTypes";
import { deriveEconomyWorkOrders } from "../../quests/EconomyWorkOrderService";

function stock(items: Readonly<Record<string, number>>): VendorStockState {
  return {
    vendorId: "village_trader_001",
    schemaVersion: 1,
    items,
  };
}

describe("EconomyWorkOrderService", () => {
  it("derives deterministic work orders from real vendor stock", () => {
    const input = {
      stock: stock({ raw_fish: 2, wood_log: 1 }),
      tick: 512,
      npcId: "village_trader_001",
    };

    const first = deriveEconomyWorkOrders(input);
    const second = deriveEconomyWorkOrders(input);

    expect(first).toEqual(second);
    expect(first.map((order) => order.itemId)).toEqual(["copper_ore", "raw_fish", "wood_log"]);
    expect(first.find((order) => order.itemId === "wood_log")).toEqual(
      expect.objectContaining({
        currentStock: 1,
        requiredQuantity: 5,
        vendorId: "village_trader_001",
        npcId: "village_trader_001",
        tick: 512,
      }),
    );
    expect(first.every((order) => /^[a-f0-9]+$/.test(order.stateHash))).toBe(true);
  });

  it("does not create orders for fully stocked resources", () => {
    const orders = deriveEconomyWorkOrders({
      stock: stock({ copper_ore: 4, raw_fish: 5, wood_log: 6 }),
      tick: 512,
      npcId: "village_trader_001",
    });

    expect(orders).toEqual([]);
  });

  it("changes the state hash when stock changes", () => {
    const lowStock = deriveEconomyWorkOrders({
      stock: stock({ wood_log: 0 }),
      tick: 512,
      npcId: "village_trader_001",
    }).find((order) => order.itemId === "wood_log");

    const lessLowStock = deriveEconomyWorkOrders({
      stock: stock({ wood_log: 2 }),
      tick: 512,
      npcId: "village_trader_001",
    }).find((order) => order.itemId === "wood_log");

    expect(lowStock?.requiredQuantity).toBe(6);
    expect(lessLowStock?.requiredQuantity).toBe(4);
    expect(lowStock?.stateHash).not.toBe(lessLowStock?.stateHash);
  });
});
