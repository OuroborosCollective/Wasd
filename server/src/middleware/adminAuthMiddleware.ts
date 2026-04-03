import type { Request, Response, NextFunction } from "express";
import { verifyFirebaseToken } from "../config/firebase.js";

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

  try {
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
    return res.status(401).json({ error: "Invalid Firebase token" });
  }
}

export function adminWriteBlocked(_req: Request, res: Response, next: NextFunction) {
  const ro = process.env.CONTENT_ADMIN_READONLY?.trim();
  if (ro === "1" || ro === "true" || ro === "yes") {
    return res.status(403).json({ error: "Content admin is read-only (CONTENT_ADMIN_READONLY)" });
  }
  next();
}
