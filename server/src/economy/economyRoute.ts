import express, { Router, type Response } from "express";
import rateLimit from "express-rate-limit";
import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { getInventoryStore } from "../inventory/inventoryRuntime.js";
import { transferInventoryItem } from "../inventory/InventoryTransferService.js";
import { economyService } from "./economyRuntime.js";
import { npcQuestService } from "../quests/NpcQuestService.js";
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

router.use(express.json());
router.use(economyLimiter);

const MAX_POSITION = 100_000;
const MIN_POSITION = -100_000;

function parseSafeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_-]{1,96}$/.test(trimmed)) return null;
  return trimmed;
}

function parseQuantity(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return -1;
  return n;
}

function parsePosition(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const pos = value as { x?: unknown; y?: unknown };
  const x = Number(pos.x);
  const y = Number(pos.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < MIN_POSITION || x > MAX_POSITION) return null;
  if (y < MIN_POSITION || y > MAX_POSITION) return null;
  return { x, y };
}

function requireProductionAuth(identity: { authenticated: boolean }, res: Response): boolean {
  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return false;
  }
  return true;
}

function currentServerTick(): number {
  const tick = Number(tickContextProvider.getContext().tickIndex);
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
}

router.post("/sell-resource", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;

  const itemId = parseSafeId(req.body?.itemId);
  const quantity = parseQuantity(req.body?.quantity);
  const playerPosition = parsePosition(req.body?.playerPosition);
  const vendorId = parseSafeId(req.body?.vendorId) ?? undefined;

  if (!itemId) return void res.status(400).json({ ok: false, error: "invalid_item_id" });
  if (quantity <= 0) return void res.status(400).json({ ok: false, error: "invalid_quantity" });
  if (req.body?.playerPosition !== undefined && !playerPosition) return void res.status(400).json({ ok: false, error: "invalid_player_position" });

  try {
    const result = await economyService.sellResource({ playerId: identity.playerId, itemId, quantity, playerPosition: playerPosition ?? undefined, vendorId, currentTick: currentServerTick() });
    if (result.ok) npcQuestService.updateQuestProgress(identity.playerId, "sell", itemId, quantity);
    res.status(result.ok ? 200 : 400).json({ ok: result.ok, result });
  } catch (error) {
    console.error("[economy-sell-resource] Failed to sell resource:", error);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

router.post("/sell-all-resources", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;

  const playerPosition = parsePosition(req.body?.playerPosition);
  const vendorId = parseSafeId(req.body?.vendorId) ?? undefined;
  if (req.body?.playerPosition !== undefined && !playerPosition) return void res.status(400).json({ ok: false, error: "invalid_player_position" });

  try {
    const result = await economyService.sellAllResources({ playerId: identity.playerId, playerPosition: playerPosition ?? undefined, vendorId, currentTick: currentServerTick() });
    res.status(result.ok ? 200 : 400).json({ ok: result.ok, result });
  } catch (error) {
    console.error("[economy-sell-all-resources] Failed to sell resources:", error);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

router.post("/buy-resource", buyResourceRateLimiter, async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;

  const itemId = parseSafeId(req.body?.itemId);
  const quantity = parseQuantity(req.body?.quantity);
  const playerPosition = parsePosition(req.body?.playerPosition);
  const vendorId = parseSafeId(req.body?.vendorId) ?? undefined;

  if (!itemId) return void res.status(400).json({ ok: false, error: "invalid_item_id" });
  if (quantity <= 0) return void res.status(400).json({ ok: false, error: "invalid_quantity" });
  if (req.body?.playerPosition !== undefined && !playerPosition) return void res.status(400).json({ ok: false, error: "invalid_player_position" });

  try {
    const result = await economyService.buyResource({ playerId: identity.playerId, itemId, quantity, playerPosition: playerPosition ?? undefined, vendorId, currentTick: currentServerTick() });
    res.status(result.ok ? 200 : 400).json({ ok: result.ok, result });
  } catch (error) {
    console.error("[economy-buy-resource] Failed to buy resource:", error);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

router.post("/trade-transfer", tradeTransferRateLimiter, async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;

  const toPlayerId = parseSafeId(req.body?.toPlayerId);
  const itemId = parseSafeId(req.body?.itemId);
  const quantity = parseQuantity(req.body?.quantity);
  const tick = currentServerTick();

  if (!toPlayerId) return void res.status(400).json({ ok: false, error: "invalid_receiver" });
  if (!itemId) return void res.status(400).json({ ok: false, error: "invalid_item_id" });
  if (quantity <= 0) return void res.status(400).json({ ok: false, error: "invalid_quantity" });

  const sourceHash = stableHash32(["HTTP_TRADE_TRANSFER_V1", identity.playerId, toPlayerId, itemId, quantity, tick].join("|")).toString(16);
  const result = transferInventoryItem(getInventoryStore(), { fromPlayerId: identity.playerId, toPlayerId, itemId, quantity, tick, uid: `trade:${sourceHash}`, sourceHash });

  if (result.ok) {
    runtimeHistoryLog.write({ tick, source: "trade_transfer", actorId: identity.playerId, subjectId: `${toPlayerId}:${itemId}`, payload: result });
  }

  res.status(result.ok ? 200 : 400).json({ ok: result.ok, result });
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
