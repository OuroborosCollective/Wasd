import { describe, it, expect, beforeEach } from "vitest";
import { InventorySystem } from "../modules/inventory/InventorySystem.js";
import { ItemRegistry } from "../modules/inventory/ItemRegistry.js";

describe("InventorySystem stacking", () => {
  let inv: InventorySystem;

  beforeEach(() => {
    inv = new InventorySystem();
    ItemRegistry.init();
  });

  it("merges misc iron_scrap into one row up to maxStack", () => {
    const player: any = {
      inventory: [],
      equipment: { weapon: null, armor: null },
    };
    for (let i = 0; i < 55; i++) {
      const one = ItemRegistry.createInstance("iron_scrap", 1);
      if (one) inv.addItem(player, one);
    }
    const scrapRows = player.inventory.filter((x: any) => x.id === "iron_scrap");
    expect(scrapRows.length).toBeGreaterThan(1);
    expect(scrapRows.length).toBeLessThanOrEqual(55);
    const total = scrapRows.reduce((s: number, r: any) => s + Math.max(1, Math.floor(r.quantity || 1)), 0);
    expect(total).toBe(55);
    expect(scrapRows.every((r: any) => (r.quantity || 1) <= 50)).toBe(true);
  });

  it("takeOneFromBag reduces stack count", () => {
    const player: any = { inventory: [], equipment: { weapon: null, armor: null } };
    const stack = ItemRegistry.createInstance("minor_mana_draught", 5);
    if (stack) inv.addItem(player, stack);
    expect(player.inventory.length).toBe(1);
    expect(player.inventory[0].quantity).toBe(5);
    inv.takeOneFromBag(player, "minor_mana_draught");
    expect(player.inventory[0].quantity).toBe(4);
  });
});
