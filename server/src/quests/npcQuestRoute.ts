import express, { Router, type Response } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import {
  canonicalizeClientIntent,
  chunkKeyFromWorldPosition,
  type ServerCanonicalIntent,
} from "../intents/ServerCanonicalIntent.js";
import { npcQuestService } from "./NpcQuestService.js";
import { npcQuestRuntime } from "./NpcQuestRuntime.js";

const router = Router();
router.use(express.json());

interface RuntimeTickContext {
  readonly tick: number;
  readonly tickId: number | string;
}

interface QuestInteractPayload {
  readonly [key: string]: unknown;
  readonly targetId: string;
  readonly interaction: "npc_talk" | "quest_accept" | "quest_complete";
  readonly questId?: string;
  readonly playerPosition: { readonly x: number; readonly y: number };
}

type CanonicalQuestIntent = ServerCanonicalIntent<"interact"> & {
  readonly payload: QuestInteractPayload;
};

function parseId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_-]{1,96}$/.test(trimmed) ? trimmed : null;
}

function parseRequestId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_./-]{1,160}$/.test(trimmed) ? trimmed : undefined;
}

function parsePosition(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const position = value as { x?: unknown; y?: unknown };
  const x = Number(position.x);
  const y = Number(position.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < -100_000 || x > 100_000 || y < -100_000 || y > 100_000) return null;
  return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
}

function requireProductionAuth(identity: { authenticated: boolean }, res: Response): boolean {
  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({ ok: false, reason: "authenticated_player_required" });
    return false;
  }
  return true;
}

function resolveRuntimeTick(): RuntimeTickContext | null {
  const context = tickContextProvider.getContext();
  const tick = Number(context.tickIndex);
  const tickId = context.tickId;
  const validTickId =
    (typeof tickId === "number" && Number.isSafeInteger(tickId) && tickId >= 0) ||
    (typeof tickId === "string" && /^[a-zA-Z0-9:_./-]{1,160}$/.test(tickId));
  if (!Number.isSafeInteger(tick) || tick < 0 || !validTickId) return null;
  return { tick, tickId };
}

function requireRuntimeTick(res: Response): RuntimeTickContext | null {
  const runtime = resolveRuntimeTick();
  if (!runtime) res.status(503).json({ ok: false, reason: "runtime_tick_unavailable" });
  return runtime;
}

function canonicalizeQuestIntent(input: {
  readonly actorId: string;
  readonly runtime: RuntimeTickContext;
  readonly requestId?: string;
  readonly payload: QuestInteractPayload;
}): CanonicalQuestIntent {
  return canonicalizeClientIntent<"interact">(
    { action: "interact", requestId: input.requestId, payload: input.payload },
    {
      actorId: input.actorId,
      tickId: input.runtime.tickId,
      logicalIndex: input.runtime.tick,
      receivedOrder: 0,
      chunkKey: chunkKeyFromWorldPosition(input.payload.playerPosition),
    },
  ) as CanonicalQuestIntent;
}

function validateNpcAndPosition(
  npcId: string,
  position: { x: number; y: number },
  res: Response,
): boolean {
  if (!npcQuestService.getNpcDefinition(npcId)) {
    res.status(404).json({ ok: false, reason: "missing_npc" });
    return false;
  }
  if (!npcQuestService.isPlayerNearNpc(position.x, position.y, npcId)) {
    res.status(403).json({ ok: false, reason: "npc_too_far" });
    return false;
  }
  return true;
}

function validateQuestNpc(questId: string, npcId: string, res: Response): boolean {
  const definition = npcQuestService.getQuestDefinition(questId);
  if (!definition) {
    res.status(404).json({ ok: false, reason: "missing_quest" });
    return false;
  }
  if (definition.npcId !== npcId) {
    res.status(400).json({ ok: false, reason: "quest_npc_mismatch" });
    return false;
  }
  return true;
}

router.post("/talk", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;
  const npcId = parseId(req.body?.npcId);
  const position = parsePosition(req.body?.playerPosition);
  if (!npcId) return void res.status(400).json({ ok: false, reason: "missing_npc" });
  if (!position) return void res.status(400).json({ ok: false, reason: "invalid_player_position" });
  if (!validateNpcAndPosition(npcId, position, res)) return;
  const runtime = requireRuntimeTick(res);
  if (!runtime) return;

  try {
    await npcQuestRuntime.hydratePlayer(identity.playerId);
    const intent = canonicalizeQuestIntent({
      actorId: identity.playerId,
      runtime,
      requestId: parseRequestId(req.body?.requestId),
      payload: { targetId: npcId, interaction: "npc_talk", playerPosition: position },
    });
    const talk = await npcQuestRuntime.updateTalkObjective(identity.playerId, npcId, {
      intentHash: intent.intentHash,
      tick: runtime.tick,
      chunkKey: intent.chunkKey,
    });
    if (!talk.ok) {
      res.status(talk.reason === "persistence_failed" ? 503 : 400).json({ ok: false, reason: talk.reason, canonicalIntent: intent });
      return;
    }
    res.json({
      ok: true,
      canonicalIntent: intent,
      result: {
        dialogue: npcQuestService.getNpcDialogue(identity.playerId, npcId),
        activeQuests: npcQuestService.getActiveQuests(identity.playerId).filter(
          (quest) => npcQuestService.getQuestDefinition(quest.questId)?.npcId === npcId,
        ),
        talkUpdated: true,
      },
    });
  } catch (error) {
    console.error("[npc-talk] Failed:", error);
    res.status(500).json({ ok: false, reason: "internal_error" });
  }
});

