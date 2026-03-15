/**
 * Land API Routes for Areloria MMORPG
 * GET  /api/land/all             – All land plots (for world map)
 * GET  /api/land/mine            – My land info
 * POST /api/land/claim           – Claim land at position
 * POST /api/land/abandon         – Abandon my land
 * POST /api/land/structure       – Add structure to land
 * DELETE /api/land/structure/:id – Remove structure
 */

import { Router, Request, Response } from "express";
import { LandSystem } from "../modules/land/LandSystem.js";
import { db as dbInstance } from "../core/Database.js";

export function createLandRouter(landSystem: LandSystem, dbParam?: any): Router {
  const db = dbParam || dbInstance;
  const router = Router();

  // ── All Lands (for map) ────────────────────────────────────────────────────
  router.get("/all", (_req: Request, res: Response) => {
    const lands = landSystem.getAllLands().map(l => ({
      id: l.id,
      ownerName: l.ownerName,
      name: l.name,
      x: l.x,
      y: l.y,
      radius: l.radius,
      structureCount: l.structures.length,
    }));
    res.json({ lands });
  });

  // ── My Land ────────────────────────────────────────────────────────────────
  router.get("/mine", async (req: Request, res: Response) => {
    const playerId = req.headers["x-player-id"] as string;
    if (!playerId) return res.status(401).json({ error: "Player ID required" });

    const land = landSystem.getLandByOwner(playerId);
    if (!land) return res.json({ land: null });

    res.json({ land });
  });

  // ── Claim Land ─────────────────────────────────────────────────────────────
  router.post("/claim", async (req: Request, res: Response) => {
    const playerId = req.headers["x-player-id"] as string;
    const { x, y, name } = req.body;
    if (!playerId) return res.status(401).json({ error: "Player ID required" });
    if (x === undefined || y === undefined) return res.status(400).json({ error: "x and y required" });

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      // Check Matrix Energy and get player name
      const playerResult = await client.query(
        `SELECT name, matrix_energy FROM players WHERE id=$1 FOR UPDATE`, [playerId]
      );
      const player = playerResult.rows[0];
      if (!player) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Player not found" });
      }

      const cost = landSystem.getLandClaimCost();
      if ((player.matrix_energy || 0) < cost) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Not enough Matrix Energy. Need ${cost}, have ${player.matrix_energy || 0}`,
          cost,
          have: player.matrix_energy || 0,
        });
      }

      // Deduct cost atomically
      const deductResult = await client.query(
        `UPDATE players SET matrix_energy = matrix_energy - $1
         WHERE id = $2 AND COALESCE(matrix_energy, 0) >= $1`,
        [cost, playerId]
      );

      if (deductResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Not enough Matrix Energy (concurrent claim)" });
      }

      const result = await landSystem.claimLand(playerId, player.name, x, y, name, client);
      if (!result.success) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: result.reason });
      }

      await client.query("COMMIT");
      res.json({ success: true, land: result.land, costPaid: cost });
    } catch (e: any) {
      await client.query("ROLLBACK");
      console.error("Land claim error:", e);
      res.status(500).json({ error: e.message });
    } finally {
      client.release();
    }
  });

  // ── Abandon Land ───────────────────────────────────────────────────────────
  router.post("/abandon", async (req: Request, res: Response) => {
    const playerId = req.headers["x-player-id"] as string;
    if (!playerId) return res.status(401).json({ error: "Player ID required" });

    const success = await landSystem.abandonLand(playerId);
    res.json({ success });
  });

  // ── Add Structure ──────────────────────────────────────────────────────────
  router.post("/structure", async (req: Request, res: Response) => {
    const playerId = req.headers["x-player-id"] as string;
    const { landId, type, x, y, z, rotY, scale, glbPath, name } = req.body;
    if (!playerId) return res.status(401).json({ error: "Player ID required" });
    if (!landId || !type) return res.status(400).json({ error: "landId and type required" });

    // If placing a GLB model, check subscription
    if (type === "glb_model" && glbPath) {
      const subResult = await db.query(
        `SELECT glb_enabled, glb_subscription_expires FROM players WHERE id=$1`, [playerId]
      ).catch(() => ({ rows: [] }));
      const player = subResult.rows[0];
      const active = player?.glb_enabled &&
        player?.glb_subscription_expires &&
        new Date(player.glb_subscription_expires) > new Date();
      if (!active) {
        return res.status(403).json({
          error: "GLB Creator Pass required to place custom models",
          code: "NO_GLB_SUBSCRIPTION",
          productId: "glb_subscription_1month",
        });
      }
    }

    const result = await landSystem.addStructure(
      landId, playerId, type,
      x || 0, y || 0, z || 0,
      rotY || 0, scale || 1.0,
      glbPath, name
    );

    if (!result.success) return res.status(400).json({ error: result.reason });
    res.json({ success: true, structure: result.structure });
  });

  // ── Remove Structure ───────────────────────────────────────────────────────
  router.delete("/structure/:structId", async (req: Request, res: Response) => {
    const playerIdRaw = req.headers["x-player-id"];
    const playerId = Array.isArray(playerIdRaw) ? playerIdRaw[0] : (playerIdRaw as string);
    const { structId } = req.params;
    const { landId } = req.body;
    if (!playerId) return res.status(401).json({ error: "Player ID required" });

    const success = await landSystem.removeStructure(landId as string, playerId, structId as string);
    res.json({ success });
  });

  return router;
}
