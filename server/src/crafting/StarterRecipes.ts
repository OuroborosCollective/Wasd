/**
 * STARTER CRAFTING RECIPES
 *
 * Runtime recipe truth is loaded from game-data/recipes/recipes.json.
 * The TypeScript exports stay stable for older callers, but the source of truth is data.
 */

import type { CraftingRecipe } from "./CraftingTypes.js";
import { loadCraftingRecipesFromGameData } from "./CraftingGameData.js";

// Bolt: Optimization - Direct relational comparisons (a < b ? -1 : a > b ? 1 : 0) are significantly faster than localeCompare
const GAME_DATA_RECIPES = Object.freeze([...loadCraftingRecipesFromGameData()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));

export const STARTER_CRAFTING_RECIPES: readonly CraftingRecipe[] = GAME_DATA_RECIPES;
export const ALL_CRAFTING_RECIPES: readonly CraftingRecipe[] = GAME_DATA_RECIPES;

export function getRecipeIds(): string[] {
  return ALL_CRAFTING_RECIPES.map((recipe) => recipe.id).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
