import express, { Router, type Response } from "express";
import rateLimit from "express-rate-limit";
import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { transferInventoryItemPersistent } from "../inventory/InventoryTransferService.js";
import {
  canonicalizeClientIntent,
  chunkKeyFromWorldPosition,
  type ServerCanonicalIntent,
} from "../intents/ServerCanonicalIntent.js";
import { economyService, vendorStockService } from "./economyRuntime.js";
import {
  getAllVendors,
  getVendorActorEvidence,
  type VendorActorEvidence,
} from "./VillageVendors.js";
import { deriveEconomyWorkOrders } from "../quests/EconomyWorkOrderService.js";
import { npcQuestService } from "../quests/NpcQuestService.js";
import { campQuestRuntime } from "../quests/campQuestRuntime.js";
import { runtimeHistoryLog } from "../history/RuntimeHistoryLog.js";

const router = Router();

const economyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" },
});
const buyResourceRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" },
});
const tradeTransferRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" },
});
const campQuestRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" },
});

router.use(express.json());
router.use(economyLimiter);

const MAX_POSITION = 100_000;
const MIN_POSITION = -100_000;

type RuntimeTickContext = {
  readonly tick: number;
  readonly tickId: number | string;
};

type EconomyInteractPayload = {
  readonly targetId: string;
  readonly interaction: "sell_resource" | "sell_all_resources" | "buy_resource" | "complete_camp_quest";
  readonly playerPosition: { readonly x: number; readonly y: number };
  readonly itemId?: string;
  readonly quantity?: number;
  readonly questId?: string;
};

type EconomyInventoryPayload = {
  readonly operation: "move";
  readonly itemId: string;
  readonly toPlayerId: string;
  readonly quantity: number;
};

type CanonicalEconomyInteract = ServerCanonicalIntent<"interact"> & {
  readonly payload: EconomyInteractPayload;
};
type CanonicalEconomyInventory = ServerCanonicalIntent<"inventory"> & {
  readonly payload: EconomyInventoryPayload;
};

function parseSafeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]{1,96}$/.test(trimmed) ? trimmed : null;
}

function parseRequestId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_./-]{1,160}$/.test(trimmed) ? trimmed : undefined;
}

function parseCampQuestIdInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^camp_daily:[a-zA-Z0-9_:-]{1,144}:[0-9]{1,12}$/.test(trimmed) ? trimmed : null;
}

function parseQuantity(value: unknown): number {
  const quantity = Math.floor(Number(value));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : -1;
}

function parsePosition(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const position = value as { x?: unknown; y?: unknown };
  const x = Number(position.x);
  const y = Number(position.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < MIN_POSITION || x > MAX_POSITION || y < MIN_POSITION || y > MAX_POSITION) return null;
  return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
}

function requireProductionAuth(identity: { authenticated: boolean }, res: Response): boolean {
  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return false;
  }
  return true;
}

function resolveRuntimeTickContext(): RuntimeTickContext | null {
  const context = tickContextProvider.getContext();
  const tick = Number(context.tickIndex);
  const tickId = context.tickId;
  const validTickId =
    (typeof tickId === "number" && Number.isSafeInteger(tickId) && tickId >= 0) ||
    (typeof tickId === "string" && /^[a-zA-Z0-9:_./-]{1,160}$/.test(tickId));
  if (!Number.isSafeInteger(tick) || tick < 0 || !validTickId) return null;
  return { tick, tickId };
}

function requireRuntimeTick(res: Response): RuntimeTickContext | null {
  const runtime = resolveRuntimeTickContext();
  if (!runtime) res.status(503).json({ ok: false, error: "runtime_tick_unavailable" });
  return runtime;
}

function resolveVendorEvidence(value: unknown): { actor: VendorActorEvidence } | { error: string } {
  const fallbackVendor = getAllVendors()[0];
  if (!fallbackVendor) return { error: "vendor_runtime_unavailable" };
  const vendorId = value === undefined || value === null || value === ""
    ? fallbackVendor.id
    : parseSafeId(value);
  if (!vendorId) return { error: "invalid_vendor_id" };
  const actor = getVendorActorEvidence(vendorId);
  return actor ? { actor } : { error: "unknown_vendor" };
}

function respondVendorError(res: Response, error: string): void {
  res.status(error === "vendor_runtime_unavailable" ? 503 : 400).json({ ok: false, error });
}

function canonicalizeEconomyInteract(input: {
  readonly actorId: string;
  readonly runtime: RuntimeTickContext;
  readonly requestId?: string;
  readonly payload: EconomyInteractPayload;
}): CanonicalEconomyInteract {
  return canonicalizeClientIntent<"interact">(
    { action: "interact", requestId: input.requestId, payload: input.payload },
    {
      actorId: input.actorId,
      tickId: input.runtime.tickId,
      logicalIndex: input.runtime.tick,
      receivedOrder: 0,
      chunkKey: chunkKeyFromWorldPosition(input.payload.playerPosition),
    },
  ) as CanonicalEconomyInteract;
}

