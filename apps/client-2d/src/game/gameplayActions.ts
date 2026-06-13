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
import { readPlayerPositionBridge } from "./PlayerPositionBridge";

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

function equipmentActionError(json: unknown, fallback: string): string {
  const raw = json && typeof json === "object" ? (json as Record<string, any>) : {};
  return String(raw.result?.reason ?? raw.error ?? fallback);
}

/**
 * Dispatch an equip action and refresh the live snapshot.
 * The client sends only an item intent; server decides slot compatibility and ownership.
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
      return { ok: false, error: equipmentActionError(json, "equip_failed") };
    }

    // Refetch snapshot to update equipment/paperdoll display from the authoritative server state.
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
 * Dispatch an unequip action and refresh the live snapshot.
 * The client sends only a slot intent; server validates and applies the state transition.
 */
export async function dispatchUnequip(input: {
  playerId?: string;
  slotId: string;
}): Promise<ActionResult> {
  const playerId = input.playerId ?? DEFAULT_GAMEPLAY_PLAYER_ID;

  try {
    const response = await fetch("/api/equipment/unequip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": playerId,
      },
      body: JSON.stringify({
        playerId,
        slotId: input.slotId,
      }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.ok) {
      return { ok: false, error: equipmentActionError(json, "unequip_failed") };
    }

    // Refetch snapshot to update equipment/paperdoll display from the authoritative server state.
    const next = await fetchGameplaySnapshot(playerId);
    if (next) {
      liveGameplayStore.setSnapshot(next);
    }

    return { ok: true };
  } catch (error) {
    console.error("[dispatchUnequip] failed:", error);
    return { ok: false, error: "network_error" };
  }
}

export interface ClaimStarterToolsResult {
  ok: boolean;
  result?: {
    changed: boolean;
    tools: string[];
    equipped: string[];
    reason?: string;
  };
  error?: string;
}

/**
 * Dispatch claim starter tools action and refresh the live snapshot.
 * Idempotent: calling multiple times does not duplicate tools.
 */
export async function dispatchClaimStarterTools(playerId?: string): Promise<ClaimStarterToolsResult> {
  const pid = playerId ?? DEFAULT_GAMEPLAY_PLAYER_ID;

  try {
    const response = await fetch("/api/onboarding/claim-starter-tools", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": pid,
      },
      body: JSON.stringify({ playerId: pid }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.ok) {
      return { ok: false, error: String(json?.error ?? "claim_failed") };
    }

    // Refetch snapshot to update inventory, equipment, and quest progress
    const next = await fetchGameplaySnapshot(pid);
    if (next) {
      liveGameplayStore.setSnapshot(next);
    }

    return {
      ok: true,
      result: json.result,
    };
  } catch (error) {
    console.error("[dispatchClaimStarterTools] failed:", error);
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

export interface SellResourceResult {
  ok: boolean;
  result?: {
    itemId: string;
    quantitySold: number;
    unitPrice: number;
    totalCoins: number;
    newBalance: number;
  };
  error?: string;
}

/**
 * Dispatch sell resource action and refresh the live snapshot.
 * Includes player position for vendor proximity validation.
 */
export async function dispatchSellResource(input: {
  playerId?: string;
  itemId: string;
  quantity: number;
}): Promise<SellResourceResult> {
  const pid = input.playerId ?? DEFAULT_GAMEPLAY_PLAYER_ID;
  const playerPosition = readPlayerPositionBridge();

  try {
    const response = await fetch("/api/economy/sell-resource", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": pid,
      },
      body: JSON.stringify({
        playerId: pid,
        itemId: input.itemId,
        quantity: input.quantity,
        playerPosition: playerPosition ?? undefined,
        vendorId: "village_trader_001",
      }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.ok) {
      // Read reason from nested result structure
      const reason = json?.result?.reason ?? json?.error ?? "sell_failed";
      return { ok: false, error: String(reason) };
    }

    // Refetch snapshot to update inventory and wallet
    const next = await fetchGameplaySnapshot(pid);
    if (next) {
      liveGameplayStore.setSnapshot(next);
    }

    return { ok: true, result: json.result };
  } catch (error) {
    console.error("[dispatchSellResource] failed:", error);
    return { ok: false, error: "network_error" };
  }
}

export interface SellAllResourcesResult {
  ok: boolean;
  result?: {
    sold: Array<{
      itemId: string;
      quantitySold: number;
      unitPrice: number;
      totalCoins: number;
    }>;
    totalCoins: number;
    newBalance: number;
  };
  error?: string;
}

/**
 * Dispatch sell all resources action and refresh the live snapshot.
 * Includes player position for vendor proximity validation.
 */
export async function dispatchSellAllResources(playerId?: string): Promise<SellAllResourcesResult> {
  const pid = playerId ?? DEFAULT_GAMEPLAY_PLAYER_ID;
  const playerPosition = readPlayerPositionBridge();

  try {
    const response = await fetch("/api/economy/sell-all-resources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": pid,
      },
      body: JSON.stringify({
        playerId: pid,
        playerPosition: playerPosition ?? undefined,
        vendorId: "village_trader_001",
      }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.ok) {
      // Read reason from nested result structure
      const reason = json?.result?.reason ?? json?.error ?? "sell_all_failed";
      return { ok: false, error: String(reason) };
    }

    // Refetch snapshot to update inventory and wallet
    const next = await fetchGameplaySnapshot(pid);
    if (next) {
      liveGameplayStore.setSnapshot(next);
    }

    return { ok: true, result: json.result };
  } catch (error) {
    console.error("[dispatchSellAllResources] failed:", error);
    return { ok: false, error: "network_error" };
  }
}

export interface BuyCampStockResult {
  ok: boolean;
  result?: {
    npcId: string;
    poiId: string;
    itemId: string;
    quantityBought: number;
    unitPrice: number;
    totalCoins: number;
    newCoinBalance: number;
    remainingCampStock: number;
  };
  error?: string;
}

/**
 * Dispatch buy camp stock action and refresh the live snapshot.
 * Includes player position for camp proximity validation.
 */
export async function dispatchBuyCampStock(input: {
  playerId?: string;
  npcId: string;
  itemId: string;
  quantity: number;
}): Promise<BuyCampStockResult> {
  const pid = input.playerId ?? DEFAULT_GAMEPLAY_PLAYER_ID;
  const playerPosition = readPlayerPositionBridge();

  try {
    const response = await fetch(`/api/npc/camp/${input.npcId}/buy-stock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": pid,
      },
      body: JSON.stringify({
        playerId: pid,
        itemId: input.itemId,
        quantity: input.quantity,
        playerPosition: playerPosition ?? undefined,
      }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.ok) {
      const reason = json?.error ?? "buy_failed";
      return { ok: false, error: String(reason) };
    }

    // Refetch snapshot to update inventory, wallet, and camp stock
    const next = await fetchGameplaySnapshot(pid);
    if (next) {
      liveGameplayStore.setSnapshot(next);
    }

    return { ok: true, result: json.result };
  } catch (error) {
    console.error("[dispatchBuyCampStock] failed:", error);
    return { ok: false, error: "network_error" };
  }
}