router.post("/accept", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;
  const questId = parseId(req.body?.questId);
  const npcId = parseId(req.body?.npcId);
  const position = parsePosition(req.body?.playerPosition);
  if (!questId) return void res.status(400).json({ ok: false, reason: "missing_quest" });
  if (!npcId) return void res.status(400).json({ ok: false, reason: "missing_npc" });
  if (!position) return void res.status(400).json({ ok: false, reason: "invalid_player_position" });
  if (!validateNpcAndPosition(npcId, position, res) || !validateQuestNpc(questId, npcId, res)) return;
  const runtime = requireRuntimeTick(res);
  if (!runtime) return;

  try {
    const intent = canonicalizeQuestIntent({
      actorId: identity.playerId,
      runtime,
      requestId: parseRequestId(req.body?.requestId),
      payload: { targetId: npcId, interaction: "quest_accept", questId, playerPosition: position },
    });
    const result = await npcQuestRuntime.acceptQuest(identity.playerId, questId, {
      intentHash: intent.intentHash,
      tick: runtime.tick,
      chunkKey: intent.chunkKey,
    });
    res.status(result.ok ? 200 : result.reason === "persistence_failed" ? 503 : 400).json({
      ok: result.ok,
      ...(result.ok ? { result: result.result } : { reason: result.reason }),
      canonicalIntent: intent,
    });
  } catch (error) {
    console.error("[quest-accept] Failed:", error);
    res.status(500).json({ ok: false, reason: "internal_error" });
  }
});

router.post("/complete", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;
  const questId = parseId(req.body?.questId);
  const npcId = parseId(req.body?.npcId);
  const position = parsePosition(req.body?.playerPosition);
  if (!questId) return void res.status(400).json({ ok: false, reason: "missing_quest" });
  if (!npcId) return void res.status(400).json({ ok: false, reason: "missing_npc" });
  if (!position) return void res.status(400).json({ ok: false, reason: "invalid_player_position" });
  if (!validateNpcAndPosition(npcId, position, res) || !validateQuestNpc(questId, npcId, res)) return;
  const runtime = requireRuntimeTick(res);
  if (!runtime) return;

  try {
    const intent = canonicalizeQuestIntent({
      actorId: identity.playerId,
      runtime,
      requestId: parseRequestId(req.body?.requestId),
      payload: { targetId: npcId, interaction: "quest_complete", questId, playerPosition: position },
    });
    const result = await npcQuestRuntime.completeQuestWithRewards(identity.playerId, questId, {
      intentHash: intent.intentHash,
      tick: runtime.tick,
      chunkKey: intent.chunkKey,
    });
    res.status(result.ok ? 200 : result.reason === "reward_commit_failed" ? 503 : 400).json({
      ok: result.ok,
      ...(result.ok ? { result: result.result } : { reason: result.reason, details: result.details }),
      canonicalIntent: intent,
    });
  } catch (error) {
    console.error("[quest-complete] Failed:", error);
    res.status(500).json({ ok: false, reason: "internal_error" });
  }
});

router.get("/active", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;
  await npcQuestRuntime.hydratePlayer(identity.playerId);
  res.json({ ok: true, result: { activeQuests: npcQuestService.getActiveQuests(identity.playerId) } });
});

router.get("/available", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;
  await npcQuestRuntime.hydratePlayer(identity.playerId);
  res.json({ ok: true, result: { availableQuests: npcQuestService.getAvailableQuests(identity.playerId) } });
});

router.get("/dialogue", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;
  const npcId = parseId(req.query?.npcId);
  if (!npcId || !npcQuestService.getNpcDefinition(npcId)) {
    return void res.status(404).json({ ok: false, reason: "missing_npc" });
  }
  await npcQuestRuntime.hydratePlayer(identity.playerId);
  res.json({ ok: true, result: { dialogue: npcQuestService.getNpcDialogue(identity.playerId, npcId) } });
});

router.get("/reputation", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;
  const npcId = parseId(req.query?.npcId);
  if (!npcId || !npcQuestService.getNpcDefinition(npcId)) {
    return void res.status(404).json({ ok: false, reason: "missing_npc" });
  }
  await npcQuestRuntime.hydratePlayer(identity.playerId);
  res.json({ ok: true, result: { reputation: npcQuestService.getNpcReputation(identity.playerId, npcId) } });
});

router.get("/progress/:questId", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (!requireProductionAuth(identity, res)) return;
  const questId = parseId(req.params?.questId);
  if (!questId) return void res.status(400).json({ ok: false, reason: "missing_quest" });
  await npcQuestRuntime.hydratePlayer(identity.playerId);
  const progress = npcQuestService.getQuestProgress(identity.playerId, questId);
  if (!progress) return void res.status(404).json({ ok: false, reason: "missing_quest" });
  res.json({ ok: true, result: { progress } });
});

export default router;
