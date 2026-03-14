/**
 * GLB Upload Routes for Areloria MMORPG
 * POST /api/glb/upload          – Upload a GLB model (requires subscription)
 * GET  /api/glb/my-models       – List player's uploaded models
 * DELETE /api/glb/:modelId      – Delete a player's model
 * POST /api/glb/place           – Place a model on player's land
 * DELETE /api/glb/place/:id     – Remove a placed model
 * GET  /api/glb/land/:playerId  – Get all placed models on a player's land
 * POST /api/glb/marketplace/list    – List model for sale
 * POST /api/glb/marketplace/buy     – Buy a model from marketplace
 * GET  /api/glb/marketplace         – Browse marketplace
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { db as dbInstance } from "../core/Database.js";
type Database = typeof dbInstance;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.resolve(__dirname, "../../public/uploads/glb");
const MAX_SIZE_MB = parseInt(process.env.MAX_GLB_SIZE_MB || "50");
const MAX_PER_PLAYER = parseInt(process.env.MAX_GLB_PER_PLAYER || "20");

// Ensure upload directory exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".glb", ".gltf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only .glb and .gltf files are allowed"));
  },
});

export function createGLBUploadRouter(dbParam?: any): Router {
  const db = dbParam || dbInstance;
  const router = Router();

  // ── Check subscription middleware ──────────────────────────────────────────
  async function requireGLBSubscription(req: Request, res: Response, next: Function) {
    const playerId = req.headers["x-player-id"] as string || req.body?.playerId;
    if (!playerId) return res.status(401).json({ error: "Player ID required" });

    try {
      const result = await db.query(
        `SELECT glb_enabled, glb_subscription_expires FROM players WHERE id = $1`,
        [playerId]
      );
      const player = result.rows[0];
      if (!player) return res.status(404).json({ error: "Player not found" });

      const hasActive = player.glb_enabled &&
        player.glb_subscription_expires &&
        new Date(player.glb_subscription_expires) > new Date();

      if (!hasActive) {
        return res.status(403).json({
          error: "GLB Creator Pass required",
          code: "NO_GLB_SUBSCRIPTION",
          price: "15.00 EUR/month",
          productId: "glb_subscription_1month",
        });
      }
      (req as any).playerId = playerId;
      next();
    } catch (e) {
      // If columns don't exist yet, treat as no subscription
      return res.status(403).json({
        error: "GLB Creator Pass required",
        code: "NO_GLB_SUBSCRIPTION",
        productId: "glb_subscription_1month",
      });
    }
  }

  // ── Upload GLB ─────────────────────────────────────────────────────────────
  router.post("/upload", requireGLBSubscription, upload.single("model"), async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const playerId = (req as any).playerId;
    const modelName = req.body.name || path.basename(req.file.originalname, path.extname(req.file.originalname));
    const modelId = uuidv4();
    const publicPath = `/uploads/glb/${req.file.filename}`;

    try {
      // Check model count limit
      const countResult = await db.query(
        `SELECT COUNT(*) as cnt FROM player_glb_models WHERE player_id = $1`,
        [playerId]
      ).catch(() => ({ rows: [{ cnt: 0 }] }));

      if (parseInt(countResult.rows[0]?.cnt || "0") >= MAX_PER_PLAYER) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `Maximum ${MAX_PER_PLAYER} models per player` });
      }

      await db.query(
        `INSERT INTO player_glb_models (id, player_id, name, file_path, file_size, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [modelId, playerId, modelName, publicPath, req.file.size]
      ).catch(async () => {
        await db.query(`
          CREATE TABLE IF NOT EXISTS player_glb_models (
            id VARCHAR(36) PRIMARY KEY,
            player_id VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            marketplace_price INTEGER DEFAULT 0,
            marketplace_listed BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )
        `).catch(() => {});
        await db.query(
          `INSERT INTO player_glb_models (id, player_id, name, file_path, file_size, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [modelId, playerId, modelName, publicPath, req.file!.size]
        ).catch(() => {});
      });

      res.json({
        success: true,
        modelId,
        name: modelName,
        path: publicPath,
        size: req.file.size,
      });
    } catch (e: any) {
      console.error("GLB upload error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ── List My Models ─────────────────────────────────────────────────────────
  router.get("/my-models", async (req: Request, res: Response) => {
    const playerId = req.headers["x-player-id"] as string;
    if (!playerId) return res.status(401).json({ error: "Player ID required" });

    try {
      const result = await db.query(
        `SELECT id, name, file_path, file_size, marketplace_price, marketplace_listed, created_at
         FROM player_glb_models WHERE player_id = $1 ORDER BY created_at DESC`,
        [playerId]
      );
      res.json({ models: result.rows });
    } catch {
      res.json({ models: [] });
    }
  });

  // ── Delete Model ───────────────────────────────────────────────────────────
  router.delete("/:modelId", async (req: Request, res: Response) => {
    const playerId = req.headers["x-player-id"] as string;
    const { modelId } = req.params;
    if (!playerId) return res.status(401).json({ error: "Player ID required" });

    try {
      const result = await db.query(
        `DELETE FROM player_glb_models WHERE id=$1 AND player_id=$2 RETURNING file_path`,
        [modelId, playerId]
      );
      if (result.rows.length > 0) {
        const filePath = path.join(UPLOAD_DIR, path.basename(result.rows[0].file_path));
        try { fs.unlinkSync(filePath); } catch {}
      }
      res.json({ success: true });
    } catch {
      res.json({ success: false });
    }
  });

  // ── Place Model on Land ────────────────────────────────────────────────────
  router.post("/place", requireGLBSubscription, async (req: Request, res: Response) => {
    const playerId = (req as any).playerId;
    const { modelId, x, y, z, rotY, scale, landId } = req.body;
    if (!modelId) return res.status(400).json({ error: "modelId required" });

    const placeId = uuidv4();
    try {
      // Verify model belongs to player
      const modelResult = await db.query(
        `SELECT id, name, file_path FROM player_glb_models WHERE id=$1 AND player_id=$2`,
        [modelId, playerId]
      );
      if (modelResult.rows.length === 0) {
        return res.status(404).json({ error: "Model not found or not owned by you" });
      }

      await db.query(
        `INSERT INTO placed_glb_models (id, player_id, model_id, land_id, x, y, z, rot_y, scale, placed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [placeId, playerId, modelId, landId || null, x || 0, y || 0, z || 0, rotY || 0, scale || 1.0]
      ).catch(async () => {
        await db.query(`
          CREATE TABLE IF NOT EXISTS placed_glb_models (
            id VARCHAR(36) PRIMARY KEY,
            player_id VARCHAR(255) NOT NULL,
            model_id VARCHAR(36) NOT NULL,
            land_id VARCHAR(36),
            x FLOAT DEFAULT 0,
            y FLOAT DEFAULT 0,
            z FLOAT DEFAULT 0,
            rot_y FLOAT DEFAULT 0,
            scale FLOAT DEFAULT 1.0,
            placed_at TIMESTAMPTZ DEFAULT NOW()
          )
        `).catch(() => {});
        await db.query(
          `INSERT INTO placed_glb_models (id, player_id, model_id, land_id, x, y, z, rot_y, scale, placed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [placeId, playerId, modelId, landId || null, x || 0, y || 0, z || 0, rotY || 0, scale || 1.0]
        ).catch(() => {});
      });

      res.json({ success: true, placeId, model: modelResult.rows[0] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Remove Placed Model ────────────────────────────────────────────────────
  router.delete("/place/:placeId", async (req: Request, res: Response) => {
    const playerId = req.headers["x-player-id"] as string;
    const { placeId } = req.params;
    if (!playerId) return res.status(401).json({ error: "Player ID required" });

    try {
      await db.query(
        `DELETE FROM placed_glb_models WHERE id=$1 AND player_id=$2`,
        [placeId, playerId]
      );
      res.json({ success: true });
    } catch {
      res.json({ success: false });
    }
  });

  // ── Get Land Models ────────────────────────────────────────────────────────
  router.get("/land/:playerId", async (req: Request, res: Response) => {
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
      res.json({ placed: result.rows });
    } catch {
      res.json({ placed: [] });
    }
  });

  // ── List on Marketplace ────────────────────────────────────────────────────
  router.post("/marketplace/list", requireGLBSubscription, async (req: Request, res: Response) => {
    const playerId = (req as any).playerId;
    const { modelId, price } = req.body;
    if (!modelId || !price) return res.status(400).json({ error: "modelId and price required" });
    if (price < 1 || price > 100000) return res.status(400).json({ error: "Price must be 1-100000 Matrix Energy" });

    try {
      await db.query(
        `UPDATE player_glb_models SET marketplace_listed=true, marketplace_price=$1
         WHERE id=$2 AND player_id=$3`,
        [price, modelId, playerId]
      );
      res.json({ success: true, message: `Model listed for ${price} Matrix Energy` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Buy from Marketplace ───────────────────────────────────────────────────
  router.post("/marketplace/buy", async (req: Request, res: Response) => {
    const buyerId = req.headers["x-player-id"] as string;
    const { modelId } = req.body;
    if (!buyerId || !modelId) return res.status(400).json({ error: "Buyer and modelId required" });

    try {
      // Get model info
      const modelResult = await db.query(
        `SELECT id, player_id, name, file_path, marketplace_price, marketplace_listed
         FROM player_glb_models WHERE id=$1`,
        [modelId]
      );
      const model = modelResult.rows[0];
      if (!model || !model.marketplace_listed) {
        return res.status(404).json({ error: "Model not listed for sale" });
      }
      if (model.player_id === buyerId) {
        return res.status(400).json({ error: "Cannot buy your own model" });
      }

      // Check buyer has enough Matrix Energy
      const buyerResult = await db.query(
        `SELECT matrix_energy FROM players WHERE id=$1`,
        [buyerId]
      );
      const buyer = buyerResult.rows[0];
      if (!buyer || (buyer.matrix_energy || 0) < model.marketplace_price) {
        return res.status(400).json({ error: `Not enough Matrix Energy. Need ${model.marketplace_price}` });
      }

      // Transfer Matrix Energy and create copy of model for buyer
      const newModelId = uuidv4();
      const newFilename = `${uuidv4()}${path.extname(model.file_path)}`;
      const srcPath = path.join(UPLOAD_DIR, path.basename(model.file_path));
      const dstPath = path.join(UPLOAD_DIR, newFilename);

      // Copy file
      try { fs.copyFileSync(srcPath, dstPath); } catch {}

      await db.query(
        `UPDATE players SET matrix_energy = matrix_energy - $1 WHERE id = $2`,
        [model.marketplace_price, buyerId]
      );
      await db.query(
        `UPDATE players SET matrix_energy = COALESCE(matrix_energy, 0) + $1 WHERE id = $2`,
        [Math.floor(model.marketplace_price * 0.9), model.player_id] // 90% to seller, 10% fee
      );
      await db.query(
        `INSERT INTO player_glb_models (id, player_id, name, file_path, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [newModelId, buyerId, model.name, `/uploads/glb/${newFilename}`]
      );

      res.json({
        success: true,
        message: `Purchased "${model.name}" for ${model.marketplace_price} Matrix Energy`,
        newModelId,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Browse Marketplace ─────────────────────────────────────────────────────
  router.get("/marketplace", async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string || "1");
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
      res.json({ listings: result.rows, page, limit });
    } catch {
      res.json({ listings: [], page, limit });
    }
  });

  // ── Check Subscription Status ──────────────────────────────────────────────
  router.get("/subscription-status", async (req: Request, res: Response) => {
    const playerId = req.headers["x-player-id"] as string;
    if (!playerId) return res.status(401).json({ error: "Player ID required" });

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

      res.json({
        active,
        expires: expires?.toISOString() || null,
        daysLeft,
        matrixEnergy: player.matrix_energy || 0,
      });
    } catch {
      res.json({ active: false, daysLeft: 0, matrixEnergy: 0 });
    }
  });

  return router;
}
