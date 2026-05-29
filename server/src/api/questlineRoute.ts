import { Router, type Request, type Response } from "express";
import { QuestlineEngine } from "../modules/questline/questlineEngine.js";
import { registeredProceduralQuestIdsByQuestline } from "../modules/questline/questlineBridge.js";
import {
  loadQuestlineProgress,
  upsertQuestlineProgress,
  listQuestlinesForPlayer,
} from "../modules/questline/questlineRepository.js";
import { isDatabaseConfigured } from "../core/Database.js";
import { getAllFactions } from "../modules/questline/factionRegistry.js";
import {
  buildChoiceUI,
  checkCrossroadsEligibility,
  getCrossroads,
  resolveCrossroadsChoice,
} from "../modules/questline/crossroadsResolver.js";

const engine = new QuestlineEngine();

function paramStr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return String(v[0] ?? "");
  return typeof v === "string" ? v : "";
}

function parseBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h || typeof h !== "string") return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

/** Minimal auth: trust `x-player-id` in dev or Bearer token as player id when no JWT middleware. */
function resolvePlayerId(req: Request): string | null {
  const headerId = typeof req.headers["x-player-id"] === "string" ? req.headers["x-player-id"].trim() : "";
  if (headerId) return headerId;
  const token = parseBearer(req);
  if (token && token.length < 200) return token;
  return null;
}

export function questlineRouter(): Router: Router {
  const r = Router();

  r.get("/factions", (_req: Request, res: Response) => {
    res.json({ factions: getAllFactions() });
  });

  r.get("/seeds", (_req: Request, res: Response) => {
    res.json({ questlines: engine.listSeeds().map((s) => ({ id: s.id, title: s.title, strandKey: s.strandKey })) });
  });

  r.get("/crossroads/:id/choices", (req: Request, res: Response) => {
    const id = paramStr(req.params.id);
    if (!getCrossroads(id)) return res.status(404).json({ error: "crossroads_not_found" });
    res.json({ crossroadsId: id, choices: buildChoiceUI(id) });
  });

  r.post("/crossroads/:id/resolve", (req: Request, res: Response) => {
    const playerId = resolvePlayerId(req);
    if (!playerId) return res.status(401).json({ error: "player_id_required" });
    const choiceId = typeof req.body?.choiceId === "string" ? req.body.choiceId.trim() : "";
    if (!choiceId) return res.status(400).json({ error: "choiceId_required" });
    const completed = Array.isArray(req.body?.completedQuests) ? req.body.completedQuests : [];
    const crossId = paramStr(req.params.id);
    const el = checkCrossroadsEligibility(crossId, { completedQuests: completed });
    if (!el.eligible) return res.status(400).json({ error: "not_eligible", reason: el.reason });
    try {
      const result = resolveCrossroadsChoice(crossId, choiceId, { playerId });
      res.json({ ok: true, ...result });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "resolve_failed";
      res.status(400).json({ error: msg });
    }
  });

  r.get("/:questlineId/graph", (req: Request, res: Response) => {
    const qid = paramStr(req.params.questlineId);
    const graph = engine.exportGraph(qid);
    if (!graph) return res.status(404).json({ error: "questline_not_found" });
    res.json({ questlineId: qid, graph });
  });

  r.post("/:questlineId/start", async (req: Request, res: Response) => {
    const playerId = resolvePlayerId(req);
    if (!playerId) return res.status(401).json({ error: "player_id_required" });
    const qid = paramStr(req.params.questlineId);
    const state = engine.startQuestline(qid);
    if (!state) return res.status(404).json({ error: "questline_not_found" });
    state.proceduralQuestIds = registeredProceduralQuestIdsByQuestline.get(qid) ?? [];
    const seed = engine.getSeed(qid);
    if (isDatabaseConfigured() && seed) {
      await upsertQuestlineProgress({
        playerId,
        questlineId: seed.id,
        strandKey: seed.strandKey,
        currentNode: state.currentNode,
        stateJson: { runtime: state },
      });
    }
    res.json({ ok: true, state });
  });

  r.post("/:questlineId/choose", async (req: Request, res: Response) => {
    const playerId = resolvePlayerId(req);
    if (!playerId) return res.status(401).json({ error: "player_id_required" });
    const choiceId = typeof req.body?.choiceId === "string" ? req.body.choiceId.trim() : "";
    if (!choiceId) return res.status(400).json({ error: "choiceId_required" });
    const flags =
      req.body?.flags && typeof req.body.flags === "object" ? (req.body.flags as Record<string, boolean>) : {};

    const qid = paramStr(req.params.questlineId);
    let state = engine.startQuestline(qid);
    if (isDatabaseConfigured()) {
      const row = await loadQuestlineProgress(playerId, qid);
      const saved = row?.state_json?.runtime as typeof state | undefined;
      if (saved) state = saved;
    }
    if (!state) return res.status(404).json({ error: "questline_not_found" });
    if (!state.proceduralQuestIds?.length) {
      state.proceduralQuestIds = registeredProceduralQuestIdsByQuestline.get(qid) ?? [];
    }

    const next = engine.choose(state, qid, choiceId, flags);
    if ("error" in next) return res.status(400).json({ error: next.error });
    const seed = engine.getSeed(qid);
    if (isDatabaseConfigured() && seed) {
      await upsertQuestlineProgress({
        playerId,
        questlineId: seed.id,
        strandKey: seed.strandKey,
        currentNode: next.currentNode,
        stateJson: { runtime: next },
      });
    }
    res.json({ ok: true, state: next });
  });

  r.get("/player/me", async (req: Request, res: Response) => {
    const playerId = resolvePlayerId(req);
    if (!playerId) return res.status(401).json({ error: "player_id_required" });
    if (!isDatabaseConfigured()) {
      return res.json({ playerId, questlines: [], note: "database_not_configured" });
    }
    const rows = await listQuestlinesForPlayer(playerId);
    res.json({ playerId, questlines: rows });
  });

  return r;
}
