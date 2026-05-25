import { Router } from "express";
import { worldResonanceAdapter } from "../core/WorldResonanceAdapter.js";

export function worldHeartRouter(): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    try {
      const snapshot = worldResonanceAdapter.loadLatestShadowEntry();
      res.setHeader("Cache-Control", "no-store");
      res.json(snapshot);
    } catch {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(worldResonanceAdapter.getSnapshot());
    }
  });

  return router;
}
