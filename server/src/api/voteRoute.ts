import express, { Router, type Request, type Response } from "express";
import { type AdminRequest } from "../middleware/adminAuthMiddleware.js";
import { adminAuthRequestHandler, adminWriteBlockedHandler } from "../middleware/adminRequestHandlers.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";
import type { WorldTick } from "../core/are/index.js";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function asAdminRequest(req: Request): AdminRequest {
  return req as AdminRequest;
}

export function voteRouter(tick: WorldTick): Router {
  const router = Router();
  router.use(express.json({ limit: "256kb" }));

  router.get("/banners", (_req, res: Response) => {
    res.json({ banners: tick.listActiveVoteBanners() });
  });

  router.post("/callback", (req, res: Response) => {
    const sessionId = asString(req.body?.sessionId ?? req.query?.sessionId);
    const callbackToken = asString(req.body?.callbackToken ?? req.query?.callbackToken);
    const providerKey = asString(req.body?.providerKey ?? req.query?.providerKey) || undefined;
    const bannerId = asString(req.body?.bannerId ?? req.query?.bannerId) || undefined;
    const providerVoteId = asString(req.body?.providerVoteId ?? req.query?.providerVoteId) || undefined;
    const evidence = asObject(req.body?.evidence);
    const result = tick.handleVoteProviderCallback({ sessionId, callbackToken, providerKey, bannerId, providerVoteId, evidence });
    if (!result.ok) {
      return res.status(400).json({ ok: false, reason: result.reason ?? "Vote callback rejected.", sessionId: result.sessionId, playerId: result.playerId, bannerId: result.bannerId });
    }
    return res.json({ ok: true, reason: result.reason, sessionId: result.sessionId, playerId: result.playerId, bannerId: result.bannerId });
  });

  router.get("/admin/banners", adminRateLimiter, adminAuthRequestHandler, (req: Request, res: Response) => {
    void asAdminRequest(req);
    res.json({ banners: tick.getAdminVoteBanners() });
  });

  router.post("/admin/banners", adminRateLimiter, adminAuthRequestHandler, adminWriteBlockedHandler, (req: Request, res: Response) => {
    try {
      const body = asAdminRequest(req).body;
      const result = tick.upsertVoteBanner({
        internalId: asString(body?.internalId) || undefined,
        providerKey: asString(body?.providerKey),
        displayName: asString(body?.displayName),
        bannerImage: asString(body?.bannerImage),
        targetUrl: asString(body?.targetUrl),
        description: asString(body?.description) || undefined,
        isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined,
        sortOrder: body?.sortOrder !== undefined ? toInt(body.sortOrder, 0) : undefined,
        voteWindowHours: body?.voteWindowHours !== undefined ? toInt(body.voteWindowHours, 12) : undefined,
        cooldownHours: body?.cooldownHours !== undefined ? toInt(body.cooldownHours, 24) : undefined,
        buffHours: body?.buffHours !== undefined ? toInt(body.buffHours, 4) : undefined,
        verificationMode: body?.verificationMode === "callback_token" ? "callback_token" : body?.verificationMode === "api_poll" ? "api_poll" : undefined,
        providerConfig: asObject(body?.providerConfig),
        claimInstructions: asString(body?.claimInstructions) || undefined,
        metadata: asObject(body?.metadata),
      });
      if (!result.ok) return res.status(400).json({ ok: false, reason: result.reason ?? "Invalid vote banner payload." });
      return res.json({ ok: true, banner: result.banner, banners: tick.getAdminVoteBanners() });
    } catch (error) {
      return res.status(400).json({ ok: false, reason: error instanceof Error ? error.message : "Invalid vote banner payload." });
    }
  });

  router.delete("/admin/banners/:internalId", adminRateLimiter, adminAuthRequestHandler, adminWriteBlockedHandler, (req: Request, res: Response) => {
    const internalId = asString(req.params.internalId);
    if (!internalId) return res.status(400).json({ ok: false, reason: "internalId is required." });
    const result = tick.deleteVoteBanner(internalId);
    if (!result.ok) return res.status(404).json({ ok: false, reason: result.reason ?? "Vote banner not found." });
    return res.json({ ok: true, banners: tick.getAdminVoteBanners() });
  });

  router.post("/admin/banners/reorder", adminRateLimiter, adminAuthRequestHandler, adminWriteBlockedHandler, (req: Request, res: Response) => {
    const ids: unknown[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ordered = tick.setVoteBannerOrder(ids.map((value: unknown) => asString(value)).filter((value: string) => value.length > 0));
    return res.json({ ok: true, banners: ordered });
  });

  router.get("/admin/diagnostics", adminRateLimiter, adminAuthRequestHandler, (_req: Request, res: Response) => {
    res.json({ diagnostics: tick.getVoteAdminDiagnostics() });
  });

  return router;
}
