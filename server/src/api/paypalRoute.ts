/**
 * PayPal Payment Routes for Areloria MMORPG
 * POST /api/paypal/create-order   – Create a PayPal order
 * POST /api/paypal/capture        – Capture a completed payment
 * GET  /api/paypal/success        – Redirect after successful payment
 * GET  /api/paypal/cancel         – Redirect after cancelled payment
 * GET  /api/paypal/products       – List available products
 */

import { Router, Request, Response } from "express";
import {
  createPayPalOrder,
  capturePayPalOrder,
  MATRIX_PACKAGES,
  GLB_SUBSCRIPTION,
} from "../modules/payment/PayPalService.js";
import { db as dbInstance } from "../core/Database.js";
type Database = typeof dbInstance;

export function createPayPalRouter(dbParam?: any): Router {
  const db = dbParam || dbInstance;
  const router = Router();

  // ── List Products ──────────────────────────────────────────────────────────
  router.get("/products", (_req: Request, res: Response) => {
    res.json({
      matrixPackages: Object.entries(MATRIX_PACKAGES).map(([id, pkg]) => ({
        id,
        ...pkg,
      })),
      glbSubscription: {
        id: "glb_subscription_1month",
        ...GLB_SUBSCRIPTION,
      },
    });
  });

  // ── Create Order ───────────────────────────────────────────────────────────
  router.post("/create-order", async (req: Request, res: Response) => {
    try {
      const { productId, playerId, playerName } = req.body;
      if (!productId || !playerId) {
        return res.status(400).json({ error: "productId and playerId required" });
      }

      const baseUrl = process.env.SERVER_URL ||
        `${req.protocol}://${req.get("host")}`;
      const returnUrl = `${baseUrl}/api/paypal/success?orderId=PAYPAL_ORDER_ID`;
      const cancelUrl = `${baseUrl}/api/paypal/cancel`;

      const { orderId, approveUrl } = await createPayPalOrder(
        productId,
        playerId,
        playerName || "Adventurer",
        returnUrl,
        cancelUrl
      );

      // Store pending order in DB
      await db.query(
        `INSERT INTO paypal_orders (order_id, player_id, product_id, status, created_at)
         VALUES ($1, $2, $3, 'PENDING', NOW())
         ON CONFLICT (order_id) DO NOTHING`,
        [orderId, playerId, productId]
      ).catch(() => {}); // Table may not exist yet, handled in init

      res.json({ orderId, approveUrl });
    } catch (err: any) {
      console.error("PayPal create-order error:", err);
      res.status(500).json({ error: err.message || "Payment error" });
    }
  });

  // ── Capture Order ──────────────────────────────────────────────────────────
  router.post("/capture", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ error: "orderId required" });

      const result = await capturePayPalOrder(orderId);
      if (!result.success) {
        return res.status(400).json({ error: "Payment not completed" });
      }

      // Apply rewards
      await applyPurchaseRewards(db, result.playerId!, result.productId!, orderId);

      // Update order status
      await db.query(
        `UPDATE paypal_orders SET status='COMPLETED', completed_at=NOW() WHERE order_id=$1`,
        [orderId]
      ).catch(() => {});

      res.json({
        success: true,
        message: getSuccessMessage(result.productId!),
        productId: result.productId,
      });
    } catch (err: any) {
      console.error("PayPal capture error:", err);
      res.status(500).json({ error: err.message || "Capture error" });
    }
  });

  // ── Success Redirect ───────────────────────────────────────────────────────
  router.get("/success", async (req: Request, res: Response) => {
    const { token, PayerID } = req.query;
    if (!token) return res.redirect("/?payment=error");

    try {
      const result = await capturePayPalOrder(token as string);
      if (result.success) {
        await applyPurchaseRewards(db, result.playerId!, result.productId!, token as string);
        await db.query(
          `UPDATE paypal_orders SET status='COMPLETED', completed_at=NOW() WHERE order_id=$1`,
          [token]
        ).catch(() => {});
        return res.redirect(`/?payment=success&product=${result.productId}`);
      }
    } catch (e) {
      console.error("PayPal success capture error:", e);
    }
    res.redirect("/?payment=error");
  });

  // ── Cancel Redirect ────────────────────────────────────────────────────────
  router.get("/cancel", (_req: Request, res: Response) => {
    res.redirect("/?payment=cancelled");
  });

  return router;
}

// ── Apply Purchase Rewards ─────────────────────────────────────────────────
async function applyPurchaseRewards(
  db: Database,
  playerId: string,
  productId: string,
  orderId: string
) {
  // Check for duplicate
  const dup = await db.query(
    `SELECT order_id FROM paypal_orders WHERE order_id=$1 AND status='COMPLETED'`,
    [orderId]
  ).catch(() => ({ rows: [] }));
  if (dup.rows.length > 0) return; // Already processed

  if (productId === "glb_subscription_1month") {
    // Grant GLB subscription for 30 days
    await db.query(
      `UPDATE players
       SET glb_subscription_expires = GREATEST(
         COALESCE(glb_subscription_expires, NOW()),
         NOW()
       ) + INTERVAL '30 days',
       glb_enabled = true
       WHERE id = $1`,
      [playerId]
    ).catch(async () => {
      // Column might not exist yet - add it
      await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS glb_subscription_expires TIMESTAMPTZ`).catch(() => {});
      await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS glb_enabled BOOLEAN DEFAULT false`).catch(() => {});
      await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS matrix_energy INTEGER DEFAULT 0`).catch(() => {});
      await db.query(
        `UPDATE players SET glb_subscription_expires = NOW() + INTERVAL '30 days', glb_enabled = true WHERE id = $1`,
        [playerId]
      ).catch(() => {});
    });
  } else if (MATRIX_PACKAGES[productId]) {
    const pkg = MATRIX_PACKAGES[productId];
    // Add matrix energy to player
    await db.query(
      `UPDATE players SET matrix_energy = COALESCE(matrix_energy, 0) + $1 WHERE id = $2`,
      [pkg.energy, playerId]
    ).catch(async () => {
      await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS matrix_energy INTEGER DEFAULT 0`).catch(() => {});
      await db.query(
        `UPDATE players SET matrix_energy = COALESCE(matrix_energy, 0) + $1 WHERE id = $2`,
        [pkg.energy, playerId]
      ).catch(() => {});
    });
  }

  console.log(`[PayPal] Applied rewards: ${productId} for player ${playerId}`);
}

function getSuccessMessage(productId: string): string {
  if (productId === "glb_subscription_1month") {
    return "GLB Creator Pass activated! You can now upload 3D models for 30 days.";
  }
  const pkg = MATRIX_PACKAGES[productId];
  if (pkg) return `${pkg.energy} Matrix Energy added to your account!`;
  return "Purchase successful!";
}