function canonicalizeEconomyInventory(input: {
  readonly actorId: string;
  readonly runtime: RuntimeTickContext;
  readonly requestId?: string;
  readonly payload: EconomyInventoryPayload;
}): CanonicalEconomyInventory {
  return canonicalizeClientIntent<"inventory">(
    { action: "inventory", requestId: input.requestId, payload: input.payload },
    {
      actorId: input.actorId,
      tickId: input.runtime.tickId,
      logicalIndex: input.runtime.tick,
      receivedOrder: 0,
      chunkKey: `inventory:${input.actorId}`,
    },
  ) as CanonicalEconomyInventory;
}

router.post("/sell-resource", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;

  const itemId = parseSafeId(req.body?.itemId);
  const quantity = parseQuantity(req.body?.quantity);
  const playerPosition = parsePosition(req.body?.playerPosition);
  const vendor = resolveVendorEvidence(req.body?.vendorId);
  if (!itemId) return void res.status(400).json({ ok: false, error: "invalid_item_id" });
  if (quantity <= 0) return void res.status(400).json({ ok: false, error: "invalid_quantity" });
  if (!playerPosition) return void res.status(400).json({ ok: false, error: "invalid_player_position" });
  if ("error" in vendor) return void respondVendorError(res, vendor.error);
  const runtime = requireRuntimeTick(res);
  if (!runtime) return;

  const canonicalIntent = canonicalizeEconomyInteract({
    actorId: identity.playerId,
    runtime,
    requestId: parseRequestId(req.body?.requestId ?? req.body?.intentId),
    payload: { targetId: vendor.actor.actorId, interaction: "sell_resource", itemId, quantity, playerPosition },
  });
  const payload = canonicalIntent.payload;

  try {
    const result = await economyService.sellResource({
      playerId: canonicalIntent.actorId,
      itemId: payload.itemId ?? "",
      quantity: payload.quantity ?? 0,
      playerPosition: payload.playerPosition,
      vendorId: payload.targetId,
      currentTick: canonicalIntent.logicalIndex,
    });
    if (result.ok && payload.itemId && payload.quantity) {
      npcQuestService.updateQuestProgress(canonicalIntent.actorId, "sell", payload.itemId, payload.quantity);
    }
    res.status(result.ok ? 200 : 409).json({ ok: result.ok, result, canonicalIntent });
  } catch (error) {
    console.error("[economy-sell-resource] Failed to sell resource:", error);
    res.status(500).json({ ok: false, error: "internal_error", canonicalIntent });
  }
});

router.post("/sell-all-resources", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;

  const playerPosition = parsePosition(req.body?.playerPosition);
  const vendor = resolveVendorEvidence(req.body?.vendorId);
  if (!playerPosition) return void res.status(400).json({ ok: false, error: "invalid_player_position" });
  if ("error" in vendor) return void respondVendorError(res, vendor.error);
  const runtime = requireRuntimeTick(res);
  if (!runtime) return;

  const canonicalIntent = canonicalizeEconomyInteract({
    actorId: identity.playerId,
    runtime,
    requestId: parseRequestId(req.body?.requestId ?? req.body?.intentId),
    payload: { targetId: vendor.actor.actorId, interaction: "sell_all_resources", playerPosition },
  });

  try {
    const result = await economyService.sellAllResources({
      playerId: canonicalIntent.actorId,
      playerPosition: canonicalIntent.payload.playerPosition,
      vendorId: canonicalIntent.payload.targetId,
      currentTick: canonicalIntent.logicalIndex,
    });
    res.status(result.ok ? 200 : 409).json({ ok: result.ok, result, canonicalIntent });
  } catch (error) {
    console.error("[economy-sell-all-resources] Failed to sell resources:", error);
    res.status(500).json({ ok: false, error: "internal_error", canonicalIntent });
  }
});

router.post("/buy-resource", buyResourceRateLimiter, async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;

  const itemId = parseSafeId(req.body?.itemId);
  const quantity = parseQuantity(req.body?.quantity);
  const playerPosition = parsePosition(req.body?.playerPosition);
  const vendor = resolveVendorEvidence(req.body?.vendorId);
  if (!itemId) return void res.status(400).json({ ok: false, error: "invalid_item_id" });
  if (quantity <= 0) return void res.status(400).json({ ok: false, error: "invalid_quantity" });
  if (!playerPosition) return void res.status(400).json({ ok: false, error: "invalid_player_position" });
  if ("error" in vendor) return void respondVendorError(res, vendor.error);
  const runtime = requireRuntimeTick(res);
  if (!runtime) return;

  const canonicalIntent = canonicalizeEconomyInteract({
    actorId: identity.playerId,
    runtime,
    requestId: parseRequestId(req.body?.requestId ?? req.body?.intentId),
    payload: { targetId: vendor.actor.actorId, interaction: "buy_resource", itemId, quantity, playerPosition },
  });
  const payload = canonicalIntent.payload;

  try {
    const result = await economyService.buyResource({
      playerId: canonicalIntent.actorId,
      itemId: payload.itemId ?? "",
      quantity: payload.quantity ?? 0,
      playerPosition: payload.playerPosition,
      vendorId: payload.targetId,
      currentTick: canonicalIntent.logicalIndex,
    });
    res.status(result.ok ? 200 : 409).json({ ok: result.ok, result, canonicalIntent });
  } catch (error) {
    console.error("[economy-buy-resource] Failed to buy resource:", error);
    res.status(500).json({ ok: false, error: "internal_error", canonicalIntent });
  }
});

