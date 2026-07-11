/**
 * Crafting API client.
 * The client requests a recipe only; actor, position, tick and success are server-owned.
 * Request IDs are actor-scoped idempotency keys, not gameplay truth.
 */

import { getDefaultGameplayPlayerId } from "./liveGameplayStore";

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
    receiptHash?: string;
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
  questProgressHistoryHash?: string;
  questProgressError?: string;
  craftCommitted?: boolean;
  error?: string;
}

const memorySequenceByActor = new Map<string, number>();

function stableHash32(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function nextActorSequence(playerId: string): number {
  const actorHash = stableHash32(playerId);
  const storageKey = `wasd:craft-request-sequence:${actorHash}`;
  const memoryCurrent = memorySequenceByActor.get(actorHash) ?? 0;
  let storedCurrent = 0;
  try {
    const parsed = Number.parseInt(localStorage.getItem(storageKey) ?? "0", 10);
    storedCurrent = Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    storedCurrent = 0;
  }
  const next = Math.max(memoryCurrent, storedCurrent) + 1;
  memorySequenceByActor.set(actorHash, next);
  try {
    localStorage.setItem(storageKey, String(next));
  } catch {
    // In-memory sequence remains valid for this client runtime.
  }
  return next;
}

export function createCraftRequestId(playerId: string, recipeId: string): string {
  return `craft:${stableHash32(playerId)}:${stableHash32(recipeId)}:${nextActorSequence(playerId)}`;
}

export async function craftRecipe(recipeId: string, stationId?: string): Promise<CraftingApiResponse> {
  const playerId = getDefaultGameplayPlayerId();
  const requestId = createCraftRequestId(playerId, recipeId);
  const response = await fetch("/api/crafting/craft", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-player-id": playerId,
    },
    body: JSON.stringify({
      recipeId,
      requestId,
      ...(stationId ? { stationId } : {}),
    }),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { ok: false, error: `craft_non_json_${response.status}` };
  }
  return response.json() as Promise<CraftingApiResponse>;
}
