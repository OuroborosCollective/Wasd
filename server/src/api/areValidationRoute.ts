import express from "express";
import type { WorldTick } from "../core/are/index.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";

function extractPortalWorldHash(body: any): string | null {
  const candidate =
    body?.world?.worldHash
    ?? body?.world?.world_hash
    ?? body?.worldHash
    ?? body?.world_hash
    ?? (typeof body?.world === "string" ? body.world : null)
    ?? (typeof body === "string" ? body : null);

  return typeof candidate === "string" && /^[0-9a-f]{64}$/i.test(candidate)
    ? candidate.toLowerCase()
    : null;
}

export function areValidationRouter(tick: WorldTick) {
  const router = express.Router();
  router.use(adminRateLimiter, adminAuthMiddleware);

  router.get("/status", adminRateLimiter, adminAuthMiddleware, (_req, res) => {
    const guard = tick.getAREGuardStatus?.() ?? null;
    if (!guard) {
      res.status(503).json({
        ok: false,
        status: "unavailable",
        guard: null,
        error: "are_guard_unavailable",
      });
      return;
    }

    const ok = guard.ok === true && (guard as any).available !== false;
    res.status(ok ? 200 : 409).json({
      ok,
      status: ok ? "valid" : "violation",
      guard,
    });
  });

  router.get("/world-hash", adminRateLimiter, adminAuthMiddleware, (_req, res) => {
    const world = tick.getWorldHashSnapshot?.() ?? null;
    if (!world) {
      res.status(503).json({ ok: false, error: "world_hash_snapshot_not_ready" });
      return;
    }
    res.status(200).json({ ok: true, world });
  });

  router.post("/compare", adminRateLimiter, adminAuthMiddleware, express.json({ limit: "1mb" }), (req, res) => {
    const portalHash = extractPortalWorldHash(req.body);
    if (!portalHash) {
      res.status(400).json({
        ok: false,
        error: "invalid_world_hash",
        comparison: null,
        server: tick.getWorldHashSnapshot?.() ?? null,
        guard: tick.getAREGuardStatus?.() ?? null,
      });
      return;
    }

    const server = tick.getWorldHashSnapshot?.() ?? null;
    if (!server) {
      res.status(503).json({
        ok: false,
        error: "world_hash_snapshot_not_ready",
        comparison: null,
        server: null,
        guard: tick.getAREGuardStatus?.() ?? null,
      });
      return;
    }

    const comparison = tick.comparePortalWorldHash?.(portalHash) ?? null;
    const matches = comparison?.matches === true && comparison?.ok === true;
    res.status(matches ? 200 : 409).json({
      ok: matches,
      ...(matches ? {} : { error: "world_hash_mismatch" }),
      comparison,
      server,
      guard: tick.getAREGuardStatus?.() ?? null,
    });
  });

  return router;
}
