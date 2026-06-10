/**
 * INVENTORY API ROUTE
 *
 * Server-authoritative inventory state API.
 * Players can only view their own inventory.
 *
 * Phase 11: Integrated with OuroborosTickSystem via TickSystemContextProvider.
 *
 * Rules:
 * - No Date.now() for gameplay state
 * - No Math.random()
 * - Server-authoritative playerId resolution
 * - Read-only (no direct item manipulation via API)
 */

import express, { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";

const router = Router();

// Parse JSON bodies for POST requests
router.use(express.json());

/**
 * GET /state
 *
 * Get current player inventory state.
 * Mounted at /api/inventory, so full path is /api/inventory/state
 * Requires authenticated player in production.
 */
router.get("/state", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({
      ok: false,
      error: "authenticated_player_required",
    });
    return;
  }

  try {
    const service = await getInventoryService();
    const inventory = await service.getPlayerInventory(identity.playerId);

    // Phase 11: Include deterministic tick context for Ouroboros integration
    const tickContext = tickContextProvider.getContext();
    res.json({
      ok: true,
      playerId: identity.playerId,
      authenticated: identity.authenticated,
      inventory,
      // Ouroboros tick system context
      tickContext: {
        tickId: tickContext.tickId,
        worldTimeHours: tickContext.worldTimeHours,
        seedHash: tickContext.seedHash,
      },
    });
  } catch (error) {
    console.error("[inventory-state] Failed to get inventory state:", error);
    res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

export default router;