import express, { Router, type Response } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { worldTickAdapter } from "../core/are/WorldTickThinShellAdapter.js";
import { getWalletService } from "../economy/economyRuntime.js";
import { runtimeHistoryLog } from "../history/RuntimeHistoryLog.js";
import {
  canonicalizeClientIntent,
  chunkKeyFromWorldPosition,
  type ServerCanonicalIntent,
} from "../intents/ServerCanonicalIntent.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { isInventoryItemId, type InventoryItemId } from "../inventory/InventoryTypes.js";
import { getVisibleChunkCoords } from "../resources/ChunkResourceGenerator.js";
import { worldDiscoveryService } from "../world/WorldDiscoveryService.js";
import { generateVisibleChunkPois, getStarterVillagePois } from "../world/WorldPoiGenerator.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";
import { campNpcService } from "./CampNpcService.js";
import { campStockRuntime } from "./CampStockRuntime.js";

const router = Router();
router.use(express.json());

interface RuntimeTickContext {
  readonly tick: number;
  readonly tickId: number | string;
}

interface CampInteractPayload {
  readonly targetId: string;
  readonly interaction: "camp_talk" | "camp_buy_stock";
  readonly poiId: string;
  readonly playerPosition: { readonly x: number; readonly y: number };
  readonly itemId?: InventoryItemId;
  readonly quantity?: number;
}

type CanonicalCampIntent = ServerCanonicalIntent<"interact"> & {
  readonly payload: CampInteractPayload;
};

const transactionLocks = new Map<string, Promise<void>>();

function parseId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_-]{1,192}$/.test(trimmed) ? trimmed : null;
}

function parseInventoryItemId(value: unknown): InventoryItemId | null {
  return isInventoryItemId(value) ? value : null;
}

function parseRequestId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_./-]{1,192}$/.test(trimmed) ? trimmed : undefined;
}

function parseQuantity(value: unknown): number | null {
  const quantity = Math.floor(Number(value));
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
}

function requireProductionAuth(identity: { authenticated: boolean }, res: Response): boolean {
  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return false;
  }
  return true;
}

function runtimeTick(): RuntimeTickContext | null {
  const context = tickContextProvider.getContext();
  const tick = Number(context.tickIndex);
  const tickId = context.tickId;
  const validTickId =
    (typeof tickId === "number" && Number.isSafeInteger(tickId) && tickId >= 0) ||
    (typeof tickId === "string" && /^[a-zA-Z0-9:_./-]{1,160}$/.test(tickId));
  return Number.isSafeInteger(tick) && tick >= 0 && validTickId ? { tick, tickId } : null;
}

function runtimePosition(playerId: string): { x: number; y: number } | null {
  const player = worldTickAdapter.playerSystem.getPlayer(playerId);
  const x = Number(player?.position?.x);
  const y = Number(player?.position?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
}

function poiIdFromNpcId(npcId: string): string | null {
  const match = npcId.match(/^npc:(.+):worker:0$/);
  return match?.[1] ?? null;
}

function visiblePois(position: { x: number; y: number }): WorldPoiSnapshot[] {
  const tileX = Math.floor(position.x / 1000);
  const tileZ = Math.floor(position.y / 1000);
  // Bolt: Optimization - Direct relational operator comparison is ~3-5x faster than localeCompare
  return [...getStarterVillagePois(), ...generateVisibleChunkPois(getVisibleChunkCoords(tileX, tileZ))]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function resolveCampActor(
  npcId: string,
  position: { x: number; y: number },
): { poiId: string; poi: WorldPoiSnapshot } | null {
  const poiId = poiIdFromNpcId(npcId);
  if (!poiId) return null;
  const poi = visiblePois(position).find((candidate) => candidate.id === poiId);
  return poi ? { poiId, poi } : null;
}

function nearPoi(position: { x: number; y: number }, poi: WorldPoiSnapshot): boolean {
  const dx = position.x - poi.position.x;
  const dy = position.y - poi.position.y;
  return Math.sqrt(dx * dx + dy * dy) <= 48;
}

async function runExclusive<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = transactionLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => gate);
  transactionLocks.set(key, tail);
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (transactionLocks.get(key) === tail) transactionLocks.delete(key);
  }
}

async function resolveRequestContext(req: express.Request, res: Response) {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return null;
  const npcId = parseId(req.params.npcId);
  const tick = runtimeTick();
  const position = runtimePosition(identity.playerId);
  if (!npcId) {
    res.status(404).json({ ok: false, error: "npc_not_found" });
    return null;
  }
  if (!tick) {
    res.status(503).json({ ok: false, error: "runtime_tick_unavailable" });
    return null;
  }
  if (!position) {
    res.status(409).json({ ok: false, error: "runtime_player_position_unavailable" });
    return null;
  }
  const actor = resolveCampActor(npcId, position);
  if (!actor) {
    res.status(404).json({ ok: false, error: "npc_not_found" });
    return null;
  }
  await campStockRuntime.hydratePoi(actor.poiId);
  return { identity, npcId, tick, position, actor };
}

