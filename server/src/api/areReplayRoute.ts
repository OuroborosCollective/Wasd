import express from "express";
import { authRequestHandler } from "../middleware/authRequestHandler.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";
import type { WorldTick } from "../core/are/index.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { attachSovereignBillingBridge } from "../market/SovereignBillingBridge.js";
import { calculateUsageCost, sovereignMarket } from "../market/SovereignMarket.js";
import { paypalAdapter } from "../finance/PayPalAdapter.js";
import { sovereignGovernance } from "../governance/SovereignGovernance.js";

function firstParam(raw: unknown): string {
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return typeof raw === "string" ? raw : "";
}

function parseTick(raw: unknown): number | null {
  const tick = Number(firstParam(raw));
  if (!Number.isInteger(tick) || tick < 0) return null;
  return tick;
}

function broadcastCouncil(tick: WorldTick, payload: unknown): void {
  const ws = (tick as any).ws;
  if (ws && typeof ws.broadcast === "function") {
    ws.broadcast({ type: "SOVEREIGN_COUNCIL", payload });
  }
}

export function areReplayRouter(tick: WorldTick) {
  const router = express.Router();
  attachSovereignBillingBridge(tick as any, (tick as any).ws ?? { broadcast: () => undefined });
  sovereignGovernance.attachToTick(tick as any);

  router.get("/stats", adminRateLimiter, adminAuthMiddleware, (_req, res) => {
    res.json({ ok: true, stats: tick.getReplayRecorderStats?.() ?? null });
  });

  router.get("/repair/status", adminRateLimiter, adminAuthMiddleware, (_req, res) => {
    res.json({ ok: true, autoRepair: tick.getAutoRepairStatus?.() ?? null });
  });

  router.get("/billing/status", adminRateLimiter, adminAuthMiddleware, (_req, res) => {
    const usage = tick.getDeterministicUsageStats?.() ?? null;
    res.json({
      ok: true,
      usage,
      cost: usage ? calculateUsageCost(usage) : calculateUsageCost({ hashesInWindow: 0 }),
      billing: (tick as any).getSdkBillingStatus?.() ?? { suspended: false, message: null, market: sovereignMarket.getStatus() },
      market: sovereignMarket.getStatus(),
    });
  });

  router.post("/billing/preview-cost", express.json({ limit: "64kb" }), (req, res) => {
    const hashesInWindow = Number(req.body?.hashesInWindow ?? req.body?.hashes ?? 0);
    res.json({ ok: true, cost: calculateUsageCost({ hashesInWindow }) });
  });

  router.post("/billing/credit", express.json({ limit: "64kb" }), (req, res) => {
    const adminKey = process.env.SOVEREIGN_LAUNCH_KEY || process.env.ARE_MARKET_ADMIN_KEY || "";
    const provided = String(req.headers["x-sovereign-key"] || req.body?.key || "");
    if (!adminKey || provided !== adminKey) return res.status(403).json({ ok: false, error: "forbidden" });
    const source = String(req.body?.source || process.env.ARE_SDK_CLIENT_ID || "local-engine");
    const displayName = String(req.body?.displayName || source);
    const credits = Number(req.body?.credits ?? 0);
    if (!Number.isFinite(credits) || credits <= 0) return res.status(400).json({ ok: false, error: "invalid_credits" });
    const account = sovereignMarket.creditAccount(source, credits, displayName);
    res.json({ ok: true, account, market: sovereignMarket.getStatus() });
  });

  router.post("/billing/paypal/checkout", express.json({ limit: "64kb" }), async (req, res) => {
    try {
      const clientId = String(req.body?.clientId || process.env.ARE_SDK_CLIENT_ID || "local-engine");
      const displayName = String(req.body?.displayName || process.env.ARE_SDK_DISPLAY_NAME || clientId);
      const credits = Number(req.body?.credits ?? 25);
      const checkout = await paypalAdapter.createCheckoutLink({ clientId, displayName, credits, returnUrl: req.body?.returnUrl, cancelUrl: req.body?.cancelUrl });
      res.json(checkout);
    } catch (error) {
      res.status(500).json({ ok: false, error: "paypal_checkout_failed", message: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post("/billing/paypal/webhook", express.json({ limit: "256kb" }), async (req, res) => {
    try {
      const result = await paypalAdapter.handleWebhook(req);
      if (result.credited && result.message) {
        const ws = (tick as any).ws;
        if (ws && typeof ws.broadcast === "function") {
          ws.broadcast({ type: "CHAT_MSG", payload: { channel: "system", sender: "Emily-Finance", text: result.message } });
          ws.broadcast({ type: "ARE_BILLING", payload: { market: sovereignMarket.getStatus(), paypal: { credited: true, transactionId: result.transactionId, credits: result.credits } } });
        }
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: "paypal_webhook_failed", message: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get("/governance/status", adminRateLimiter, adminAuthMiddleware, (_req, res) => {
    const report = sovereignGovernance.getReport(Number(tickContextProvider.getContext().tickId));
    res.json(report);
  });

  router.post("/governance/directives", express.json({ limit: "96kb" }), (req, res) => {
    try {
      const directive = sovereignGovernance.propose({ ...req.body, tick: Number(tickContextProvider.getContext().tickId) });
      const report = sovereignGovernance.getReport(Number(tickContextProvider.getContext().tickId));
      broadcastCouncil(tick, report);
      res.json({ ok: true, directive, report });
    } catch (error) {
      res.status(400).json({ ok: false, error: "directive_rejected", message: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post("/governance/directives/:id/vote", express.json({ limit: "96kb" }), (req, res) => {
    try {
      const vote = sovereignGovernance.vote({ ...req.body, directiveId: req.params.id, tick: Number(tickContextProvider.getContext().tickId) });
      const report = sovereignGovernance.getReport(Number(tickContextProvider.getContext().tickId));
      broadcastCouncil(tick, report);
      res.json({ ok: true, vote, report });
    } catch (error) {
      res.status(400).json({ ok: false, error: "vote_rejected", message: error instanceof Error ? error.message : String(error) });
    }
  });

  router.post("/governance/directives/:id/enact", express.json({ limit: "32kb" }), (req, res) => {
    try {
      const adminKey = process.env.SOVEREIGN_LAUNCH_KEY || process.env.ARE_GOVERNANCE_ADMIN_KEY || "";
      const provided = String(req.headers["x-sovereign-key"] || req.body?.key || "");
      if (adminKey && provided !== adminKey) return res.status(403).json({ ok: false, error: "forbidden" });
      const directive = sovereignGovernance.enact(req.params.id, Number(tickContextProvider.getContext().tickId));
      const report = sovereignGovernance.getReport(Number(tickContextProvider.getContext().tickId));
      broadcastCouncil(tick, report);
      res.json({ ok: true, directive, report });
    } catch (error) {
      res.status(400).json({ ok: false, error: "enact_rejected", message: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get("/oracle/prophecy", adminRateLimiter, adminAuthMiddleware, (_req, res) => {
    const oracle = tick.getOracleReport?.() ?? null;
    res.json({ ok: true, oracle });
  });

  router.get("/oracle/status", adminRateLimiter, adminAuthMiddleware, (_req, res) => {
    const oracle = tick.getOracleReport?.() ?? null;
    const active = oracle?.prophecies?.some((prophecy: any) => prophecy.active) ?? false;
    res.json({ ok: true, active, generatedAtTick: oracle?.generatedAtTick ?? null, prophecyCount: oracle?.prophecies?.length ?? 0 });
  });

  router.get("/snapshot/:tick", adminRateLimiter, authRequestHandler, (req, res) => {
    const requestedTick = parseTick(req.params.tick);
    if (requestedTick === null) {
      res.status(400).json({ ok: false, error: "invalid_tick", message: "Tick must be a positive integer." });
      return;
    }

    const replay = tick.getReplaySnapshot?.(requestedTick);
    if (!replay) {
      res.status(404).json({
        ok: false,
        error: "replay_tick_not_found",
        message: "Requested tick is outside the in-memory replay ring buffer.",
        stats: tick.getReplayRecorderStats?.() ?? null,
      });
      return;
    }

    res.json(replay);
  });

  return router;
}
