/**
 * Gameplay Action Dispatcher
 *
 * Central module for server-authoritative gameplay actions.
 * After each action, refetches the gameplay snapshot to update UI.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - Server-authoritative: all decisions made server-side
 * - Client only sends action request and refetches state
 */

import { fetchGameplaySnapshot, liveGameplayStore, DEFAULT_GAMEPLAY_PLAYER_ID } from "./liveGameplayStore";
import { createResourceGatherIntent } from "./ResourceGatherIntentAdapter";

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Required tool slot ID when reason is missing_tool */
  requiredTool?: string;
}

export interface GameplayWorldPosition {
  x: number;
  y: number;
}

/**
 * Dispatch a gather action and refresh the live snapshot.
 */
export async function dispatchGather(input: {
  playerId?: string;
  nodeId: string;
  currentTick: number;
  playerPosition?: GameplayWorldPosition;
}): Promise<ActionResult> {
  const playerId = input.playerId ?? DEFAULT_GAMEPLAY_PLAYER_ID;
  const adapterResult = createResourceGatherIntent({
    playerId,
    nodeId: input.nodeId,
    currentTick: input.currentTick,
    playerPosition: input.playerPosition,
  });

  if (!adapterResult.ok) {
    return { ok: false, error: adapterResult.reason };
  }

  try {
    const response = await fetch("/api/resource/gather", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": adapterResult.intent.playerId,
      },
      body: JSON.stringify(adapterResult.intent),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.ok) {
      const reason = String(json?.result?.reason ?? json?.error ?? "gather_failed");
      const requiredTool = json?.result?.requiredTool;
      return { ok: false, error: reason, requiredTool };
    }

    // Refetch snapshot to update all UI panels
    const next = await fetchGameplaySnapshot(adapterResult.intent.playerId);
    if (next) {
      liveGameplayStore.setSnapshot(next);
    }

    return { ok: true };
  } catch (error) {
    console.error("[dispatchGather] failed:", error);
    return { ok: false, error: "network_error" };
  }
}

/**
 * Dispatch a craft action and refresh the live snapshot.
 */
export async function dispatchCraft(input: {
  playerId?: string;
  recipeId: string;
}): Promise<ActionResult> {
  const playerId = input.playerId ?? DEFAULT_GAMEPLAY_PLAYER_ID;

  try {
    const response = await fetch("/api/crafting/craft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": playerId,
      },
      body: JSON.stringify({
        playerId,
        recipeId: input.recipeId,
      }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.ok) {
      return { ok: false, error: String(json?.error ?? "craft_failed") };
    }

    // Refetch snapshot to update inventory, crafting, and quest progress
    const next = await fetchGameplaySnapshot(playerId);
    if (next) {
      liveGameplayStore.setSnapshot(next);
    }

    return { ok: true };
  } catch (error) {
    console.error("[dispatchCraft] failed:", error);
    return { ok: false, error: "network_error" };
  }
}

/**
 * Dispatch an equip action and refresh the live snapshot.
 */
export async function dispatchEquip(input: {
  playerId?: string;
  itemId: string;
}): Promise<ActionResult> {
  const playerId = input.playerId ?? DEFAULT_GAMEPLAY_PLAYER_ID;

  try {
    const response = await fetch("/api/equipment/equip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": playerId,
      },
      body: JSON.stringify({
        playerId,
        itemId: input.itemId,
      }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.ok) {
      return { ok: false, error: String(json?.error ?? "equip_failed") };
    }

    // Refetch snapshot to update equipment/paperdoll display
    const next = await fetchGameplaySnapshot(playerId);
    if (next) {
      liveGameplayStore.setSnapshot(next);
    }

    return { ok: true };
  } catch (error) {
    console.error("[dispatchEquip] failed:", error);
    return { ok: false, error: "network_error" };
  }
}

/**
 * Refresh the live gameplay snapshot from the server.
 * Use after any action or when needing to sync UI state.
 */
export async function refreshSnapshot(playerId?: string): Promise<void> {
  const pid = playerId ?? DEFAULT_GAMEPLAY_PLAYER_ID;
  const next = await fetchGameplaySnapshot(pid);
  if (next) {
    liveGameplayStore.setSnapshot(next);
  }
}