router.get("/camp/:npcId", async (req, res) => {
  const context = await resolveRequestContext(req, res);
  if (!context) return;
  const dialogue = campNpcService.getNpcDialogue(context.npcId, context.tick.tick);
  if (!dialogue) return void res.status(404).json({ ok: false, error: "npc_not_found" });
  res.json({
    ok: true,
    runtimeEvidence: { tick: context.tick.tick, tickId: context.tick.tickId },
    result: { npcId: context.npcId, poiId: context.actor.poiId, message: dialogue.message, activity: dialogue.activity },
  });
});

router.post("/camp/:npcId/interact", async (req, res) => {
  const context = await resolveRequestContext(req, res);
  if (!context) return;
  await worldDiscoveryService.hydratePlayer(context.identity.playerId);
  if (!worldDiscoveryService.isPoiDiscovered(context.identity.playerId, context.actor.poiId)) {
    return void res.status(403).json({ ok: false, error: "poi_not_discovered" });
  }
  if (!nearPoi(context.position, context.actor.poi)) {
    return void res.status(403).json({ ok: false, error: "camp_too_far" });
  }
  const dialogue = campNpcService.getNpcDialogue(context.npcId, context.tick.tick);
  if (!dialogue) return void res.status(404).json({ ok: false, error: "npc_not_found" });
  const intent = canonicalizeClientIntent<"interact">(
    {
      action: "interact",
      requestId: parseRequestId(req.body?.requestId ?? req.body?.intentId),
      payload: {
        targetId: context.npcId,
        interaction: "camp_talk",
        poiId: context.actor.poiId,
        playerPosition: context.position,
      },
    },
    {
      actorId: context.identity.playerId,
      tickId: context.tick.tickId,
      logicalIndex: context.tick.tick,
      receivedOrder: 0,
      chunkKey: chunkKeyFromWorldPosition(context.position),
    },
  ) as CanonicalCampIntent;
  res.json({
    ok: true,
    canonicalIntent: intent,
    result: {
      npcId: context.npcId,
      poiId: context.actor.poiId,
      message: dialogue.message,
      activity: dialogue.activity,
      interactionType: "talk",
    },
  });
});

router.get("/camp/:npcId/stock", async (req, res) => {
  const context = await resolveRequestContext(req, res);
  if (!context) return;
  await worldDiscoveryService.hydratePlayer(context.identity.playerId);
  if (!worldDiscoveryService.isPoiDiscovered(context.identity.playerId, context.actor.poiId)) {
    return void res.status(403).json({ ok: false, error: "poi_not_discovered" });
  }
  const stock = campNpcService.getCampStockSnapshots([context.actor.poi], context.tick.tick)[0];
  if (!stock?.revisionHash) return void res.status(503).json({ ok: false, error: "stock_evidence_unavailable" });
  res.json({
    ok: true,
    runtimeEvidence: { tick: context.tick.tick, tickId: context.tick.tickId, revisionHash: stock.revisionHash },
    result: { npcId: context.npcId, ...stock },
  });
});

