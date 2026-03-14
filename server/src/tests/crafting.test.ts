import { describe, it, expect, beforeEach } from "vitest";
import { CraftingSystem } from "../modules/crafting/CraftingSystem.js";
import { RecipeRegistry } from "../modules/crafting/RecipeRegistry.js";
import { RecipeMatcher } from "../modules/crafting/RecipeMatcher.js";

// ---------------------------------------------------------------------------
// CraftingSystem
// ---------------------------------------------------------------------------
describe("CraftingSystem", () => {
  let crafting: CraftingSystem;

  const ironSwordRecipe = {
    id: "iron_sword",
    skill: "smithing",
    requiredLevel: 5,
    ingredients: [
      { id: "iron_ingot", amount: 2 },
      { id: "wood_handle", amount: 1 },
    ],
    result: { id: "iron_sword", amount: 1 },
    xp: 20,
  };

  beforeEach(() => { crafting = new CraftingSystem(); });

  it("canCraft() returns true when player meets level and has ingredients", () => {
    const player = { skills: { smithing: { level: 5 } } };
    const inventory = [
      { id: "iron_ingot", amount: 2 },
      { id: "wood_handle", amount: 1 },
    ];
    expect(crafting.canCraft(player as any, ironSwordRecipe.id)).toBe(true);
  });

  it("canCraft() returns false when skill level is too low", () => {
    const player = { skills: { smithing: { level: 4 } } };
    const inventory = [
      { id: "iron_ingot", amount: 2 },
      { id: "wood_handle", amount: 1 },
    ];
    expect(crafting.canCraft(player as any, ironSwordRecipe.id)).toBe(false);
  });

  it("canCraft() returns false when ingredient is missing", () => {
    const player = { skills: { smithing: { level: 10 } } };
    const inventory = [{ id: "iron_ingot", amount: 2 }]; // missing wood_handle
    expect(crafting.canCraft(player as any, ironSwordRecipe.id)).toBe(false);
  });

  it("canCraft() returns false when ingredient amount is insufficient", () => {
    const player = { skills: { smithing: { level: 10 } } };
    const inventory = [
      { id: "iron_ingot", amount: 1 }, // need 2
      { id: "wood_handle", amount: 1 },
    ];
    expect(crafting.canCraft(player as any, ironSwordRecipe.id)).toBe(false);
  });

  it("canCraft() returns false when player has no skills object", () => {
    const player = {};
    const inventory = [
      { id: "iron_ingot", amount: 2 },
      { id: "wood_handle", amount: 1 },
    ];
    expect(crafting.canCraft(player as any, ironSwordRecipe.id)).toBe(false);
  });

  it("craft() returns crafted: true", () => {
    const result = crafting.craft({} as any, ironSwordRecipe.id);
    expect((result as any).success).toBe(true);
  });

  it("craft() returns the correct itemId", () => {
    const result = crafting.craft({} as any, ironSwordRecipe.id);
    expect((result as any).item).toBe("iron_sword");
  });

  it("craft() returns the correct amount", () => {
    const result = crafting.craft({} as any, ironSwordRecipe.id);
    expect((result as any).amount).toBe(1);
  });

  it("craft() returns the correct xp", () => {
    const result = crafting.craft({} as any, ironSwordRecipe.id);
    expect((result as any).xp).toBe(20);
  });

  it("craft() defaults amount to 1 if result.amount is undefined", () => {
    const recipe = { ...ironSwordRecipe, id: "widget" };
    const result = crafting.craft({} as any, recipe.id);
    expect((result as any).amount).toBe(1);
  });

  it("craft() defaults xp to 0 if recipe.xp is undefined", () => {
    const recipe = { ...ironSwordRecipe, id: "widget" };
    // @ts-ignore
    delete recipe.xp;
    const result = crafting.craft({} as any, recipe.id);
    expect((result as any).xp).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// RecipeRegistry
// ---------------------------------------------------------------------------
describe("RecipeRegistry", () => {
  it("contains the iron_sword recipe", () => {
    expect(RecipeRegistry.iron_sword).toBeDefined();
  });

  it("iron_sword recipe has correct skill", () => {
    expect(RecipeRegistry.iron_sword.skill).toBe("smithing");
  });

  it("iron_sword recipe requires level 5", () => {
    expect(RecipeRegistry.iron_sword.requiredLevel).toBe(5);
  });

  it("iron_sword recipe has 2 ingredients", () => {
    expect(RecipeRegistry.iron_sword.ingredients).toHaveLength(2);
  });

  it("iron_sword recipe grants 20 xp", () => {
    expect(RecipeRegistry.iron_sword.xp).toBe(20);
  });

  it("iron_sword recipe result is iron_sword", () => {
    expect(RecipeRegistry.iron_sword.result.id).toBe("iron_sword");
  });
});

// ---------------------------------------------------------------------------
// RecipeMatcher
// ---------------------------------------------------------------------------
describe("RecipeMatcher", () => {
  const recipes = [
    { inputs: ["iron_ingot", "wood_handle"], id: "iron_sword" },
    { inputs: ["gold_ingot", "gem"], id: "gold_ring" },
  ];
  let matcher: RecipeMatcher;

  beforeEach(() => { matcher = new RecipeMatcher(); });

  it("matches when inputs exactly match recipe (same order)", () => {
    const found = matcher.match(["iron_ingot", "wood_handle"], recipes);
    expect(found?.id).toBe("iron_sword");
  });

  it("matches regardless of input order", () => {
    const found = matcher.match(["wood_handle", "iron_ingot"], recipes);
    expect(found?.id).toBe("iron_sword");
  });

  it("returns null when no recipe matches", () => {
    const found = matcher.match(["unknown_item"], recipes);
    expect(found).toBeNull();
  });

  it("matches gold_ring recipe", () => {
    const found = matcher.match(["gem", "gold_ingot"], recipes);
    expect(found?.id).toBe("gold_ring");
  });

  it("returns null for empty input", () => {
    const found = matcher.match([], recipes);
    expect(found).toBeNull();
  });
});
