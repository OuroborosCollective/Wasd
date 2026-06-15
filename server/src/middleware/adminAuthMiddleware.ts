import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
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
  return provided.length > 0 && provided === expected;
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

/**
 * Protects no-code admin HTTP APIs.
 * - If `ADMIN_PANEL_TOKEN` is set: accept `Authorization: Bearer ***` or `X-Admin-Token: <token>`.
 * - Also allows Supabase ID token (`Authorization: Bearer ***`) if configured.
 * - If `ADMIN_UID_ALLOWLIST` or `ADMIN_EMAIL_ALLOWLIST` is non-empty, user must match at least one.
 */
export async function adminAuthMiddleware(req: AdminRequest, res: Response, next: NextFunction) {
  const panel = process.env.ADMIN_PANEL_TOKEN?.trim();
  const legacyPanel = process.env.GM_PANEL_TOKEN?.trim();
  const acceptedPanelTokens = [panel, legacyPanel].filter(
    (v): v is string => Boolean(v && v.trim().length > 0)
  );
  const authHeader = req.headers.authorization;
  const bearer =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const headerToken = headerValue(req.headers["x-admin-token"]);
  const hasPanelCandidate =
    acceptedPanelTokens.includes(bearer) || acceptedPanelTokens.includes(headerToken);

  if (hasPanelCandidate && acceptedPanelTokens.length > 0) {
    req.adminAuth = { mode: "token" };
    return next();
  }

  if (hasValidSovereignLaunchCredential(req)) {
    return next();
  }

  if (!bearer && !headerToken && acceptedPanelTokens.length > 0) {
    return res.status(401).json({ error: "Admin token or Supabase Bearer required" });
  }

  if (!bearer) {
    return res.status(401).json({ error: "Missing Authorization: Bearer ***" });
  }

  try {
    if (isSupabaseAuthConfigured()) {
      try {
        const claims = verifySupabaseToken(bearer);
        const uid = typeof claims.sub === "string" ? claims.sub.trim() : "";
        const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
        if (!uid) {
          return res.status(401).json({ error: "Invalid token" });
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
          return res.status(403).json({ error: "Forbidden: user not in allowlist" });
        }

        req.adminAuth = { mode: "supabase", uid };
        return next();
      } catch {
        // Fall through to generic error
      }
    }

    const hasPanel = acceptedPanelTokens.length > 0;
    if (!isSupabaseAuthConfigured() && !hasPanel) {
      return res.status(503).json({
        error: "Auth provider not configured. Set SUPABASE_JWT_SECRET (or JWT_SECRET / GOTRUE_JWT_SECRET) to match GoTrue, or use ADMIN_PANEL_TOKEN.",
      });
    }
    return res.status(401).json({ error: "Invalid token" });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function adminWriteBlocked(_req: Request, res: Response, next: NextFunction) {
  const ro = process.env.CONTENT_ADMIN_READONLY?.trim();
  if (ro === "1" || ro === "true" || ro === "yes") {
    return res.status(403).json({ error: "Content admin is read-only (CONTENT_ADMIN_READONLY)" });
  }
  next();
}

export function adminDashboardAccess(req: Request, res: Response, next: NextFunction) {
  const expected = readDashboardConfiguredValue();
  if (!expected && process.env.NODE_ENV !== "production") {
    return next();
  }
  const provided = readDashboardAccessValue(req);
  if (expected && provided && safeEqualText(provided, expected)) {
    return next();
  }
  res.setHeader("WWW-Authenticate", 'Basic realm="Areloria Dashboard"');
  return res.status(401).type("text/plain").send("Dashboard access required.");
}
