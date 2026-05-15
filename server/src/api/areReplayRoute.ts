import express from "express";
import type { WorldTick } from "../core/WorldTick.js";
import { attachSovereignBillingBridge } from "../market/SovereignBillingBridge.js";
import { calculateUsageCost, sovereignMarket } from "../market/SovereignMarket.js";

function parseTick(raw: string): number | null {
  const tick = Number(raw);
  if (!Number.isInteger(tick) || tick < 0) return null;
  return tick;
}

export function areReplayRouter(tick: WorldTick) {
  const router = express.Router();
  attachSovereignBillingBridge(tick as any, (tick as any).ws ?? { broadcast: () => undefined });

  router.get("/stats", (_req, res) => {
    res.json({ ok: true, stats: tick.getReplayRecorderStats?.() ?? null });
  });

  router.get("/repair/status", (_req, res) => {
    res.json({ ok: true, autoRepair: tick.getAutoRepairStatus?.() ?? null });
  });

  router.get("/billing/status", (_req, res) => {
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

  router.get("/oracle/prophecy", (_req, res) => {
    const oracle = tick.getOracleReport?.() ?? null;
    res.json({ ok: true, oracle });
  });

  router.get("/oracle/status", (_req, res) => {
    const oracle = tick.getOracleReport?.() ?? null;
    const active = oracle?.prophecies?.some((prophecy: any) => prophecy.active) ?? false;
    res.json({ ok: true, active, generatedAtTick: oracle?.generatedAtTick ?? null, prophecyCount: oracle?.prophecies?.length ?? 0 });
  });

  router.get("/snapshot/:tick", (req, res) => {
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
