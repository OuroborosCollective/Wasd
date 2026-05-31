import crypto from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";

const RATE_LIMIT_WINDOW_MS = Number(process.env.ARELORIAN_WEBHOOK_RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.ARELORIAN_WEBHOOK_RATE_LIMIT_MAX_REQUESTS || 60);
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export type AgoraGitHubWebhookEvent = {
  receivedAt: string;
  event: string;
  delivery: string;
  repository: string;
  ref: string | null;
  branch: string | null;
  deleted: boolean;
  before: string | null;
  after: string | null;
  commitSha: string | null;
  compareUrl: string | null;
  sender: string | null;
  pusher: string | null;
  headCommitMessage: string | null;
  prNumber: number | null;
};

let lastGitHubWebhookEvent: AgoraGitHubWebhookEvent | null = null;

export function getLastGitHubWebhookEvent(): AgoraGitHubWebhookEvent | null {
  return lastGitHubWebhookEvent;
}

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
  const secret = process.env.ARELORIAN_WEBHOOK_SECRET?.trim() || process.env.OC_AGORA_WEBHOOK_SECRET?.trim();
  if (!secret) return true;

  const signature = req.header("x-hub-signature-256") || "";
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;

  if (!signature.startsWith("sha256=") || !expected.startsWith("sha256=")) return false;
  return timingSafeEqualHex(signature.slice("sha256=".length), expected.slice("sha256=".length));
}

function branchFromRef(ref: unknown): string | null {
  if (typeof ref !== "string") return null;
  return ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : ref;
}

function numberFromUnknown(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function extractPrNumber(event: string, payload: any): number | null {
  if (event === "pull_request") return numberFromUnknown(payload.number);
  if (event === "check_suite" || event === "check_run") return numberFromUnknown(payload.pull_requests?.[0]?.number);
  if (event === "workflow_run") return numberFromUnknown(payload.workflow_run?.pull_requests?.[0]?.number);
  return null;
}

function rememberGitHubWebhookEvent(req: Request, payload: any): AgoraGitHubWebhookEvent {
  const event = req.header("x-github-event") || "unknown";
  const ref = typeof payload.ref === "string" ? payload.ref : null;
  const after = typeof payload.after === "string" && !/^0+$/.test(payload.after) ? payload.after : null;
  const headCommitId = typeof payload.head_commit?.id === "string" ? payload.head_commit.id : null;

  lastGitHubWebhookEvent = {
    receivedAt: new Date().toISOString(),
    event,
    delivery: req.header("x-github-delivery") || "unknown",
    repository: payload.repository?.full_name || payload.repository?.name || "unknown",
    ref,
    branch: branchFromRef(ref),
    deleted: Boolean(payload.deleted),
    before: typeof payload.before === "string" && !/^0+$/.test(payload.before) ? payload.before : null,
    after,
    commitSha: after || headCommitId,
    compareUrl: typeof payload.compare === "string" ? payload.compare : null,
    sender: payload.sender?.login || null,
    pusher: payload.pusher?.name || null,
    headCommitMessage: typeof payload.head_commit?.message === "string" ? payload.head_commit.message : null,
    prNumber: extractPrNumber(event, payload),
  };

  return lastGitHubWebhookEvent;
}

export function createGitHubWebhookRouter(): Router {
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

      const payload = req.body ?? {};
      const remembered = rememberGitHubWebhookEvent(req, payload);

      console.log("[AgoraGitHubWebhook] received", remembered);

      return res.json({
        ok: true,
        receiver: "agora-github-webhook",
        event: remembered.event,
        delivery: remembered.delivery,
        repository: remembered.repository,
        ref: remembered.ref,
        branch: remembered.branch,
        deleted: remembered.deleted,
        commitSha: remembered.commitSha,
        prNumber: remembered.prNumber,
      });
    },
  );

  router.get("/github", (_req, res) => {
    res.json({ ok: true, receiver: "agora-github-webhook", method: "POST required", lastEvent: getLastGitHubWebhookEvent() });
  });

  return router;
}
