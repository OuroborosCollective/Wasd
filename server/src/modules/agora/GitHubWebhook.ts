import crypto from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";

const RATE_LIMIT_WINDOW_MS = Number(process.env.GITHUB_WEBHOOK_RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.GITHUB_WEBHOOK_RATE_LIMIT_MAX_REQUESTS || 60);
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(req: Request): string {
  const forwardedFor = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || req.ip || req.socket.remoteAddress || "unknown";
}

function githubWebhookRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const key = getRateLimitKey(req);
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    res.setHeader("RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, RATE_LIMIT_MAX_REQUESTS - 1)));
    return next();
  }

  current.count += 1;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - current.count);
  res.setHeader("RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

  if (current.count > RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ ok: false, error: "github_webhook_rate_limited" });
  }

  return next();
}

function cleanupRateLimitBuckets() {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function verifyGitHubSignature(req: Request, rawBody: Buffer): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret) return true;

  const signature = req.header("x-hub-signature-256") || "";
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;

  if (!signature.startsWith("sha256=") || !expected.startsWith("sha256=")) return false;
  return timingSafeEqualHex(signature.slice("sha256=".length), expected.slice("sha256=".length));
}

export function createGitHubWebhookRouter() {
  const router = express.Router();

  router.post(
    "/github",
    githubWebhookRateLimit,
    express.json({
      limit: "2mb",
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      },
    }),
    (req, res) => {
      cleanupRateLimitBuckets();
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));

      if (!verifyGitHubSignature(req, rawBody)) {
        return res.status(401).json({ ok: false, error: "invalid_github_signature" });
      }

      const event = req.header("x-github-event") || "unknown";
      const delivery = req.header("x-github-delivery") || "unknown";
      const payload = req.body ?? {};
      const repository = payload.repository?.full_name || payload.repository?.name || "unknown";
      const ref = payload.ref || null;
      const deleted = Boolean(payload.deleted);
      const after = payload.after || null;

      console.log("[AgoraGitHubWebhook] received", { event, delivery, repository, ref, deleted, after });

      return res.json({
        ok: true,
        receiver: "agora-github-webhook",
        event,
        delivery,
        repository,
        ref,
        deleted,
      });
    },
  );

  router.get("/github", (_req, res) => {
    res.json({ ok: true, receiver: "agora-github-webhook", method: "POST required" });
  });

  return router;
}
