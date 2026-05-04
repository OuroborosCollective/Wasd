// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { isSupabaseAuthConfigured, verifySupabaseToken } from "../config/supabase.js";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  if (!isSupabaseAuthConfigured()) {
    return res.status(503).json({ error: "No auth provider configured (Supabase required)." });
  }

  try {
    const claims = verifySupabaseToken(token);
    const uid = typeof claims.sub === "string" ? claims.sub.trim() : "";
    if (!uid) {
      return res.status(401).json({ error: "Invalid token" });
    }
    (req as any).playerId = uid;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