router.post("/complete-camp-quest", campQuestRateLimiter, async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;

  const questId = parseCampQuestIdInput(req.body?.questId);
  const playerPosition = parsePosition(req.body?.playerPosition);
  if (!questId) return void res.status(400).json({ ok: false, error: "invalid_quest_id" });
  if (!playerPosition) return void res.status(400).json({ ok: false, error: "invalid_player_position" });
  const runtime = requireRuntimeTick(res);
  if (!runtime) return;

  const canonicalIntent = canonicalizeEconomyInteract({
    actorId: identity.playerId,
    runtime,
    requestId: parseRequestId(req.body?.requestId ?? req.body?.intentId),
    payload: { targetId: questId, interaction: "complete_camp_quest", questId, playerPosition },
  });

  try {
    const result = await campQuestRuntime.completeCampQuest({
      playerId: canonicalIntent.actorId,
      questId: canonicalIntent.payload.questId ?? canonicalIntent.payload.targetId,
      playerPosition: canonicalIntent.payload.playerPosition,
      currentTick: canonicalIntent.logicalIndex,
    });
    res.status(result.ok ? 200 : 409).json({ ok: result.ok, result, canonicalIntent });
  } catch (error) {
    console.error("[economy-complete-camp-quest] Failed to complete camp quest:", error);
    res.status(500).json({ ok: false, error: "internal_error", canonicalIntent });
  }
});

router.post("/trade-transfer", tradeTransferRateLimiter, async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;

  const toPlayerId = parseSafeId(req.body?.toPlayerId);
  const itemId = parseSafeId(req.body?.itemId);
  const quantity = parseQuantity(req.body?.quantity);
  if (!toPlayerId) return void res.status(400).json({ ok: false, error: "invalid_receiver" });
  if (!itemId) return void res.status(400).json({ ok: false, error: "invalid_item_id" });
  if (quantity <= 0) return void res.status(400).json({ ok: false, error: "invalid_quantity" });
  const runtime = requireRuntimeTick(res);
  if (!runtime) return;

  const canonicalIntent = canonicalizeEconomyInventory({
    actorId: identity.playerId,
    runtime,
    requestId: parseRequestId(req.body?.requestId ?? req.body?.intentId),
    payload: { operation: "move", itemId, toPlayerId, quantity },
  });
  const inventoryService = await getInventoryService();
  const result = await transferInventoryItemPersistent(inventoryService, {
    fromPlayerId: canonicalIntent.actorId,
    toPlayerId: canonicalIntent.payload.toPlayerId,
    itemId: canonicalIntent.payload.itemId,
    quantity: canonicalIntent.payload.quantity,
    tick: canonicalIntent.logicalIndex,
    uid: `trade:${canonicalIntent.intentHash}`,
    sourceHash: canonicalIntent.intentHash,
  });

  if (result.ok) {
    runtimeHistoryLog.write({
      tick: canonicalIntent.logicalIndex,
      source: "trade_transfer",
      actorId: canonicalIntent.actorId,
      subjectId: `${canonicalIntent.payload.toPlayerId}:${canonicalIntent.payload.itemId}`,
      payload: { ...result, intentHash: canonicalIntent.intentHash },
    });
  }
  res.status(result.ok ? 200 : 409).json({ ok: result.ok, result, canonicalIntent });
});

router.get("/work-orders", async (req, res) => {
  const vendor = resolveVendorEvidence(req.query.vendorId);
  if ("error" in vendor) return void respondVendorError(res, vendor.error);
  const runtime = requireRuntimeTick(res);
  if (!runtime) return;

  try {
    const stock = await vendorStockService.getStock(vendor.actor.actorId);
    const orders = deriveEconomyWorkOrders({ stock, tick: runtime.tick, actor: vendor.actor });
    const revisionHash = stableHash32([
      "ECONOMY_WORK_ORDER_RESPONSE_V1",
      vendor.actor.definitionHash,
      ...orders.map((order) => order.stateHash).sort(),
    ].join("|")).toString(16);
    res.json({
      ok: true,
      tick: runtime.tick,
      tickId: runtime.tickId,
      vendorId: vendor.actor.actorId,
      actorEvidence: vendor.actor,
      revisionHash,
      orders,
    });
  } catch (error) {
    console.error("[economy-work-orders] Failed to derive work orders:", error);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

router.get("/market-snapshot", async (_req, res) => {
  try {
    const snapshot = await economyService.marketSnapshot();
    res.json({ ok: true, snapshot });
  } catch (error) {
    console.error("[economy-market-snapshot] Failed to create snapshot:", error);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;
