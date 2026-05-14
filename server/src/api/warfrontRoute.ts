import express, { type Request, type Response, type Router } from "express";
import { WarfrontCombatTelemetry } from "../modules/warfront/WarfrontCombatTelemetry.js";

export function warfrontRouter(): Router {
  const r = express.Router();

  r.options("/feed", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
  });

  r.get("/feed", (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const sinceRaw = req.query.since;
    const sinceSeq = typeof sinceRaw === "string" ? parseInt(sinceRaw, 10) || 0 : 0;
    const data = WarfrontCombatTelemetry.getInstance().getFeedSince(sinceSeq);
    res.json(data);
  });

  return r;
}