router.post("/camp/:npcId/buy-stock", async (req, res) => {
  const context = await resolveRequestContext(req, res);
  if (!context) return;
  const itemId = parseInventoryItemId(req.body?.itemId);
  const quantity = parseQuantity(req.body?.quantity);
  if (!itemId) return void res.status(400).json({ ok: false, error: "invalid_item" });
  if (!quantity) return void res.status(400).json({ ok: false, error: "invalid_quantity" });
  await worldDiscoveryService.hydratePlayer(context.identity.playerId);
  if (!worldDiscoveryService.isPoiDiscovered(context.identity.playerId, context.actor.poiId)) {
    return void res.status(403).json({ ok: false, error: "undiscovered_camp" });
  }
  if (!nearPoi(context.position, context.actor.poi)) {
    return void res.status(403).json({ ok: false, error: "camp_too_far" });
  }

  const intent = canonicalizeClientIntent<"interact">(
    {
      action: "interact",
      requestId: parseRequestId(req.body?.requestId ?? req.body?.intentId),
      payload: {
        targetId: context.npcId,
        interaction: "camp_buy_stock",
        poiId: context.actor.poiId,
        playerPosition: context.position,
        itemId,
        quantity,
      },
    },
    {
      actorId: context.identity.playerId,
      tickId: context.tick.tickId,
      logicalIndex: context.tick.tick,
      receivedOrder: 0,
      chunkKey: chunkKeyFromWorldPosition(context.position),
    },
  ) as CanonicalCampIntent;

  const outcome = await runExclusive(`${context.identity.playerId}:${context.actor.poiId}`, async () => {
    const inventoryService = await getInventoryService();
    const walletService = await getWalletService();
    const originUid = `camp-buy:${intent.intentHash}`;
    if (inventoryService.getAppliedOriginUids(context.identity.playerId).includes(originUid)) {
      const wallet = await walletService.getWallet(context.identity.playerId);
      const stock = campNpcService.getCampStockSnapshots([context.actor.poi], context.tick.tick)[0];
      if (!stock?.revisionHash) {
        return { status: 503, body: { ok: false, error: "stock_evidence_unavailable", canonicalIntent: intent } };
      }
      return {
        status: 200,
        body: {
          ok: true,
          canonicalIntent: intent,
          result: {
            npcId: context.npcId,
            poiId: context.actor.poiId,
            itemId,
            quantityBought: quantity,
            replayed: true,
            newCoinBalance: wallet.balances.coin,
            remainingCampStock: stock.items.find((entry) => entry.itemId === itemId)?.quantity ?? 0,
            stockRevisionHash: stock.revisionHash,
          },
        },
      };
    }

    const plan = campNpcService.planBuyStock({
      poi: context.actor.poi,
      currentTick: context.tick.tick,
      itemId,
      quantity,
    });
    if (!plan.ok) return { status: 409, body: { ok: false, error: plan.error, canonicalIntent: intent } };
    const walletBefore = await walletService.getWallet(context.identity.playerId);
    if (walletBefore.balances.coin < plan.totalCost) {
      return { status: 409, body: { ok: false, error: "insufficient_coins", canonicalIntent: intent } };
    }
    const inventoryBefore = await inventoryService.getPlayerInventory(context.identity.playerId);
    const originsBefore = inventoryService.getAppliedOriginUids(context.identity.playerId);
    const movementCountBefore = inventoryService.getMovementEventCount();
    const stockBefore = campNpcService.getStockState(context.actor.poiId);

    try {
      await campStockRuntime.commitStockState(context.actor.poiId, plan.nextState);
      await walletService.subtractCoins({ playerId: context.identity.playerId, amount: plan.totalCost });
      const added = await inventoryService.addItem({
        playerId: context.identity.playerId,
        itemId,
        quantity,
        origin: {
          uid: originUid,
          tick: context.tick.tick,
          source: "trade_delta",
          sourceHash: intent.intentHash,
        },
      });
      if (!added.ok) throw new Error(added.reason ?? "inventory_add_failed");
      const wallet = await walletService.getWallet(context.identity.playerId);
      const history = runtimeHistoryLog.write({
        tick: context.tick.tick,
        source: "market_snapshot",
        actorId: context.identity.playerId,
        subjectId: `${context.actor.poiId}:${itemId}`,
        chunkKey: intent.chunkKey,
        payload: {
          kind: "camp_buy",
          intentHash: intent.intentHash,
          quantity,
          totalCost: plan.totalCost,
          stockRevisionHash: plan.stockRevisionHash,
        },
      });
      return {
        status: 200,
        body: {
          ok: true,
          canonicalIntent: intent,
          result: {
            npcId: context.npcId,
            poiId: context.actor.poiId,
            itemId,
            quantityBought: quantity,
            unitPrice: plan.unitPrice,
            totalCoins: plan.totalCost,
            newCoinBalance: wallet.balances.coin,
            remainingCampStock: plan.remainingStock,
            stockRevisionHash: plan.stockRevisionHash,
            historyHash: history.entryHash,
            replayed: false,
          },
        },
      };
    } catch (error) {
      const recovery = await Promise.allSettled([
        campStockRuntime.restoreStockState(context.actor.poiId, stockBefore),
        walletService.restoreWallet(context.identity.playerId, walletBefore),
        inventoryService.restorePlayerInventory(
          context.identity.playerId,
          inventoryBefore,
          originsBefore,
          movementCountBefore,
        ),
      ]);
      const rollbackOk = recovery.every((entry) => entry.status === "fulfilled");
      return {
        status: 503,
        body: {
          ok: false,
          error: rollbackOk ? "camp_buy_failed" : "transaction_recovery_failed",
          rollbackOk,
          detail: error instanceof Error ? error.message : "unknown",
          canonicalIntent: intent,
        },
      };
    }
  });

  res.status(outcome.status).json(outcome.body);
});

export default router;
