import { Request, Response, NextFunction } from "express";
import { isFirebaseAuthConfigured, verifyFirebaseToken } from "../config/firebase.js";
import { isSupabaseAuthConfigured, verifySupabaseToken } from "../config/supabase.js";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  const authErrors: string[] = [];
  const hasSupabaseProvider = isSupabaseAuthConfigured();
  const hasFirebaseProvider = isFirebaseAuthConfigured();
  try {
    if (hasSupabaseProvider) {
      try {
        const claims = verifySupabaseToken(token);
        const uid = typeof claims.sub === "string" ? claims.sub.trim() : "";
        if (uid) {
          (req as any).playerId = uid;
          return next();
        }
      } catch (error: any) {
        authErrors.push(`supabase:${String(error?.message || "invalid_token")}`);
      }
    }

    if (hasFirebaseProvider) {
      try {
        const decoded = await verifyFirebaseToken(token);
        if (decoded?.uid) {
          // Attach the verified uid to the request object
          (req as any).playerId = decoded.uid;
          return next();
        }
      } catch (error: any) {
        authErrors.push(`firebase:${String(error?.message || "invalid_token")}`);
      }
    }

    if (!hasSupabaseProvider && !hasFirebaseProvider) {
      return res.status(503).json({
        error: "No auth provider configured (Supabase/Firebase).",
      });
    }
    const details = authErrors.length > 0 ? ` (${authErrors.join("; ")})` : "";
    return res.status(401).json({ error: `Invalid token${details}` });
  } catch (err: any) {
    const details = authErrors.length > 0 ? ` (${authErrors.join("; ")})` : "";
    return res.status(401).json({ error: `Unauthorized: Invalid token${details}` });
  }
}
