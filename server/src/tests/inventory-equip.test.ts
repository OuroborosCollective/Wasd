import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { InventorySystem } from "../modules/inventory/InventorySystem.js";
import { ItemRegistry } from "../modules/inventory/ItemRegistry.js";

describe("InventorySystem armor equip", () => {
  let inv: InventorySystem;

  beforeEach(() => {
    inv = new InventorySystem();
    vi.spyOn(ItemRegistry, "getItem").mockImplementation((id: string) => {
      if (id === "leather") {
        return {
          id: "leather",
          name: "Leather",
          type: "armor" as const,
          slot: "armor" as const,
          rarity: "common",
          description: "test",
        };
      }
      return undefined;
    });
    vi.spyOn(ItemRegistry, "hydrate").mockImplementation((item: any) => {
      if (item?.id === "leather") {
        return {
          id: "leather",
          name: "Leather",
          type: "armor",
          slot: "armor",
          rarity: "common",
          description: "test",
        };
      }
      return item;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("equipItem moves armor from bag to slot and swaps previous armor into bag", () => {
    const player: any = {
      inventory: [{ id: "leather", name: "Leather" }],
      equipment: { weapon: null, armor: { id: "old", name: "Old" } },
    };
    inv.equipItem(player, "leather");
    expect(player.equipment.armor.id).toBe("leather");
    expect(player.inventory.some((i: any) => i.id === "old")).toBe(true);
    expect(player.inventory.some((i: any) => i.id === "leather")).toBe(false);
  });
});
