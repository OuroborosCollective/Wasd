/**
 * CRAFTING TYPES
 *
 * Deterministic crafting recipe types for server-authoritative crafting.
 * No Date.now(), no Math.random(), stable recipe IDs and ordering.
 */

import type { InventoryItemId } from "../inventory/InventoryTypes.js";

export type RecipeId =
  | "craft_wood_plank"
  | "smelt_copper_ingot"
  | "cook_raw_fish";

export interface RecipeIngredient {
  itemId: InventoryItemId;
  quantity: number;
}

export interface RecipeOutput {
  itemId: InventoryItemId;
  quantity: number;
}

export interface CraftingRecipe {
  id: RecipeId;
  title: string;
  requiredLevel: number;
  craftingXpReward: number;
  ingredients: RecipeIngredient[];
  outputs: RecipeOutput[];
  craftTicks: number;
}

export interface CraftingResult {
  ok: boolean;
  playerId: string;
  recipeId: RecipeId | string;
  reason?:
    | "crafted"
    | "recipe_not_found"
    | "level_too_low"
    | "missing_ingredients"
    | "inventory_full"
    | "invalid_player";
  consumed?: RecipeIngredient[];
  outputs?: RecipeOutput[];
  craftingXpReward?: number;
}

export interface CraftingRecipeSnapshot {
  id: RecipeId;
  title: string;
  requiredLevel: number;
  craftingXpReward: number;
  ingredients: RecipeIngredient[];
  outputs: RecipeOutput[];
  craftTicks: number;
  craftable: boolean;
  blockedReason?: "level_too_low" | "missing_ingredients";
}