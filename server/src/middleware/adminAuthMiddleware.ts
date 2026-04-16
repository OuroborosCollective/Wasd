import type { Request, Response, NextFunction } from "express";
import { isFirebaseAuthConfigured, verifyFirebaseToken } from "../config/firebase.js";
import { isSupabaseAuthConfigured, verifySupabaseToken } from "../config/supabase.js";

export type AdminRequest = Request & {
  adminAuth?: { mode: "token" } | { mode: "firebase"; uid: string } | { mode: "supabase"; uid: string };
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
 * - If `ADMIN_PANEL_TOKEN` is set: accept `Authorization: Bearer <token>` or `X-Admin-Token: <token>`.
 * - Else: require Supabase/Firebase ID token (`Authorization: Bearer <jwt>`).
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
      return res.status(401).json({ error: "Admin token or Firebase Bearer required" });
    }
  }

  if (!bearer) {
    return res.status(401).json({ error: "Missing Authorization: Bearer <token>" });
  }

  if (acceptedPanelTokens.length > 0 && !hasPanelCandidate && !headerToken) {
    const jwtLike = bearer.split(".").length >= 3 && bearer.length > 80;
    if (jwtLike) {
      return res.status(401).json({
        error: "Use admin panel token, not Google JWT",
        errorDe:
          "Im Feld „Code“ steht vermutlich ein Google-/Firebase-Login-Token. Dort gehört der lange **ADMIN_PANEL_TOKEN** (oder kompatibel **GM_PANEL_TOKEN**) aus der Server-.env — nicht das Spiel-Login. Oder nutze den Header **X-Admin-Token** mit dem Panel-Token.",
      });
    }
  }

  try {
    const allow = parseUidAllowlist();
    const hasSupabaseProvider = isSupabaseAuthConfigured();
    const hasFirebaseProvider = isFirebaseAuthConfigured();
    const authErrors: string[] = [];

    if (hasSupabaseProvider) {
      try {
        const claims = verifySupabaseToken(bearer);
        const uid = typeof claims.sub === "string" ? claims.sub.trim() : "";
        if (!uid) {
          return res.status(401).json({ error: "Invalid Supabase token" });
        }
        if (allow.size > 0 && !allow.has(uid)) {
          return res.status(403).json({ error: "Forbidden: uid not in ADMIN_UID_ALLOWLIST" });
        }
        req.adminAuth = { mode: "supabase", uid };
        return next();
      } catch (error: any) {
        authErrors.push(`supabase:${String(error?.message || "invalid_token")}`);
      }
    }

    if (hasFirebaseProvider) {
      try {
        const decoded = await verifyFirebaseToken(bearer);
        if (!decoded?.uid) {
          return res.status(401).json({ error: "Invalid Firebase token" });
        }
        if (allow.size > 0 && !allow.has(decoded.uid)) {
          return res.status(403).json({ error: "Forbidden: uid not in ADMIN_UID_ALLOWLIST" });
        }
        req.adminAuth = { mode: "firebase", uid: decoded.uid };
        return next();
      } catch (error: any) {
        authErrors.push(`firebase:${String(error?.message || "invalid_token")}`);
      }
    }

    if (!hasSupabaseProvider && !hasFirebaseProvider) {
      const msg =
        "Kein externer Auth-Provider konfiguriert. Für Supabase: SUPABASE_JWT_SECRET (oder JWT_SECRET) setzen. " +
        "Für Firebase: FIREBASE_SERVICE_ACCOUNT_KEY oder GOOGLE_APPLICATION_CREDENTIALS setzen. " +
        "Alternativ ADMIN_PANEL_TOKEN im Admin-Feld „Code“ nutzen.";
      return res.status(503).json({
        error: "Auth provider not configured",
        errorDe: msg,
      });
    }
    const details = authErrors.length > 0 ? ` (${authErrors.join("; ")})` : "";
    return res.status(401).json({ error: `Invalid token${details}` });
  } catch {
    const errorDe = acceptedPanelTokens.length > 0
      ? "Token vom Admin-Formular abgelehnt. Nutze den langen ADMIN_PANEL_TOKEN (oder GM_PANEL_TOKEN) aus der Server-Umgebung (nicht das Spiel-Login), oder setze eine gueltige Supabase/Firebase Konfiguration."
      : undefined;
    return res.status(401).json({
      error: "Invalid token",
      ...(errorDe ? { errorDe } : {}),
    });
  }
}

export function adminWriteBlocked(_req: Request, res: Response, next: NextFunction) {
  const ro = process.env.CONTENT_ADMIN_READONLY?.trim();
  if (ro === "1" || ro === "true" || ro === "yes") {
    return res.status(403).json({ error: "Content admin is read-only (CONTENT_ADMIN_READONLY)" });
  }
  next();
}
