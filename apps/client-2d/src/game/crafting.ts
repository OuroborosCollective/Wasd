/**
 * Crafting API client
 *
 * Client-side API for crafting operations.
 * Server-authoritative: client cannot create or consume items.
 */

import { readPlayerPositionBridge } from "./PlayerPositionBridge";

export interface CraftingApiResponse {
  ok: boolean;
  result: {
    ok: boolean;
    playerId: string;
    recipeId: string;
    reason?: string;
    consumed?: Array<{ itemId: string; quantity: number }>;
    outputs?: Array<{ itemId: string; quantity: number }>;
    craftingXpReward?: number;
  };
}

/**
 * Craft a recipe.
 * Server-authoritative: consumes ingredients, adds outputs, grants XP.
 * Requires player position for station-bound recipes.
 */
export async function craftRecipe(recipeId: string): Promise<CraftingApiResponse> {
  const playerPosition = readPlayerPositionBridge();

  const response = await fetch("/api/crafting/craft", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      recipeId,
      playerPosition: playerPosition ?? undefined,
    }),
  });

  return response.json();
}