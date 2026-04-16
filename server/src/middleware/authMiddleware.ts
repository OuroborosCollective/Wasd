import { Request, Response, NextFunction } from "express";
import { isFirebaseAuthConfigured, verifyFirebaseToken } from "../config/firebase.js";
import { isSupabaseAuthConfigured, verifySupabaseToken } from "../config/supabase.js";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  const supabaseConfigured = isSupabaseAuthConfigured();
  const firebaseConfigured = isFirebaseAuthConfigured();

  if (supabaseConfigured) {
    try {
      const claims = verifySupabaseToken(token);
      const uid = typeof claims.sub === "string" ? claims.sub.trim() : "";
      if (!uid) {
        throw new Error("Supabase token missing subject");
      }
      (req as any).playerId = uid;
      return next();
    } catch {
      // Supabase verification failed; if Firebase is configured, try Firebase next.
    }
  }

  if (firebaseConfigured) {
    try {
      const decoded = await verifyFirebaseToken(token);
      if (!decoded || !decoded.uid) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Attach the verified uid to the request object
      (req as any).playerId = decoded.uid;
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  if (!supabaseConfigured && !firebaseConfigured) {
    return res.status(503).json({
      error: "No auth provider configured (Supabase/Firebase).",
    });
  }

  return res.status(401).json({ error: "Invalid token" });
}
