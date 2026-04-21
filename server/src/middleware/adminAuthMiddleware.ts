import type { Request, Response, NextFunction } from "express";
import { isSupabaseAuthConfigured, verifySupabaseToken } from "../config/supabase.js";

export type AdminRequest = Request & {
  adminAuth?: { mode: "token" } | { mode: "supabase"; uid: string };
};

function parseUidAllowlist(): Set<string> {
  const raw = process.env.ADMIN_UID_ALLOWLIST?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/**
 * Protects no-code admin HTTP APIs.
 * - If `ADMIN_PANEL_TOKEN` is set: accept `Authorization: Bearer ***` or `X-Admin-Token: <token>`.
 * - Else: require Supabase ID token (`Authorization: Bearer ***`).
 * - If `ADMIN_UID_ALLOWLIST` is non-empty, token uid must be listed.
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
  const headerToken = (req.headers["x-admin-token"] as string | undefined)?.trim() || "";
  const hasPanelCandidate =
    acceptedPanelTokens.includes(bearer) || acceptedPanelTokens.includes(headerToken);

  if (acceptedPanelTokens.length > 0) {
    if (hasPanelCandidate) {
      req.adminAuth = { mode: "token" };
      return next();
    }
    if (!bearer && !headerToken) {
      return res.status(401).json({ error: "Admin token or Supabase Bearer required" });
    }
    // JWT-shaped bearer with panel token set → remind to use the panel token
    if (bearer && bearer.split(".").length === 3 && !acceptedPanelTokens.includes(bearer)) {
      return res.status(401).json({
        error: "ADMIN_PANEL_TOKEN is set — send it as Bearer, not a Google/Firebase token",
      });
    }
  }

  if (!bearer) {
    return res.status(401).json({ error: "Missing Authorization: Bearer ***" });
  }

  try {
    const allow = parseUidAllowlist();

    if (isSupabaseAuthConfigured()) {
      try {
        const claims = verifySupabaseToken(bearer);
        const uid = typeof claims.sub === "string" ? claims.sub.trim() : "";
        if (!uid) {
          return res.status(401).json({ error: "Invalid token" });
        }
        if (allow.size > 0 && !allow.has(uid)) {
          return res.status(403).json({ error: "Forbidden: uid not in ADMIN_UID_ALLOWLIST" });
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
