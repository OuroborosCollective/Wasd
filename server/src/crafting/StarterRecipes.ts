/**
 * STARTER CRAFTING RECIPES
 *
 * Deterministic starter recipes for the crafting system.
 * No Date.now(), no Math.random(), stable recipe ordering.
 */

import type { CraftingRecipe } from "./CraftingTypes.js";
import { UPGRADE_CRAFTING_RECIPES } from "./UpgradeRecipes.js";

export const STARTER_CRAFTING_RECIPES: readonly CraftingRecipe[] = [
  {
    id: "craft_wood_plank",
    title: "Craft Wood Plank",
    requiredLevel: 1,
    craftingXpReward: 20,
    craftTicks: 5,
    stationType: "workbench",
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
    stationType: "furnace",
    ingredients: [
      {
        itemId: "copper_ore",
        quantity: 2,
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
    stationType: "campfire",
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
  {
    id: "craft_wooden_axe",
    title: "Craft Wooden Axe",
    requiredLevel: 1,
    craftingXpReward: 35,
    craftTicks: 8,
    stationType: "workbench",
    ingredients: [
      { itemId: "wood_plank", quantity: 2 },
      { itemId: "copper_ingot", quantity: 1 },
    ],
    outputs: [
      { itemId: "wooden_axe", quantity: 1 },
    ],
  },
  {
    id: "craft_copper_pickaxe",
    title: "Craft Copper Pickaxe",
    requiredLevel: 1,
    craftingXpReward: 40,
    craftTicks: 10,
    stationType: "workbench",
    ingredients: [
      { itemId: "wood_plank", quantity: 1 },
      { itemId: "copper_ingot", quantity: 2 },
    ],
    outputs: [
      { itemId: "copper_pickaxe", quantity: 1 },
    ],
  },
  {
    id: "craft_simple_fishing_rod",
    title: "Craft Simple Fishing Rod",
    requiredLevel: 1,
    craftingXpReward: 25,
    craftTicks: 6,
    stationType: "workbench",
    ingredients: [
      { itemId: "wood_plank", quantity: 1 },
      { itemId: "raw_fish", quantity: 1 },
    ],
    outputs: [
      { itemId: "simple_fishing_rod", quantity: 1 },
    ],
  },
] as const;

/**
 * Combined crafting recipes: starter recipes + upgrade recipes.
 * Used by CraftingService to load all available recipes.
 */
export const ALL_CRAFTING_RECIPES: readonly CraftingRecipe[] = [
  ...STARTER_CRAFTING_RECIPES,
  ...UPGRADE_CRAFTING_RECIPES,
];

export function getRecipeIds(): string[] {
  return ALL_CRAFTING_RECIPES.map((recipe) => recipe.id).sort();
}