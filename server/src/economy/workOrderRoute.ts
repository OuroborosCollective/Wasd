import express, { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { workOrderService } from "./WorkOrderService.js";

const router = Router();

router.use(express.json());

function parseWorkOrderId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_-]{1,96}$/.test(trimmed)) return null;
  return trimmed;
}

function parseQuantity(value: unknown): number {
  const quantity = Math.floor(Number(value));
  if (!Number.isFinite(quantity) || quantity <= 0) return -1;
  return quantity;
}

function currentServerTick(): number {
  const tick = Number(tickContextProvider.getContext().tickIndex);
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
}

function tickResponseContext() {
  const tickContext = tickContextProvider.getContext();
  return {
    tickId: tickContext.tickId,
    tickIndex: tickContext.tickIndex,
    worldTimeHours: tickContext.worldTimeHours,
    seedHash: tickContext.seedHash,
  };
}

function httpStatusForWorkOrderReason(reason: string): number {
  switch (reason) {
    case "invalid_order":
      return 404;
    case "invalid_player":
    case "invalid_quantity":
    case "wrong_item":
      return 400;
    case "missing_items":
    case "already_completed":
      return 409;
    default:
      return 400;
  }
}

function rejectUnauthenticatedProduction(identity: { authenticated: boolean }): boolean {
  return process.env.NODE_ENV === "production" && !identity.authenticated;
}

router.get("/", (_req, res) => {
  const tick = currentServerTick();
  res.json({
    ok: true,
    workOrders: workOrderService.listSnapshots(tick),
    tickContext: tickResponseContext(),
  });
});

router.post("/deliver", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (rejectUnauthenticatedProduction(identity)) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return;
  }

  const workOrderId = parseWorkOrderId(req.body?.workOrderId);
  const quantity = parseQuantity(req.body?.quantity);

  if (!workOrderId) {
    res.status(400).json({ ok: false, error: "invalid_work_order_id" });
    return;
  }

  if (quantity <= 0) {
    res.status(400).json({ ok: false, error: "invalid_quantity" });
    return;
  }

  const tick = currentServerTick();

  try {
    const result = await workOrderService.deliver({
      playerId: identity.playerId,
      workOrderId,
      quantity,
      currentTick: tick,
    });
    const snapshot = workOrderService.getSnapshot(workOrderId, tick);

    res.status(result.ok ? 200 : httpStatusForWorkOrderReason(result.reason)).json({
      ok: result.ok,
      result,
      snapshot,
      tickContext: tickResponseContext(),
    });
  } catch (error) {
    console.error("[work-order-deliver] Failed to deliver work order:", error);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;
