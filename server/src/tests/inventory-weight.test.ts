import { describe, it, expect } from "vitest";
import { InventorySystem } from "../modules/inventory/InventorySystem.js";

describe("InventorySystem weight", () => {
  const inv = new InventorySystem();

  it("calculateWeight returns 0 for empty inventory", () => {
    const player = { inventory: [] };
    expect(inv.calculateWeight(player)).toBe(0);
  });

  it("calculateWeight returns 0 for unknown items (not in registry)", () => {
    const player = {
      inventory: [
        { id: "unknown_item_xyz", quantity: 5 },
      ],
    };
    const weight = inv.calculateWeight(player);
    expect(weight).toBe(0);
  });

  it("getMaxWeight returns default for player without maxWeight", () => {
    const player = {};
    expect(inv.getMaxWeight(player)).toBe(200);
  });

  it("getMaxWeight respects player.maxWeight", () => {
    const player = { maxWeight: 500 };
    expect(inv.getMaxWeight(player)).toBe(500);
  });

  it("getInventorySummary returns complete structure", () => {
    const player = {
      inventory: [{ id: "sword", quantity: 1 }],
      gold: 42,
    };
    const summary = inv.getInventorySummary(player);
    expect(summary.items).toHaveLength(1);
    expect(summary.gold).toBe(42);
    expect(summary.maxWeight).toBe(200);
    expect(typeof summary.weight).toBe("number");
  });
});
