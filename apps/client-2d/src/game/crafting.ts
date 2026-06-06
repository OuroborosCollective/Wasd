/**
 * Crafting API client
 *
 * Client-side API for crafting operations.
 * Server-authoritative: client cannot create or consume items.
 */

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
 */
export async function craftRecipe(recipeId: string): Promise<CraftingApiResponse> {
  const response = await fetch("/api/crafting/craft", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ recipeId }),
  });

  return response.json();
}