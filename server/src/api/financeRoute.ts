import { Router } from "express";
import { paypalAdapter } from "../finance/PayPalAdapter.js";
import { authRequestHandler } from "../middleware/authRequestHandler.js";

function resolveAuthenticatedPlayerId(req: unknown): string | null {
  const playerId = (req as { playerId?: unknown })?.playerId;
  return typeof playerId === "string" && playerId.trim().length > 0 ? playerId.trim() : null;
}

export function financeRouter(): Router {
  const router = Router();

  router.get("/status", (_req, res) => {
    res.json({
      ok: true,
      paypal: {
        configured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET),
        environment: process.env.PAYPAL_ENV || "sandbox",
        currency: process.env.PAYPAL_CURRENCY || "EUR",
      },
    });
  });

  router.post("/paypal/checkout", authRequestHandler, async (req, res) => {
    try {
      const clientId = resolveAuthenticatedPlayerId(req);
      if (!clientId) {
        return res.status(401).json({ ok: false, error: "authenticated_player_required" });
      }
      const displayName = String(req.body?.displayName || clientId);
      const credits = Number(req.body?.credits ?? 0);
      const returnUrl = req.body?.returnUrl ? String(req.body.returnUrl) : undefined;
      const cancelUrl = req.body?.cancelUrl ? String(req.body.cancelUrl) : undefined;
      const result = await paypalAdapter.createCheckoutLink({ clientId, displayName, credits, returnUrl, cancelUrl });
      res.json(result);
    } catch (error) {
      res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "paypal_checkout_failed" });
    }
  });

  router.post("/paypal/verify", authRequestHandler, async (req, res) => {
    try {
      const transactionId = String(req.body?.transactionId || req.body?.orderId || "");
      const result = await paypalAdapter.creditVerifiedTransaction(transactionId);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) {
      res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "paypal_verify_failed" });
    }
  });

  router.post("/paypal/webhook", async (req, res) => {
    try {
      const result = await paypalAdapter.handleWebhook(req);
      res.status(result.ok || result.status === "ignored" ? 200 : 400).json(result);
    } catch (error) {
      res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "paypal_webhook_failed" });
    }
  });

  return router;
}
