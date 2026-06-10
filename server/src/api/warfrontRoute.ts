import express, { type Request, type Response, type Router } from "express";
import type { WorldTick } from "../core/are/index.js";
import { WarfrontCombatTelemetry } from "../modules/warfront/WarfrontCombatTelemetry.js";
import type { WarfrontSectorKind } from "../modules/warfront/warfrontTypes.js";

function resolvePlayer(tick: WorldTick, req: Request): any | null {
  const rawId = req.query.playerId ?? req.body?.playerId;
  const playerId = typeof rawId === "string" && rawId.trim().length > 0 ? rawId.trim() : "dummy_player";
  return tick.playerSystem.getPlayer(playerId) ?? null;
}

function resolveNow(req: Request): number | undefined {
  const raw = req.query.now ?? req.body?.now;
  const value = typeof raw === "string" || typeof raw === "number" ? Number(raw) : Number.NaN;
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined;
}

function resolveSectorKind(value: unknown): WarfrontSectorKind | null {
  if (value === "combat" || value === "crafting" || value === "scouting") return value;
  return null;
}

export function warfrontRouter(tick?: WorldTick): Router {
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

  r.get("/cycle", (req: Request, res: Response) => {
    if (!tick?.warfrontSystem) return res.status(503).json({ ok: false, error: "warfront_runtime_unavailable" });
    res.json({ ok: true, cycle: tick.warfrontSystem.getCycleSnapshot(resolveNow(req)), rewards: tick.warfrontSystem.getRewardTiers(), frontBossSpawnPoint: tick.warfrontSystem.getFrontBossSpawnPoint() });
  });

  r.get("/status", (req: Request, res: Response) => {
    if (!tick?.warfrontSystem) return res.status(503).json({ ok: false, error: "warfront_runtime_unavailable" });
    const player = resolvePlayer(tick, req);
    if (!player) return res.status(404).json({ ok: false, error: "player_not_found" });
    res.json({ ok: true, playerId: player.id, status: tick.warfrontSystem.getStatusForPlayer(player, resolveNow(req)) });
  });

  r.post("/contribute", express.json({ limit: "64kb" }), (req: Request, res: Response) => {
    if (!tick?.warfrontSystem) return res.status(503).json({ ok: false, error: "warfront_runtime_unavailable" });
    const player = resolvePlayer(tick, req);
    if (!player) return res.status(404).json({ ok: false, error: "player_not_found" });
    const kind = resolveSectorKind(req.body?.kind);
    if (!kind) return res.status(400).json({ ok: false, error: "invalid_sector_kind", allowed: ["combat", "crafting", "scouting"] });
    const amount = Number(req.body?.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ ok: false, error: "invalid_amount" });
    const result = tick.warfrontSystem.registerContribution(player, kind, amount, resolveNow(req));
    res.status(result.accepted ? 200 : 409).json({ ok: result.accepted, result, status: tick.warfrontSystem.getStatusForPlayer(player, resolveNow(req)) });
  });

  r.post("/claim", express.json({ limit: "64kb" }), (req: Request, res: Response) => {
    if (!tick?.warfrontSystem) return res.status(503).json({ ok: false, error: "warfront_runtime_unavailable" });
    const player = resolvePlayer(tick, req);
    if (!player) return res.status(404).json({ ok: false, error: "player_not_found" });
    const result = tick.warfrontSystem.claimSeasonRewards(player, resolveNow(req));
    res.status(result.ok ? 200 : 409).json({ ok: result.ok, result, status: tick.warfrontSystem.getStatusForPlayer(player, resolveNow(req)) });
  });

  return r;
}
