/**
 * GLB Routes for Areloria MMORPG
 *
 * Route truth contract:
 * - Public read-only endpoints are mounted and live.
 * - Authenticated read endpoints are mounted and live.
 * - Mutating GLB endpoints are explicitly disabled until the marketplace/placement
 *   write path has atomic transactions, idempotency, and rollback-safe file handling.
 *
 * This avoids fake success and partial economy/ownership commits.
 */

import { Router, Request, Response } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import { db as dbInstance } from "../core/Database.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

function getAuthenticatedPlayerId(req: Request): string | null {
  return (req as any).userId || (req as any).playerId || null;
}

function disabledMutation(_req: Request, res: Response) {
  return res.status(503).json({
    success: false,
    code: "GLB_MUTATIONS_DISABLED",
    error: "GLB mutating endpoints are disabled until transaction-safe marketplace and placement writes are deployed.",
  });
}

export function createGLBUploadRouter(dbParam?: any): Router {
  const db = dbParam || dbInstance;
  const router = Router();

  router.use(express.json({ limit: "1mb" }));

  const readLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many GLB write attempts, please try again shortly." },
  });

  // Authenticated read: user's own models.
  router.get("/my-models", readLimiter, authMiddleware, async (req: Request, res: Response) => {
    const playerId = getAuthenticatedPlayerId(req);
    if (!playerId) return res.status(401).json({ error: "Authentication required" });

    try {
      const result = await db.query(
        `SELECT id, name, file_path, file_size, marketplace_price, marketplace_listed, created_at
         FROM player_glb_models WHERE player_id = $1 ORDER BY created_at DESC`,
        [playerId]
      );
      return res.json({ models: result.rows });
    } catch {
      return res.json({ models: [] });
    }
  });

  // Mutating routes are intentionally blocked. They still require auth first, so
  // unauthenticated runtime probes see 401 while authenticated callers get an
  // explicit 503 instead of a fake success or partial write.
  router.post("/upload", writeLimiter, authMiddleware, disabledMutation);
  router.delete("/place/:placeId", writeLimiter, authMiddleware, disabledMutation);
  router.post("/place", writeLimiter, authMiddleware, disabledMutation);
  router.post("/marketplace/list", writeLimiter, authMiddleware, disabledMutation);
  router.post("/marketplace/buy", writeLimiter, authMiddleware, disabledMutation);
  router.delete("/:modelId", writeLimiter, authMiddleware, disabledMutation);

  // Public read-only: placed models for a player/land owner.
  router.get("/land/:playerId", readLimiter, async (req: Request, res: Response) => {
    const { playerId } = req.params;
    try {
      const result = await db.query(
        `SELECT p.id as place_id, p.x, p.y, p.z, p.rot_y, p.scale,
                m.id as model_id, m.name, m.file_path
         FROM placed_glb_models p
         JOIN player_glb_models m ON p.model_id = m.id
         WHERE p.player_id = $1`,
        [playerId]
      );
      return res.json({ placed: result.rows });
    } catch {
      return res.json({ placed: [] });
    }
  });

  // Public read-only: marketplace browse.
  router.get("/marketplace", readLimiter, async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    try {
      const result = await db.query(
        `SELECT m.id, m.name, m.file_path, m.marketplace_price, m.created_at,
                p.name as seller_name
         FROM player_glb_models m
         JOIN players p ON m.player_id = p.id
         WHERE m.marketplace_listed = true
         ORDER BY m.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return res.json({ listings: result.rows, page, limit });
    } catch {
      return res.json({ listings: [], page, limit });
    }
  });

  // Authenticated read: subscription and Matrix Energy status.
  router.get("/subscription-status", readLimiter, authMiddleware, async (req: Request, res: Response) => {
    const playerId = getAuthenticatedPlayerId(req);
    if (!playerId) return res.status(401).json({ error: "Authentication required" });

    try {
      const result = await db.query(
        `SELECT glb_enabled, glb_subscription_expires, matrix_energy
         FROM players WHERE id=$1`,
        [playerId]
      );
      const player = result.rows[0];
      if (!player) return res.status(404).json({ error: "Player not found" });

      const expires = player.glb_subscription_expires
        ? new Date(player.glb_subscription_expires)
        : null;
      const active = player.glb_enabled && expires && expires > new Date();
      const daysLeft = active && expires
        ? Math.ceil((expires.getTime() - Date.now()) / 86400000)
        : 0;

      return res.json({
        active,
        expires: expires?.toISOString() || null,
        daysLeft,
        matrixEnergy: player.matrix_energy || 0,
      });
    } catch {
      return res.json({ active: false, daysLeft: 0, matrixEnergy: 0 });
    }
  });

  return router;
}
