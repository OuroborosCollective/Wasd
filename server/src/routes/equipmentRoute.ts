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
 * - Valid runtime tick required before mutation
 * - Inventory ownership validation before equip
 * - Successful mutations expose and record a ServerCanonicalIntent receipt
 */

import { Router, json } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { equipmentService } from "../equipment/equipmentRuntime.js";
import { isEquipmentSlotId } from "../equipment/EquipmentTypes.js";
import { canonicalIntentIntake } from "../intents/CanonicalIntentIntake.js";
import { canonicalizeClientIntent } from "../intents/ServerCanonicalIntent.js";

const router = Router();
router.use(json());

type RuntimeTickContext = Readonly<{
  tick: number;
  tickId: number | string;
  worldTimeHours: number;
  seedHash: string;
}>;

function parseItemId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_-]{1,96}$/.test(trimmed)) return null;
  return trimmed;
}

function parseRequestId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_./-]{1,160}$/.test(trimmed) ? trimmed : undefined;
}

function requireProductionAuth(identity: { authenticated: boolean }, res: import("express").Response): boolean {
  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return false;
  }
  return true;
}

function resolveRuntimeTick(): RuntimeTickContext | null {
  const context = tickContextProvider.getContext();
  const tick = Number(context.tickIndex);
  const tickId = context.tickId;
  const validTickId =
    (typeof tickId === "number" && Number.isSafeInteger(tickId) && tickId >= 0) ||
    (typeof tickId === "string" && /^[a-zA-Z0-9:_./-]{1,160}$/.test(tickId));
  if (!Number.isSafeInteger(tick) || tick < 0 || !validTickId) return null;
  return {
    tick,
    tickId,
    worldTimeHours: Number(context.worldTimeHours),
    seedHash: String(context.seedHash ?? ""),
  };
}

function requireRuntimeTick(res: import("express").Response): RuntimeTickContext | null {
  const runtime = resolveRuntimeTick();
  if (!runtime) res.status(503).json({ ok: false, error: "runtime_tick_unavailable" });
  return runtime;
}

function canonicalEquipmentIntent(input: {
  playerId: string;
  runtime: RuntimeTickContext;
  requestId?: string;
  operation: "equip" | "unequip";
  itemId: string;
  slotId?: string;
}) {
  return canonicalizeClientIntent<"inventory">(
    {
      action: "inventory",
      requestId: input.requestId,
      payload: {
        operation: input.operation,
        itemId: input.itemId,
        ...(input.slotId ? { slotId: input.slotId } : {}),
      },
    },
    {
      actorId: input.playerId,
      tickId: input.runtime.tickId,
      logicalIndex: input.runtime.tick,
      receivedOrder: 0,
      chunkKey: `inventory:${input.playerId}`,
    },
  );
}

router.get("/state", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;

  const runtime = requireRuntimeTick(res);
  if (!runtime) return;

  try {
    const equipment = await equipmentService.getPlayerEquipment(identity.playerId);
    res.json({
      ok: true,
      playerId: identity.playerId,
      equipment,
      tickContext: {
        tickId: runtime.tickId,
        tick: runtime.tick,
        worldTimeHours: runtime.worldTimeHours,
        seedHash: runtime.seedHash,
      },
    });
  } catch (error) {
    console.error("[equipment-state] Failed to get equipment state:", error);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

router.post("/equip", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;

  const itemId = parseItemId(req.body?.itemId);
  if (!itemId) return void res.status(400).json({ ok: false, error: "invalid_item_id" });

  const runtime = requireRuntimeTick(res);
  if (!runtime) return;

  const canonicalIntent = canonicalEquipmentIntent({
    playerId: identity.playerId,
    runtime,
    requestId: parseRequestId(req.body?.requestId ?? req.body?.intentId),
    operation: "equip",
    itemId,
  });

  try {
    const result = await equipmentService.equipItem({
      playerId: canonicalIntent.actorId,
      itemId: canonicalIntent.payload.itemId,
    });
    if (result.ok) canonicalIntentIntake.record(canonicalIntent);

    res.status(result.ok ? 200 : 409).json({
      ok: result.ok,
      result,
      canonicalIntent,
      tickContext: {
        tickId: runtime.tickId,
        tick: runtime.tick,
        worldTimeHours: runtime.worldTimeHours,
        seedHash: runtime.seedHash,
      },
    });
  } catch (error) {
    console.error("[equipment-equip] Failed to equip item:", error);
    res.status(500).json({ ok: false, error: "internal_error", canonicalIntent });
  }
});

router.post("/unequip", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;

  const rawSlotId = parseItemId(req.body?.slotId);
  if (!rawSlotId) return void res.status(400).json({ ok: false, error: "invalid_slot_id" });
  if (!isEquipmentSlotId(rawSlotId)) return void res.status(400).json({ ok: false, error: "invalid_slot" });

  const runtime = requireRuntimeTick(res);
  if (!runtime) return;

  try {
    const before = await equipmentService.getPlayerEquipment(identity.playerId);
    const equipped = before.slots.find((slot) => slot.slotId === rawSlotId);
    if (!equipped) {
      res.status(409).json({ ok: false, result: { ok: false, playerId: identity.playerId, slotId: rawSlotId, reason: "slot_empty" } });
      return;
    }

    const canonicalIntent = canonicalEquipmentIntent({
      playerId: identity.playerId,
      runtime,
      requestId: parseRequestId(req.body?.requestId ?? req.body?.intentId),
      operation: "unequip",
      itemId: equipped.itemId,
      slotId: rawSlotId,
    });

    const result = await equipmentService.unequipItem({
      playerId: canonicalIntent.actorId,
      slotId: rawSlotId,
    });
    if (result.ok) canonicalIntentIntake.record(canonicalIntent);

    res.status(result.ok ? 200 : 409).json({
      ok: result.ok,
      result,
      canonicalIntent,
      tickContext: {
        tickId: runtime.tickId,
        tick: runtime.tick,
        worldTimeHours: runtime.worldTimeHours,
        seedHash: runtime.seedHash,
      },
    });
  } catch (error) {
    console.error("[equipment-unequip] Failed to unequip item:", error);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;
