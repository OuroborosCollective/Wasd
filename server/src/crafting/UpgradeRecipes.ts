/**
 * UPGRADE CRAFTING RECIPES
 *
 * Deterministic upgrade recipes for gathering tool improvements.
 * No Date.now(), no Math.random(), stable recipe ordering.
 *
 * Recipes:
 * - craft_copper_axe: Upgrade wooden_axe to copper_axe (Tier 2)
 * - craft_reinforced_pickaxe: Upgrade copper_pickaxe to reinforced_pickaxe (Tier 2)
 * - craft_reinforced_fishing_rod: Upgrade simple_fishing_rod to reinforced_fishing_rod (Tier 2)
 */

import type { CraftingRecipe } from "./CraftingTypes.js";

export const UPGRADE_CRAFTING_RECIPES: readonly CraftingRecipe[] = [
  {
    id: "craft_copper_axe",
    title: "Craft Copper Axe",
    requiredLevel: 1,
    craftingXpReward: 45,
    craftTicks: 10,
    stationType: "workbench",
    ingredients: [
      { itemId: "wooden_axe", quantity: 1 },
      { itemId: "wood_plank", quantity: 2 },
      { itemId: "copper_ingot", quantity: 1 },
    ],
    outputs: [
      { itemId: "copper_axe", quantity: 1 },
    ],
  },
  {
    id: "craft_reinforced_pickaxe",
    title: "Craft Reinforced Pickaxe",
    requiredLevel: 1,
    craftingXpReward: 50,
    craftTicks: 12,
    stationType: "workbench",
    ingredients: [
      { itemId: "copper_pickaxe", quantity: 1 },
      { itemId: "wood_plank", quantity: 1 },
      { itemId: "copper_ingot", quantity: 2 },
    ],
    outputs: [
      { itemId: "reinforced_pickaxe", quantity: 1 },
    ],
  },
  {
    id: "craft_reinforced_fishing_rod",
    title: "Craft Reinforced Fishing Rod",
    requiredLevel: 1,
    craftingXpReward: 40,
    craftTicks: 10,
    stationType: "workbench",
    ingredients: [
      { itemId: "simple_fishing_rod", quantity: 1 },
      { itemId: "wood_plank", quantity: 2 },
      { itemId: "copper_ingot", quantity: 1 },
    ],
    outputs: [
      { itemId: "reinforced_fishing_rod", quantity: 1 },
    ],
  },
] as const;

export function getUpgradeRecipeIds(): string[] {
  return UPGRADE_CRAFTING_RECIPES.map((recipe) => recipe.id).sort();
}