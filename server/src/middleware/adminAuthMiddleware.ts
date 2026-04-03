import type { Request, Response, NextFunction } from "express";
import { isFirebaseAuthConfigured, verifyFirebaseToken } from "../config/firebase.js";

export type AdminRequest = Request & {
  adminAuth?: { mode: "token" } | { mode: "firebase"; uid: string };
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
 * - Else: require Firebase ID token (`Authorization: Bearer <jwt>`).
 * - If `ADMIN_UID_ALLOWLIST` is non-empty, Firebase uid must be listed.
 */
export async function adminAuthMiddleware(req: AdminRequest, res: Response, next: NextFunction) {
  const panel = process.env.ADMIN_PANEL_TOKEN?.trim();
  const authHeader = req.headers.authorization;
  const bearer =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const headerToken = (req.headers["x-admin-token"] as string | undefined)?.trim() || "";

  if (panel) {
    if (bearer === panel || headerToken === panel) {
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

  if (panel && bearer !== panel && !headerToken) {
    const jwtLike = bearer.split(".").length >= 3 && bearer.length > 80;
    if (jwtLike) {
      return res.status(401).json({
        error: "Use admin panel token, not Google JWT",
        errorDe:
          "Im Feld „Code“ steht vermutlich ein Google-/Firebase-Login-Token. Dort gehört der lange **ADMIN_PANEL_TOKEN** aus der Server-.env — nicht das Spiel-Login. Oder nutze den Header **X-Admin-Token** mit dem Panel-Token.",
      });
    }
  }

  try {
    if (!isFirebaseAuthConfigured()) {
      const msg =
        "Firebase Admin ist auf dem Server nicht konfiguriert. Setze z. B. FIREBASE_SERVICE_ACCOUNT_KEY (Pfad/JSON), " +
        "oder GOOGLE_APPLICATION_CREDENTIALS=/pfad/zum-adminsdk.json, oder auf GCP FIREBASE_ADMIN_USE_APPLICATION_DEFAULT=1 " +
        "plus FIREBASE_PROJECT_ID. Sonst: ADMIN_PANEL_TOKEN im Admin-Feld „Code“.";
      return res.status(503).json({
        error: "Firebase Admin not configured",
        errorDe: msg,
      });
    }
    const decoded = await verifyFirebaseToken(bearer);
    if (!decoded?.uid) {
      return res.status(401).json({ error: "Invalid Firebase token" });
    }
    const allow = parseUidAllowlist();
    if (allow.size > 0 && !allow.has(decoded.uid)) {
      return res.status(403).json({ error: "Forbidden: uid not in ADMIN_UID_ALLOWLIST" });
    }
    req.adminAuth = { mode: "firebase", uid: decoded.uid };
    next();
  } catch {
    const errorDe = panel
      ? "Firebase-Token vom Admin-Formular abgelehnt. Nutze den langen ADMIN_PANEL_TOKEN aus der Server-Umgebung (nicht das Google-Login), oder entferne ADMIN_PANEL_TOKEN und nutze nur Firebase mit passender ADMIN_UID_ALLOWLIST."
      : undefined;
    return res.status(401).json({
      error: "Invalid Firebase token",
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
