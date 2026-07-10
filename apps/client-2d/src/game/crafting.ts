/**
 * Crafting API client.
 * The client requests a recipe only; actor, position, tick and success are server-owned.
 */

export interface CraftingApiResponse {
  ok: boolean;
  result?: {
    ok: boolean;
    playerId: string;
    recipeId: string;
    reason?: string;
    consumed?: Array<{ itemId: string; quantity: number }>;
    outputs?: Array<{ itemId: string; quantity: number }>;
    craftingXpReward?: number;
    currentTick?: number;
    craftHash?: string;
    originUids?: readonly string[];
    replayed?: boolean;
    rollbackOk?: boolean;
  };
  canonicalIntent?: {
    intentHash: string;
    logicalIndex: number;
    actorId: string;
  };
  questProgressCommitted?: boolean | null;
  questProgressError?: string;
  error?: string;
}

export async function craftRecipe(recipeId: string): Promise<CraftingApiResponse> {
  const response = await fetch("/api/crafting/craft", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recipeId }),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { ok: false, error: `craft_non_json_${response.status}` };
  }
  return response.json() as Promise<CraftingApiResponse>;
}
