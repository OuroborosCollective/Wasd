/**
 * CRAFTING UNIT TESTS
 *
 * Tests for deterministic crafting recipes and service.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { CraftingService } from "../crafting/CraftingService";
import { STARTER_CRAFTING_RECIPES } from "../crafting/StarterRecipes";

describe("Starter crafting recipes", () => {
  it("uses stable sorted recipe ids", () => {
    const service = new CraftingService(STARTER_CRAFTING_RECIPES);
    expect(service.listRecipes().map((recipe) => recipe.id)).toEqual([
      "cook_raw_fish",
      "craft_wood_plank",
      "smelt_copper_ingot",
    ]);
  });

  it("defines deterministic plank recipe", () => {
    const plank = STARTER_CRAFTING_RECIPES.find(
      (recipe) => recipe.id === "craft_wood_plank",
    );

    expect(plank).toEqual(
      expect.objectContaining({
        requiredLevel: 1,
        craftingXpReward: 20,
        craftTicks: 5,
      }),
    );

    expect(plank?.ingredients).toEqual([
      {
        itemId: "wood_log",
        quantity: 2,
      },
    ]);

    expect(plank?.outputs).toEqual([
      {
        itemId: "wood_plank",
        quantity: 1,
      },
    ]);
  });

  it("defines deterministic copper ingot recipe", () => {
    const ingot = STARTER_CRAFTING_RECIPES.find(
      (recipe) => recipe.id === "smelt_copper_ingot",
    );

    expect(ingot).toEqual(
      expect.objectContaining({
        requiredLevel: 1,
        craftingXpReward: 30,
        craftTicks: 8,
      }),
    );

    expect(ingot?.ingredients).toEqual([
      {
        itemId: "copper_ore",
        quantity: 3,
      },
    ]);

    expect(ingot?.outputs).toEqual([
      {
        itemId: "copper_ingot",
        quantity: 1,
      },
    ]);
  });

  it("defines deterministic cooked fish recipe", () => {
    const fish = STARTER_CRAFTING_RECIPES.find(
      (recipe) => recipe.id === "cook_raw_fish",
    );

    expect(fish).toEqual(
      expect.objectContaining({
        requiredLevel: 1,
        craftingXpReward: 15,
        craftTicks: 4,
      }),
    );

    expect(fish?.ingredients).toEqual([
      {
        itemId: "raw_fish",
        quantity: 1,
      },
    ]);

    expect(fish?.outputs).toEqual([
      {
        itemId: "cooked_fish",
        quantity: 1,
      },
    ]);
  });

  it("has all three starter recipes", () => {
    const service = new CraftingService(STARTER_CRAFTING_RECIPES);
    expect(service.listRecipes()).toHaveLength(3);
  });
});