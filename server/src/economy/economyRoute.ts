/**
 * ECONOMY API ROUTE
 *
 * Server-authoritative economy API for resource selling.
 * No Date.now(), no Math.random(), stable ordering.
 */

import express, { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { economyService } from "./economyRuntime.js";

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

/**
 * POST /api/economy/sell-resource
 *
 * Sell a specific quantity of a resource item.
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

  try {
    const result = await economyService.sellResource({
      playerId: identity.playerId,
      itemId,
      quantity,
    });

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

  try {
    const result = await economyService.sellAllResources({
      playerId: identity.playerId,
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