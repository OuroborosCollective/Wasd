import express from "express";
import { areValidationState } from "../are/AREValidationState.js";
import type { WorldTick } from "../core/are/index.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";

export function areValidationRouter(tick: WorldTick) {
  const router = express.Router();

  router.get("/status", adminRateLimiter, adminAuthMiddleware, (_req, res) => {
    const snapshot = areValidationState.getSnapshot();
    res.json({
      ok: snapshot.guard?.ok ?? false,
      fireGlitch: snapshot.fireGlitch,
      guard: snapshot.guard,
      world: snapshot.world,
      lastViolation: snapshot.lastViolation,
      updatedAtIso: snapshot.updatedAtIso,
    });
  });

  router.get("/world-hash", adminRateLimiter, adminAuthMiddleware, (_req, res) => {
    const world = tick.getWorldHashSnapshot?.() ?? areValidationState.getSnapshot().world;
    if (!world) {
      res.status(503).json({ ok: false, error: "world_hash_snapshot_not_ready" });
      return;
    }
    res.json({ ok: true, world });
  });

  router.post("/compare", adminRateLimiter, adminAuthMiddleware, express.json({ limit: "1mb" }), (req, res) => {
    const comparison = tick.comparePortalWorldHash?.(req.body?.world ?? req.body ?? null);
    res.status(comparison?.ok ? 200 : 409).json({
      ok: Boolean(comparison?.ok),
      comparison,
      server: tick.getWorldHashSnapshot?.() ?? null,
      guard: tick.getAREGuardStatus?.() ?? null,
    });
  });

  return router;
}
