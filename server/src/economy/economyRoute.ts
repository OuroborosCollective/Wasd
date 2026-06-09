/**
 * ECONOMY API ROUTE
 *
 * Server-authoritative economy API for resource selling.
 * No Date.now(), no Math.random(), stable ordering.
 * Requires vendor proximity for selling.
 */

import express, { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { economyService } from "./economyRuntime.js";
import { npcQuestService } from "../quests/NpcQuestService.js";

const router = Router();

router.use(express.json());

function parseItemId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

function parseQuantity(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return -1;
  return n;
}

// Maximum allowed player position values (prevent overflow/exploit)
const MAX_POSITION = 100_000;
const MIN_POSITION = -100_000;

function parsePosition(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const pos = value as { x?: unknown; y?: unknown };
  const x = Number(pos.x);
  const y = Number(pos.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  // Validate bounds to prevent overflow/exploit
  if (x < MIN_POSITION || x > MAX_POSITION) return null;
  if (y < MIN_POSITION || y > MAX_POSITION) return null;
  return { x, y };
}

function parseVendorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * POST /api/economy/sell-resource
 *
 * Sell a specific quantity of a resource item.
 * Requires player to be near the village trader.
 * Consumes items from inventory, adds coins to wallet.
 */
router.post("/sell-resource", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({
      ok: false,
      error: "authenticated_player_required",
    });
    return;
  }

  const itemId = parseItemId(req.body?.itemId);
  const quantity = parseQuantity(req.body?.quantity);
  const playerPosition = parsePosition(req.body?.playerPosition);
  const vendorId = parseVendorId(req.body?.vendorId);

  if (!itemId) {
    res.status(400).json({
      ok: false,
      error: "invalid_item_id",
    });
    return;
  }

  if (quantity <= 0) {
    res.status(400).json({
      ok: false,
      error: "invalid_quantity",
    });
    return;
  }

  // Validate player position if provided
  if (req.body?.playerPosition !== undefined && !playerPosition) {
    res.status(400).json({
      ok: false,
      error: "invalid_player_position",
    });
    return;
  }

  try {
    const result = await economyService.sellResource({
      playerId: identity.playerId,
      itemId,
      quantity,
      playerPosition: playerPosition ?? undefined,
      vendorId: vendorId ?? undefined,
    });

    // Update NPC quest progress if sell succeeded
    if (result.ok) {
      npcQuestService.updateQuestProgress(
        identity.playerId,
        "sell",
        itemId,
        quantity,
      );
    }

    const statusCode = result.ok ? 200 : 400;
    res.status(statusCode).json({
      ok: result.ok,
      result,
    });
  } catch (error) {
    console.error("[economy-sell-resource] Failed to sell resource:", error);
    res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

/**
 * POST /api/economy/sell-all-resources
 *
 * Sell all sellable resource items in the player's inventory.
 * Requires player to be near the village trader.
 * Consumes all resource items, adds coins to wallet.
 */
router.post("/sell-all-resources", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({
      ok: false,
      error: "authenticated_player_required",
    });
    return;
  }

  const playerPosition = parsePosition(req.body?.playerPosition);
  const vendorId = parseVendorId(req.body?.vendorId);

  // Validate player position if provided
  if (req.body?.playerPosition !== undefined && !playerPosition) {
    res.status(400).json({
      ok: false,
      error: "invalid_player_position",
    });
    return;
  }

  try {
    const result = await economyService.sellAllResources({
      playerId: identity.playerId,
      playerPosition: playerPosition ?? undefined,
      vendorId: vendorId ?? undefined,
    });

    const statusCode = result.ok ? 200 : 400;
    res.status(statusCode).json({
      ok: result.ok,
      result,
    });
  } catch (error) {
    console.error("[economy-sell-all-resources] Failed to sell resources:", error);
    res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

export default router;