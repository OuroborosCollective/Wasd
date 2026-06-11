import express, { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { campNpcService } from "./CampNpcService.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";
import { worldDiscoveryService } from "../world/WorldDiscoveryService.js";
import { generateVisibleChunkPois, getStarterVillagePois } from "../world/WorldPoiGenerator.js";
import { getVisibleChunkCoords } from "../resources/ChunkResourceGenerator.js";
import { getWalletService } from "../economy/economyRuntime.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";

const router = Router();

router.use(express.json());

function queryNumber(value: unknown): number | null {
  if (Array.isArray(value)) return queryNumber(value[0]);
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function requestVisibleChunks(req: express.Request): Array<{ chunkX: number; chunkZ: number }> {
  const tileX = queryNumber(req.query.tileX ?? req.query.x);
  const tileZ = queryNumber(req.query.tileZ ?? req.query.z ?? req.query.y);
  if (tileX === null || tileZ === null) return [];
  return getVisibleChunkCoords(Math.floor(tileX), Math.floor(tileZ));
}

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

router.post("/camp/:npcId/interact", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const npcId = req.params.npcId;
  const currentTick = Number(req.query.tick ?? 0);
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

router.get("/camp/:npcId/stock", async (req, res) => {
  const npcId = req.params.npcId;
  const currentTick = Number(req.query.tick ?? 0);
  const match = npcId.match(/^npc:(.+):worker:0$/);

  if (!match) {
    res.status(404).json({
      ok: false,
      error: "npc_not_found",
    });
    return;
  }

  const poiId = match[1];
  const starterPois = getStarterVillagePois();
  const generatedPois = generateVisibleChunkPois(requestVisibleChunks(req));
  const allPois: WorldPoiSnapshot[] = [...starterPois, ...generatedPois].sort((a, b) => a.id.localeCompare(b.id));
  const poi = allPois.find((p) => p.id === poiId);

  if (!poi) {
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

router.post("/camp/:npcId/buy-stock", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const npcId = req.params.npcId;
  const { playerId, itemId, quantity, playerPosition } = req.body;

  if (!playerId || playerId !== identity.playerId) {
    res.status(400).json({
      ok: false,
      error: "invalid_player",
    });
    return;
  }

  const match = npcId.match(/^npc:(.+):worker:0$/);
  if (!match) {
    res.status(404).json({
      ok: false,
      error: "invalid_npc",
    });
    return;
  }

  const poiId = match[1];

  if (!Number.isInteger(quantity) || quantity <= 0) {
    res.status(400).json({
      ok: false,
      error: "invalid_quantity",
    });
    return;
  }

  const isDiscovered = worldDiscoveryService.isPoiDiscovered(playerId, poiId);
  if (!isDiscovered) {
    res.status(403).json({
      ok: false,
      error: "undiscovered_camp",
    });
    return;
  }

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

  const tileX = Math.floor(playerPosition.x / 1000);
  const tileZ = Math.floor(playerPosition.y / 1000);
  const visibleChunks = getVisibleChunkCoords(tileX, tileZ);
  const starterPois = getStarterVillagePois();
  const generatedPois = generateVisibleChunkPois(visibleChunks);
  const allPois: WorldPoiSnapshot[] = [...starterPois, ...generatedPois].sort((a, b) => a.id.localeCompare(b.id));
  const poi = allPois.find((p) => p.id === poiId);

  if (!poi) {
    res.status(404).json({
      ok: false,
      error: "invalid_npc",
    });
    return;
  }

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

  const walletService = await getWalletService();
  const wallet = await walletService.getWallet(playerId);
  const buyResult = campNpcService.buyStock({
    poiId,
    itemId,
    quantity,
  });

  if (!buyResult.ok) {
    const buyError = buyResult as { ok: false; error: string };
    res.status(400).json({
      ok: false,
      error: buyError.error,
    });
    return;
  }

  if (wallet.balances.coin < buyResult.totalCost) {
    const stockState = campNpcService.getStockState(poiId);
    if (stockState) {
      stockState.items[itemId] = (stockState.items[itemId] || 0) + quantity;
    }
    res.status(400).json({
      ok: false,
      error: "insufficient_coins",
    });
    return;
  }

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
