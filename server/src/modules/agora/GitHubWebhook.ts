import crypto from "node:crypto";
import express, { type Request } from "express";

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
    express.json({
      limit: "2mb",
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      },
    }),
    (req, res) => {
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
