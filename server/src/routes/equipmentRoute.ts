/**
 * EQUIPMENT API ROUTE
 *
 * Server-authoritative equipment state API.
 * Players can only view and modify their own equipment.
 *
 * Rules:
 * - No Date.now() for gameplay state
 * - No Math.random()
 * - Server-authoritative playerId resolution
 * - Inventory ownership validation before equip
 */

import { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { equipmentService } from "../equipment/equipmentRuntime.js";

const router = Router();

// Parse JSON bodies for POST requests
router.use(require("express").json());

function parseItemId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_-]{1,96}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * GET /api/equipment/state
 *
 * Get current player equipment state.
 * Requires authenticated player in production.
 */
router.get("/state", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return;
  }

  try {
    const equipment = await equipmentService.getPlayerEquipment(identity.playerId);

    res.json({
      ok: true,
      playerId: identity.playerId,
      equipment,
    });
  } catch (error) {
    console.error("[equipment-state] Failed to get equipment state:", error);
    res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

/**
 * POST /api/equipment/equip
 *
 * Equip an item from inventory.
 * Requires authenticated player in production.
 * Validates inventory ownership server-side.
 */
router.post("/equip", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return;
  }

  const itemId = parseItemId(req.body?.itemId);

  if (!itemId) {
    res.status(400).json({ ok: false, error: "invalid_item_id" });
    return;
  }

  try {
    const result = await equipmentService.equipItem({
      playerId: identity.playerId,
      itemId,
    });

    res.status(result.ok ? 200 : 409).json({
      ok: result.ok,
      result,
    });
  } catch (error) {
    console.error("[equipment-equip] Failed to equip item:", error);
    res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

export default router;