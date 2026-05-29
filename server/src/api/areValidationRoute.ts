import { Router } from "express";
import express from "express";
import { areValidationState } from "../are/AREValidationState.js";
import type { WorldTick } from "../core/WorldTick.js";

export function areValidationRouter(tick: WorldTick): Router {
  const router = express.Router();

  router.get("/status", (_req, res) => {
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

  router.get("/world-hash", (_req, res) => {
    const world = tick.getWorldHashSnapshot?.() ?? areValidationState.getSnapshot().world;
    if (!world) {
      res.status(503).json({ ok: false, error: "world_hash_snapshot_not_ready" });
      return;
    }
    res.json({ ok: true, world });
  });

  router.post("/compare", express.json({ limit: "1mb" }), (req, res) => {
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
