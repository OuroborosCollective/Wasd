import express, { type Request, type Response, type Router } from "express";
import { novuNotificationService, type AreloriaNotificationInput } from "../services/NovuNotificationService.js";

function requireNotificationAdmin(req: Request): boolean {
  const expected = process.env.NOTIFICATION_ADMIN_TOKEN || process.env.ADMIN_DEPLOY_TOKEN || process.env.SOVEREIGN_LAUNCH_KEY || "";
  if (!expected) return process.env.NODE_ENV !== "production";
  const provided = String(req.headers["x-notification-admin-token"] || req.headers["x-sovereign-launch-key"] || req.body?.adminToken || "");
  return provided.length > 0 && provided === expected;
}

function sanitizePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function notificationRouter(): Router {
  const r = express.Router();
  r.use(express.json({ limit: "64kb" }));

  r.get("/status", (_req: Request, res: Response) => {
    res.json({ ok: true, provider: "novu", ...novuNotificationService.status() });
  });

  r.post("/trigger", async (req: Request, res: Response) => {
    if (!requireNotificationAdmin(req)) {
      res.status(403).json({ ok: false, error: "notification_admin_token_required" });
      return;
    }

    const topic = String(req.body?.topic || "").trim();
    const subscriber = req.body?.subscriber ?? req.body?.subscriberId;

    if (!topic) {
      res.status(400).json({ ok: false, error: "topic_required" });
      return;
    }

    if (!subscriber) {
      res.status(400).json({ ok: false, error: "subscriber_required" });
      return;
    }

    const input: AreloriaNotificationInput = {
      topic,
      subscriber,
      payload: sanitizePayload(req.body?.payload),
      actor: typeof req.body?.actor === "string" ? req.body.actor : "api",
      tenant: typeof req.body?.tenant === "string" ? req.body.tenant : undefined,
      context: sanitizePayload(req.body?.context),
    };

    const result = await novuNotificationService.notify(input);
    res.status(result.ok ? 202 : 502).json(result);
  });

  r.post("/admin-alert", async (req: Request, res: Response) => {
    if (!requireNotificationAdmin(req)) {
      res.status(403).json({ ok: false, error: "notification_admin_token_required" });
      return;
    }

    const topic = String(req.body?.topic || "liveheal_anomaly").trim();
    const result = await novuNotificationService.notifyAdmin(topic, sanitizePayload(req.body?.payload));
    res.status(result.ok ? 202 : 502).json(result);
  });

  return r;
}
