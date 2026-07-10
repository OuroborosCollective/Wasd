import { describe, expect, it } from "vitest";
import { getVendorActorEvidence } from "../../economy/VillageVendors";
import type { VendorStockState } from "../../economy/VendorStockTypes";
import { deriveEconomyWorkOrders } from "../../quests/EconomyWorkOrderService";

const ACTOR = getVendorActorEvidence("village_trader_001");
if (!ACTOR) throw new Error("test vendor actor missing");

function stock(items: Readonly<Record<string, number>>, vendorId = "village_trader_001"): VendorStockState {
  return {
    vendorId,
    schemaVersion: 1,
    items,
  };
}

describe("EconomyWorkOrderService", () => {
  it("derives deterministic work orders from real vendor actor and stock", () => {
    const input = {
      stock: stock({ raw_fish: 2, wood_log: 1 }),
      tick: 512,
      actor: ACTOR,
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
        npcId: ACTOR.actorId,
        npcActorHash: ACTOR.definitionHash,
        tick: 512,
      }),
    );
    expect(first.every((order) => /^[a-f0-9]+$/.test(order.stateHash))).toBe(true);
  });

  it("keeps order identity stable when only the observation tick changes", () => {
    const first = deriveEconomyWorkOrders({
      stock: stock({ wood_log: 1 }),
      tick: 512,
      actor: ACTOR,
    }).find((order) => order.itemId === "wood_log");
    const later = deriveEconomyWorkOrders({
      stock: stock({ wood_log: 1 }),
      tick: 513,
      actor: ACTOR,
    }).find((order) => order.itemId === "wood_log");

    expect(first?.tick).toBe(512);
    expect(later?.tick).toBe(513);
    expect(first?.stateHash).toBe(later?.stateHash);
    expect(first?.orderId).toBe(later?.orderId);
  });

  it("does not create orders for fully stocked resources", () => {
    const orders = deriveEconomyWorkOrders({
      stock: stock({ copper_ore: 4, raw_fish: 5, wood_log: 6 }),
      tick: 512,
      actor: ACTOR,
    });

    expect(orders).toEqual([]);
  });

  it("changes the state hash when stock changes", () => {
    const lowStock = deriveEconomyWorkOrders({
      stock: stock({ wood_log: 0 }),
      tick: 512,
      actor: ACTOR,
    }).find((order) => order.itemId === "wood_log");

    const lessLowStock = deriveEconomyWorkOrders({
      stock: stock({ wood_log: 2 }),
      tick: 512,
      actor: ACTOR,
    }).find((order) => order.itemId === "wood_log");

    expect(lowStock?.requiredQuantity).toBe(6);
    expect(lessLowStock?.requiredQuantity).toBe(4);
    expect(lowStock?.stateHash).not.toBe(lessLowStock?.stateHash);
  });

  it("rejects stock that does not belong to the vendor actor", () => {
    expect(() => deriveEconomyWorkOrders({
      stock: stock({ wood_log: 0 }, "unknown_vendor"),
      tick: 512,
      actor: ACTOR,
    })).toThrow(/actor_vendor_mismatch/);
  });

  it("rejects missing runtime tick evidence", () => {
    expect(() => deriveEconomyWorkOrders({
      stock: stock({ wood_log: 0 }),
      tick: Number.NaN,
      actor: ACTOR,
    })).toThrow(/tick_required/);
  });
});
