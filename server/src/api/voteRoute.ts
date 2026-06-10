import express, { Router, type Response } from "express";
import { adminAuthMiddleware, adminWriteBlocked, type AdminRequest } from "../middleware/adminAuthMiddleware.js";
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

export function voteRouter(tick: WorldTick): Router {
  const router = Router();
  router.use(express.json({ limit: "256kb" }));

  router.get("/banners", (_req, res: Response) => {
    res.json({
      banners: tick.listActiveVoteBanners(),
    });
  });

  router.post("/callback", (req, res: Response) => {
    const sessionId = asString(req.body?.sessionId ?? req.query?.sessionId);
    const callbackToken = asString(req.body?.callbackToken ?? req.query?.callbackToken);
    const providerKey = asString(req.body?.providerKey ?? req.query?.providerKey) || undefined;
    const bannerId = asString(req.body?.bannerId ?? req.query?.bannerId) || undefined;
    const providerVoteId =
      asString(req.body?.providerVoteId ?? req.query?.providerVoteId) || undefined;
    const evidence = asObject(req.body?.evidence);
    const result = tick.handleVoteProviderCallback({
      sessionId,
      callbackToken,
      providerKey,
      bannerId,
      providerVoteId,
      evidence,
    });
    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        reason: result.reason ?? "Vote callback rejected.",
        sessionId: result.sessionId,
        playerId: result.playerId,
        bannerId: result.bannerId,
      });
    }
    return res.json({
      ok: true,
      reason: result.reason,
      sessionId: result.sessionId,
      playerId: result.playerId,
      bannerId: result.bannerId,
    });
  });

  router.get("/admin/banners", adminAuthMiddleware, (_req: AdminRequest, res: Response) => {
    res.json({
      banners: tick.getAdminVoteBanners(),
    });
  });

  router.post(
    "/admin/banners",
    adminAuthMiddleware,
    adminWriteBlocked,
    (req: AdminRequest, res: Response) => {
      try {
        const result = tick.upsertVoteBanner({
          internalId: asString(req.body?.internalId) || undefined,
          providerKey: asString(req.body?.providerKey),
          displayName: asString(req.body?.displayName),
          bannerImage: asString(req.body?.bannerImage),
          targetUrl: asString(req.body?.targetUrl),
          description: asString(req.body?.description) || undefined,
          isActive:
            typeof req.body?.isActive === "boolean"
              ? req.body.isActive
              : undefined,
          sortOrder:
            req.body?.sortOrder !== undefined ? toInt(req.body.sortOrder, 0) : undefined,
          voteWindowHours:
            req.body?.voteWindowHours !== undefined
              ? toInt(req.body.voteWindowHours, 12)
              : undefined,
          cooldownHours:
            req.body?.cooldownHours !== undefined
              ? toInt(req.body.cooldownHours, 24)
              : undefined,
          buffHours:
            req.body?.buffHours !== undefined ? toInt(req.body.buffHours, 4) : undefined,
          verificationMode:
            req.body?.verificationMode === "callback_token"
              ? "callback_token"
              : req.body?.verificationMode === "api_poll"
                ? "api_poll"
                : undefined,
          providerConfig: asObject(req.body?.providerConfig),
          claimInstructions: asString(req.body?.claimInstructions) || undefined,
          metadata: asObject(req.body?.metadata),
        });
        if (!result.ok) {
          return res.status(400).json({
            ok: false,
            reason: result.reason ?? "Invalid vote banner payload.",
          });
        }
        return res.json({
          ok: true,
          banner: result.banner,
          banners: tick.getAdminVoteBanners(),
        });
      } catch (error) {
        return res.status(400).json({
          ok: false,
          reason: error instanceof Error ? error.message : "Invalid vote banner payload.",
        });
      }
    },
  );

  router.delete(
    "/admin/banners/:internalId",
    adminAuthMiddleware,
    adminWriteBlocked,
    (req: AdminRequest, res: Response) => {
      const internalId = asString(req.params.internalId);
      if (!internalId) {
        return res.status(400).json({ ok: false, reason: "internalId is required." });
      }
      const result = tick.deleteVoteBanner(internalId);
      if (!result.ok) {
        return res.status(404).json({ ok: false, reason: result.reason ?? "Vote banner not found." });
      }
      return res.json({ ok: true, banners: tick.getAdminVoteBanners() });
    },
  );

  router.post(
    "/admin/banners/reorder",
    adminAuthMiddleware,
    adminWriteBlocked,
    (req: AdminRequest, res: Response) => {
      const ids: unknown[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const ordered = tick.setVoteBannerOrder(
        ids.map((value: unknown) => asString(value)).filter((value: string) => value.length > 0),
      );
      return res.json({ ok: true, banners: ordered });
    },
  );

  router.get(
    "/admin/diagnostics",
    adminAuthMiddleware,
    (_req: AdminRequest, res: Response) => {
      res.json({
        diagnostics: tick.getVoteAdminDiagnostics(),
      });
    },
  );

  return router;
}