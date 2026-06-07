/**
 * CAMP NPC ROUTES
 *
 * Server-authoritative camp NPC interaction routes.
 * Provides player-facing messages when interacting with camp NPCs.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now()
 * - Deterministic NPC interactions based on tick
 */

import express, { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { campNpcService } from "./CampNpcService.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";
import { isGatheringCamp } from "./CampNpcTypes.js";
import { worldDiscoveryService } from "../world/WorldDiscoveryService.js";
import { generateVisibleChunkPois, getStarterVillagePois } from "../world/WorldPoiGenerator.js";

const router = Router();

router.use(express.json());

/**
 * Get current server tick from WorldTick instance.
 * Returns 0 if not available.
 */
function getCurrentTick(): number {
  // In a full implementation, we'd inject WorldTick
  // For now, we derive tick from the game's tick system
  // This will be passed through request context in a real implementation
  return 0;
}

/**
 * GET /api/npc/camp/:npcId
 *
 * Get camp NPC information and dialogue.
 */
router.get("/camp/:npcId", async (req, res) => {
  const npcId = req.params.npcId;
  const currentTick = Number(req.query.tick ?? 0);

  const dialogueResult = campNpcService.getNpcDialogue(npcId, currentTick);
  
  if (!dialogueResult) {
    res.status(404).json({
      ok: false,
      error: "npc_not_found",
    });
    return;
  }

  // Parse NPC ID to get POI info
  const match = npcId.match(/^npc:(.+):worker:0$/);
  if (!match) {
    res.status(404).json({
      ok: false,
      error: "npc_not_found",
    });
    return;
  }

  const poiId = match[1];

  res.status(200).json({
    ok: true,
    result: {
      npcId,
      poiId,
      message: dialogueResult.message,
      activity: dialogueResult.activity,
    },
  });
});

/**
 * POST /api/npc/camp/:npcId/interact
 *
 * Player interacts with camp NPC.
 * Returns interaction result and dialogue message.
 */
router.post("/camp/:npcId/interact", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const npcId = req.params.npcId;
  const currentTick = Number(req.query.tick ?? 0);

  // Check if player has discovered this NPC's POI
  const match = npcId.match(/^npc:(.+):worker:0$/);
  if (!match) {
    res.status(404).json({
      ok: false,
      error: "npc_not_found",
    });
    return;
  }

  const poiId = match[1];
  const isDiscovered = worldDiscoveryService.isPoiDiscovered(identity.playerId, poiId);

  if (!isDiscovered) {
    res.status(403).json({
      ok: false,
      error: "poi_not_discovered",
      message: "You haven't discovered this location yet.",
    });
    return;
  }

  const dialogueResult = campNpcService.getNpcDialogue(npcId, currentTick);
  
  if (!dialogueResult) {
    res.status(404).json({
      ok: false,
      error: "npc_not_found",
    });
    return;
  }

  res.status(200).json({
    ok: true,
    result: {
      npcId,
      poiId,
      message: dialogueResult.message,
      activity: dialogueResult.activity,
      interactionType: "talk",
    },
  });
});

/**
 * GET /api/npc/camp/:npcId/stock
 *
 * Get camp stock summary for a specific camp NPC.
 */
router.get("/camp/:npcId/stock", async (req, res) => {
  const npcId = req.params.npcId;
  const currentTick = Number(req.query.tick ?? 0);

  // Parse NPC ID to get POI info
  const match = npcId.match(/^npc:(.+):worker:0$/);
  if (!match) {
    res.status(404).json({
      ok: false,
      error: "npc_not_found",
    });
    return;
  }

  const poiId = match[1];

  // Get the POI to find its type
  const starterPois = getStarterVillagePois();
  const allPois: WorldPoiSnapshot[] = [...starterPois];

  // Find the POI
  const poi = allPois.find((p) => p.id === poiId);
  if (!poi) {
    // POI not found - might be outside starter village
    res.status(200).json({
      ok: true,
      result: {
        npcId,
        poiId,
        stock: [],
        message: "Camp stock not available for this location.",
      },
    });
    return;
  }

  // Get camp stock snapshots
  const campStocks = campNpcService.getCampStockSnapshots([poi], currentTick);
  const campStock = campStocks.find((s) => s.poiId === poiId);

  res.status(200).json({
    ok: true,
    result: {
      npcId,
      poiId,
      stock: campStock?.items ?? [],
      lastUpdatedTick: campStock?.lastUpdatedTick ?? 0,
    },
  });
});

export default router;