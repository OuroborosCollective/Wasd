import express, { type Request, type Response, type Router } from "express";
import { buildLogicalVillageBlueprint } from "../world/generation/LogicalVillageBlueprint.js";

export function worldLayoutRouter(): Router {
  const r = express.Router();

  /**
   * GET /logical-village?seed=myhub&x=0&y=0&rows=4
   * Returns a JSON blueprint (world objects) — does not mutate the live world.
   */
  r.get("/logical-village", (req: Request, res: Response) => {
    const seed = typeof req.query.seed === "string" ? req.query.seed : "preview";
    const x = parseFloat(String(req.query.x ?? "0")) || 0;
    const y = parseFloat(String(req.query.y ?? "0")) || 0;
    const rows = parseInt(String(req.query.rows ?? "4"), 10) || 4;
    const blueprint = buildLogicalVillageBlueprint({
      seedId: seed,
      origin: { x, y },
      halfRows: rows,
    });
    res.json({
      ok: true,
      stats: {
        objectCount: blueprint.objects.length,
        referencedGlbCount: blueprint.referencedGlbPaths.length,
      },
      referencedGlbPaths: blueprint.referencedGlbPaths,
      recommendedModularGlbs: blueprint.recommendedModularGlbs,
      objects: blueprint.objects,
    });
  });

  return r;
}
