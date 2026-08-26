import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { isSupabaseAuthConfigured, verifySupabaseToken } from "../config/supabase.js";

export type AdminRequest = Request & {
  adminAuth?: { mode: "token" } | { mode: "supabase"; uid: string };
};

function parseAllowlist(envKey: string): Set<string> {
  const raw = process.env[envKey]?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[\s,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function headerValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || "").trim() : String(value || "").trim();
}

function hasValidSovereignLaunchCredential(req: Request): boolean {
  if (req.method.toUpperCase() !== "POST") return false;
  if (req.baseUrl !== "/api/sovereign/deploy") return false;
  if (req.path !== "/launch") return false;
  const expected = (process.env.SOVEREIGN_LAUNCH_KEY || process.env.ADMIN_DEPLOY_TOKEN || "").trim();
  if (!expected) return false;
  const provided = headerValue(req.headers["x-sovereign-launch-key"]);
  return provided.length > 0 && safeEqualText(provided, expected);
}

function hashBuffer(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeEqualText(a: string, b: string): boolean {
  const left = hashBuffer(a);
  const right = hashBuffer(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function readDashboardAccessValue(req: Request): string {
  const direct = headerValue(req.headers["x-dashboard-admin-tsx"]);
  if (direct) return direct;
  const auth = headerValue(req.headers.authorization);
  if (!auth.startsWith("Basic ")) return "";
  try {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    const colon = decoded.indexOf(":");
    return colon >= 0 ? decoded.slice(colon + 1) : "";
  } catch {
    return "";
  }
}

function readDashboardConfiguredValue(): string {
  return (process.env.DASHBOARD_ADMIN_TSX || process.env.dashboard_admin_tsx || "").trim();
}

export const adminAuthMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const adminReq = req as AdminRequest;
  const panel = process.env.ADMIN_PANEL_TOKEN?.trim();
  const legacyPanel = process.env.GM_PANEL_TOKEN?.trim();
  const acceptedPanelTokens = [panel, legacyPanel].filter(
    (v): v is string => Boolean(v && v.trim().length > 0)
  );
  const authHeader = req.headers.authorization;
  const bearer = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const headerToken = headerValue(req.headers["x-admin-token"]);

  // Use constant-time comparison for admin tokens to prevent timing attacks
  const hasPanelCandidate = acceptedPanelTokens.some(
    (token) => (bearer && safeEqualText(bearer, token)) || (headerToken && safeEqualText(headerToken, token))
  );

  if (hasPanelCandidate && acceptedPanelTokens.length > 0) {
    adminReq.adminAuth = { mode: "token" };
    next();
    return;
  }

  if (hasValidSovereignLaunchCredential(req)) {
    next();
    return;
  }

  if (!bearer && !headerToken && acceptedPanelTokens.length > 0) {
    res.status(401).json({ error: "Admin token or Supabase Bearer required" });
    return;
  }

  if (!bearer) {
    res.status(401).json({ error: "Missing Authorization: Bearer ***" });
    return;
  }

  try {
    if (isSupabaseAuthConfigured()) {
      try {
        const claims = verifySupabaseToken(bearer);
        const uid = typeof claims.sub === "string" ? claims.sub.trim() : "";
        const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
        if (!uid) {
          res.status(401).json({ error: "Invalid token" });
          return;
        }

        const allowUid = parseAllowlist("ADMIN_UID_ALLOWLIST");
        const allowEmail = parseAllowlist("ADMIN_EMAIL_ALLOWLIST");

        let authorized = true;
        if (allowUid.size > 0 || allowEmail.size > 0) {
          authorized = false;
          if (allowUid.size > 0 && allowUid.has(uid.toLowerCase())) authorized = true;
          if (!authorized && allowEmail.size > 0 && email && allowEmail.has(email)) authorized = true;
        }

        if (!authorized) {
          res.status(403).json({ error: "Forbidden: user not in allowlist" });
          return;
        }

        adminReq.adminAuth = { mode: "supabase", uid };
        next();
        return;
      } catch {}
    }

    const hasPanel = acceptedPanelTokens.length > 0;
    if (!isSupabaseAuthConfigured() && !hasPanel) {
      res.status(503).json({
        error: "Auth provider not configured. Set SUPABASE_JWT_SECRET (or JWT_SECRET / GOTRUE_JWT_SECRET) to match GoTrue, or use ADMIN_PANEL_TOKEN.",
      });
      return;
    }
    res.status(401).json({ error: "Invalid token" });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const adminWriteBlocked: RequestHandler = (_req: Request, res: Response, next: NextFunction): void => {
  const ro = process.env.CONTENT_ADMIN_READONLY?.trim();
  if (ro === "1" || ro === "true" || ro === "yes") {
    res.status(403).json({ error: "Content admin is read-only (CONTENT_ADMIN_READONLY)" });
    return;
  }
  next();
};

export const adminDashboardAccess: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const expected = readDashboardConfiguredValue();
  if (!expected && process.env.NODE_ENV !== "production") {
    next();
    return;
  }
  const provided = readDashboardAccessValue(req);
  if (expected && provided && safeEqualText(provided, expected)) {
    next();
    return;
  }
  res.setHeader("WWW-Authenticate", 'Basic realm="Areloria Dashboard"');
  res.status(401).type("text/plain").send("Dashboard access required.");
};
