import { describe, it, expect, beforeEach } from "vitest";
import { CraftingSystem } from "../modules/crafting/CraftingSystem.js";

// ---------------------------------------------------------------------------
// CraftingSystem
// ---------------------------------------------------------------------------
describe("CraftingSystem", () => {
  let crafting: CraftingSystem;

  beforeEach(() => {
    crafting = new CraftingSystem();
  });

  it("canCraft() returns true when player meets level and has ingredients", () => {
    // Note: The CraftingSystem initializes with default recipes like "iron_sword_craft"
    const player = {
      skills: { smithing: { level: 5 } },
      inventory: [
        { id: "iron_scrap" }, { id: "iron_scrap" }, { id: "iron_scrap" }
      ]
    };
    const result = crafting.canCraft(player, "iron_sword_craft");
    expect(result.possible).toBe(true);
  });

  it("canCraft() returns false when skill level is too low", () => {
    const player = {
      skills: { smithing: { level: 0 } },
      inventory: [
        { id: "iron_scrap" }, { id: "iron_scrap" }, { id: "iron_scrap" }
      ]
    };
    const result = crafting.canCraft(player, "iron_sword_craft");
    expect(result.possible).toBe(false);
  });

  it("canCraft() returns false when ingredient is missing", () => {
    const player = {
      skills: { smithing: { level: 10 } },
      inventory: [{ id: "iron_scrap" }] // need 3
    };
    const result = crafting.canCraft(player, "iron_sword_craft");
    expect(result.possible).toBe(false);
  });

  it("craft() returns success: true", () => {
    const player = {
      skills: { smithing: { level: 10 } },
      inventory: [
        { id: "iron_scrap" }, { id: "iron_scrap" }, { id: "iron_scrap" }
      ]
    };
    const result = crafting.craft(player, "iron_sword_craft");
    expect(result.success).toBe(true);
  });

  it("craft() returns the correct xp", () => {
    const player = {
      skills: { smithing: { level: 10 } },
      inventory: [
        { id: "iron_scrap" }, { id: "iron_scrap" }, { id: "iron_scrap" }
      ]
    };
    const result = crafting.craft(player, "iron_sword_craft");
    expect(result.xp).toBe(50);
  });
});
