/**
 * STARTER CRAFTING RECIPES
 *
 * Deterministic starter recipes for the crafting system.
 * No Date.now(), no Math.random(), stable recipe ordering.
 */

import type { CraftingRecipe } from "./CraftingTypes.js";

export const STARTER_CRAFTING_RECIPES: readonly CraftingRecipe[] = [
  {
    id: "craft_wood_plank",
    title: "Craft Wood Plank",
    requiredLevel: 1,
    craftingXpReward: 20,
    craftTicks: 5,
    ingredients: [
      {
        itemId: "wood_log",
        quantity: 2,
      },
    ],
    outputs: [
      {
        itemId: "wood_plank",
        quantity: 1,
      },
    ],
  },
  {
    id: "smelt_copper_ingot",
    title: "Smelt Copper Ingot",
    requiredLevel: 1,
    craftingXpReward: 30,
    craftTicks: 8,
    ingredients: [
      {
        itemId: "copper_ore",
        quantity: 3,
      },
    ],
    outputs: [
      {
        itemId: "copper_ingot",
        quantity: 1,
      },
    ],
  },
  {
    id: "cook_raw_fish",
    title: "Cook Raw Fish",
    requiredLevel: 1,
    craftingXpReward: 15,
    craftTicks: 4,
    ingredients: [
      {
        itemId: "raw_fish",
        quantity: 1,
      },
    ],
    outputs: [
      {
        itemId: "cooked_fish",
        quantity: 1,
      },
    ],
  },
] as const;

export function getRecipeIds(): string[] {
  return STARTER_CRAFTING_RECIPES.map((recipe) => recipe.id).sort();
}