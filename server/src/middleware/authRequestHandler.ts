import type { Request, Response, NextFunction, RequestHandler } from "express";
import { authMiddleware } from "./authMiddleware.js";
import { isSupabaseAuthConfigured, verifySupabaseToken } from "../config/supabase.js";

/**
 * Typed Express route adapter for the existing auth middleware.
 *
 * This preserves the current authentication implementation while giving Express
 * route overloads a concrete RequestHandler shape under the server typecheck.
 */
export const authRequestHandler = authMiddleware as unknown as RequestHandler;

/**
 * Optional authentication middleware.
 * If a valid Authorization Bearer token is provided, populates req.playerId.
 * Otherwise, lets the request proceed without req.playerId.
 */
export const optionalAuthRequestHandler: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (token && isSupabaseAuthConfigured()) {
      try {
        const claims = verifySupabaseToken(token);
        const uid = typeof claims.sub === "string" ? claims.sub.trim() : "";
        if (uid) {
          (req as any).playerId = uid;
          (req as any).userId = uid;
        }
      } catch {
        // Silently continue for guest/unauthenticated request flow
      }
    }
  }
  next();
};
