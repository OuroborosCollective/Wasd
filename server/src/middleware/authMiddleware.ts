import { Request, Response, NextFunction } from "express";
import { isFirebaseAuthConfigured, verifyFirebaseToken } from "../config/firebase.js";
import { isSupabaseAuthConfigured, verifySupabaseToken } from "../config/supabase.js";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    if (isSupabaseAuthConfigured()) {
      const claims = verifySupabaseToken(token);
      const uid = typeof claims.sub === "string" ? claims.sub.trim() : "";
      if (!uid) {
        return res.status(401).json({ error: "Invalid token" });
      }
      (req as any).playerId = uid;
      return next();
    }

    if (isFirebaseAuthConfigured()) {
      const decoded = await verifyFirebaseToken(token);
      if (!decoded || !decoded.uid) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Attach the verified uid to the request object
      (req as any).playerId = decoded.uid;
      return next();
    }

    return res.status(503).json({
      error: "No auth provider configured (Supabase/Firebase).",
    });
  } catch (err: any) {
    return res.status(401).json({ error: "Unauthorized: " + err.message });
  }
}
