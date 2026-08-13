import { Router } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { calculateUsageCost, sovereignMarket } from "../market/SovereignMarket.js";

function safeEqualText(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return left.length === right.length && timingSafeEqual(left, right);
}

export function sdkBillingRouter(tick?: any): Router {
  const router = Router();

  router.get("/status", (_req, res) => {
    const usage = tick?.getDeterministicUsageStats?.() ?? null;
    const billing = tick?.getSdkBillingStatus?.() ?? { suspended: false, message: null, market: sovereignMarket.getStatus() };
    res.json({
      ok: true,
      usage,
      cost: usage ? calculateUsageCost(usage) : calculateUsageCost({ hashesInWindow: 0 }),
      billing,
      market: sovereignMarket.getStatus(),
    });
  });

  router.post("/preview-cost", (req, res) => {
    const hashesInWindow = Number(req.body?.hashesInWindow ?? req.body?.hashes ?? 0);
    res.json({ ok: true, cost: calculateUsageCost({ hashesInWindow }) });
  });

  router.post("/credit", (req, res) => {
    const adminKey = process.env.SOVEREIGN_LAUNCH_KEY || process.env.ARE_MARKET_ADMIN_KEY || "";
    const provided = String(req.headers["x-sovereign-key"] || req.body?.key || "");
    if (!adminKey || !safeEqualText(provided, adminKey)) return res.status(403).json({ ok: false, error: "forbidden" });
    const source = String(req.body?.source || process.env.ARE_SDK_CLIENT_ID || "local-engine");
    const displayName = String(req.body?.displayName || source);
    const credits = Number(req.body?.credits ?? 0);
    if (!Number.isFinite(credits) || credits <= 0) return res.status(400).json({ ok: false, error: "invalid_credits" });
    const account = sovereignMarket.creditAccount(source, credits, displayName);
    res.json({ ok: true, account, market: sovereignMarket.getStatus() });
  });

  return router;
}
