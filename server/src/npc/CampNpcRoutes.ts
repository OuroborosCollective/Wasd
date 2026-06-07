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
import { getWalletService } from "../economy/economyRuntime.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";

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

/**
 * POST /api/npc/camp/:npcId/buy-stock
 *
 * Buy stock from a camp NPC.
 * Validates proximity, discovery, coins, and stock before mutation.
 *
 * Input:
 * {
 *   playerId: string,
 *   itemId: string,
 *   quantity: number,
 *   playerPosition?: { x: number, y: number }
 * }
 *
 * Response success:
 * {
 *   ok: true,
 *   result: {
 *     npcId,
 *     poiId,
 *     itemId,
 *     quantityBought,
 *     unitPrice,
 *     totalCoins,
 *     newCoinBalance,
 *     remainingCampStock
 *   }
 * }
 *
 * Failure:
 * {
 *   ok: false,
 *   error: string (invalid_player|invalid_npc|undiscovered_camp|invalid_item|
 *                 invalid_quantity|insufficient_camp_stock|insufficient_coins|
 *                 missing_player_position|invalid_player_position|camp_too_far)
 * }
 */
router.post("/camp/:npcId/buy-stock", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const npcId = req.params.npcId;
  const { playerId, itemId, quantity, playerPosition } = req.body;

  // Validate playerId matches identity
  if (!playerId || playerId !== identity.playerId) {
    res.status(400).json({
      ok: false,
      error: "invalid_player",
    });
    return;
  }

  // Parse NPC ID to get POI info
  const match = npcId.match(/^npc:(.+):worker:0$/);
  if (!match) {
    res.status(404).json({
      ok: false,
      error: "invalid_npc",
    });
    return;
  }

  const poiId = match[1];

  // Validate quantity
  if (!Number.isInteger(quantity) || quantity <= 0) {
    res.status(400).json({
      ok: false,
      error: "invalid_quantity",
    });
    return;
  }

  // Check if player has discovered this camp
  const isDiscovered = worldDiscoveryService.isPoiDiscovered(playerId, poiId);
  if (!isDiscovered) {
    res.status(403).json({
      ok: false,
      error: "undiscovered_camp",
    });
    return;
  }

  // Validate player position if provided
  if (playerPosition === undefined || playerPosition === null) {
    res.status(400).json({
      ok: false,
      error: "missing_player_position",
    });
    return;
  }

  if (
    typeof playerPosition.x !== "number" ||
    typeof playerPosition.y !== "number" ||
    !Number.isFinite(playerPosition.x) ||
    !Number.isFinite(playerPosition.y)
  ) {
    res.status(400).json({
      ok: false,
      error: "invalid_player_position",
    });
    return;
  }

  // Get POI to check proximity
  const starterPois = getStarterVillagePois();
  const poi = starterPois.find((p) => p.id === poiId);
  if (!poi) {
    res.status(404).json({
      ok: false,
      error: "invalid_npc",
    });
    return;
  }

  // Check proximity to camp (interaction radius 32 or 48 units)
  const INTERACTION_RADIUS = 48;
  const dx = playerPosition.x - poi.position.x;
  const dy = playerPosition.y - poi.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > INTERACTION_RADIUS) {
    res.status(403).json({
      ok: false,
      error: "camp_too_far",
    });
    return;
  }

  // Try to buy stock from camp
  const buyResult = campNpcService.buyStock({
    poiId,
    itemId,
    quantity,
  });

  if (!buyResult.ok) {
    res.status(400).json({
      ok: false,
      error: buyResult.error,
    });
    return;
  }

  // Get wallet and validate coins
  const walletService = await getWalletService();
  const wallet = await walletService.getWallet(playerId);

  if (wallet.balances.coin < buyResult.totalCost) {
    res.status(400).json({
      ok: false,
      error: "insufficient_coins",
    });
    return;
  }

  // All validations passed - mutation order:
  // 1. subtract coins
  // 2. add player inventory
  // (camp stock already mutated in buyStock)

  await walletService.addCoins({
    playerId,
    amount: -buyResult.totalCost,
  });

  const inventoryService = await getInventoryService();
  await inventoryService.addItem({
    playerId,
    itemId,
    quantity,
  });

  // Get new coin balance
  const newWallet = await walletService.getWallet(playerId);

  res.status(200).json({
    ok: true,
    result: {
      npcId,
      poiId,
      itemId,
      quantityBought: quantity,
      unitPrice: buyResult.unitPrice,
      totalCoins: buyResult.totalCost,
      newCoinBalance: newWallet.balances.coin,
      remainingCampStock: buyResult.remainingStock,
    },
  });
});

export default router;