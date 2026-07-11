/**
 * CRAFTING TYPES
 *
 * Deterministic crafting recipe types for server-authoritative crafting.
 */

import type { InventoryItemId } from "../inventory/InventoryTypes.js";
import type { ProcessingStationType } from "./ProcessingStations.js";

export type RecipeId =
  | "saw_wood_planks"
  | "craft_wood_plank"
  | "smelt_copper_ingot"
  | "cook_raw_fish"
  | "craft_wooden_axe"
  | "craft_copper_pickaxe"
  | "craft_simple_fishing_rod"
  | "craft_copper_axe"
  | "craft_reinforced_pickaxe"
  | "craft_reinforced_fishing_rod";

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
  /** Zero means the current runtime commits the recipe immediately in one tick. */
  craftTicks: number;
  stationType?: ProcessingStationType;
}

export type CraftingFailureReason =
  | "crafted"
  | "recipe_not_found"
  | "level_too_low"
  | "missing_ingredients"
  | "inventory_full"
  | "invalid_player"
  | "invalid_tick"
  | "invalid_operation_id"
  | "missing_player_position"
  | "invalid_player_position"
  | "station_too_far"
  | "station_type_mismatch"
  | "transaction_failed"
  | "transaction_recovery_failed";

export interface CraftingResult {
  ok: boolean;
  playerId: string;
  recipeId: RecipeId | string;
  reason?: CraftingFailureReason;
  consumed?: RecipeIngredient[];
  outputs?: RecipeOutput[];
  craftingXpReward?: number;
  currentTick?: number;
  craftHash?: string;
  receiptHash?: string;
  originUids?: readonly string[];
  replayed?: boolean;
  rollbackOk?: boolean;
}

export interface CraftingRecipeSnapshot {
  id: RecipeId;
  title: string;
  requiredLevel: number;
  craftingXpReward: number;
  ingredients: RecipeIngredient[];
  outputs: RecipeOutput[];
  craftTicks: number;
  stationType?: ProcessingStationType;
  craftable: boolean;
  blockedReason?: "level_too_low" | "missing_ingredients" | "station_too_far" | "missing_player_position";
}
