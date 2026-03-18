import { Request, Response, NextFunction } from "express";
import { verifyFirebaseToken } from "../config/firebase.js";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded || !decoded.uid) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Attach the verified uid to the request object
    (req as any).playerId = decoded.uid;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: "Unauthorized: " + err.message });
  }
}
