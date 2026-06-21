/**
 * NPC QUEST API ROUTE
 *
 * Server-authoritative NPC and camp quest management endpoints.
 * Deterministic: No Math.random(), no Date.now() for gameplay state.
 * Client sends intent only, server validates and mutates.
 */

import express, { Router, type Response } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { getVisibleChunkCoords } from "../resources/ChunkResourceGenerator.js";
import { generateVisibleChunkPois, getStarterVillagePois } from "../world/WorldPoiGenerator.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";
import { worldDiscoveryService } from "../world/WorldDiscoveryService.js";
import { npcQuestService } from "./NpcQuestService.js";
import { campQuestService } from "./CampQuestService.js";
import { isCampQuestId, isGatheringCampPoiType, parseCampQuestId, type CampQuestPoi } from "./CampQuestDirector.js";

const router = Router();
router.use(express.json());

interface CampQuestRouteContext {
  readonly worldPois: readonly CampQuestPoi[];
  readonly discoveredPoiIds: readonly string[];
}

type CampQuestRouteContextResult =
  | { readonly ok: true; readonly context: CampQuestRouteContext }
  | { readonly ok: false; readonly status: number; readonly reason: string };

// Parse helpers
function parseQuestId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_:-]{1,160}$/.test(trimmed)) return null;
  return trimmed;
}

function parseNpcId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_:-]{1,160}$/.test(trimmed)) return null;
  return trimmed;
}

function parsePosition(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const pos = value as { x?: unknown; y?: unknown };
  const x = Number(pos.x);
  const y = Number(pos.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < -100_000 || x > 100_000 || y < -100_000 || y > 100_000) return null;
  return { x, y };
}

function getCurrentLogicalIndex(): number {
  const tick = Number(tickContextProvider.getContext().tickIndex);
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
}

function toKappaPosition(playerPosition: { x: number; y: number }): { x: number; y: number } {
  const maxAbs = Math.max(Math.abs(playerPosition.x), Math.abs(playerPosition.y));
  if (maxAbs > 1000) return playerPosition;
  return { x: playerPosition.x * 1000, y: playerPosition.y * 1000 };
}

function resolveVisibleWorldPois(playerPosition: { x: number; y: number }): readonly WorldPoiSnapshot[] {
  const kappaPosition = toKappaPosition(playerPosition);
  const tileX = Math.floor(kappaPosition.x / 1000);
  const tileZ = Math.floor(kappaPosition.y / 1000);
  const visibleChunks = getVisibleChunkCoords(tileX, tileZ);
  return [...getStarterVillagePois(), ...generateVisibleChunkPois(visibleChunks)].sort((a, b) => a.id.localeCompare(b.id));
}

function toCampQuestPois(worldPois: readonly WorldPoiSnapshot[]): readonly CampQuestPoi[] {
  return worldPois.map((poi) => ({
    poiId: poi.id,
    type: poi.type,
    title: poi.title,
    x: poi.position.x,
    y: poi.position.y,
    chunkX: poi.chunk.x,
    chunkZ: poi.chunk.z,
  }));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isPlayerNearPoi(playerPosition: { x: number; y: number }, poi: WorldPoiSnapshot): boolean {
  const kappaPosition = toKappaPosition(playerPosition);
  const radius = Math.max(32, Math.floor(Number(poi.interactionRadius)));
  return distance(kappaPosition, poi.position) <= radius;
}

async function resolveCampQuestRouteContext(input: {
  readonly playerId: string;
  readonly questId: string;
  readonly npcId: string;
  readonly playerPosition: { x: number; y: number };
}): Promise<CampQuestRouteContextResult> {
  const parsed = parseCampQuestId(input.questId);
  if (!parsed) return { ok: false, status: 400, reason: "missing_quest" };

  const expectedNpcId = `camp_npc:${parsed.poiId}`;
  if (input.npcId !== expectedNpcId) {
    return { ok: false, status: 400, reason: "missing_npc" };
  }

  const visibleWorldPois = resolveVisibleWorldPois(input.playerPosition);
  const targetPoi = visibleWorldPois.find((poi) => poi.id === parsed.poiId);
  if (!targetPoi || !isGatheringCampPoiType(targetPoi.type)) {
    return { ok: false, status: 404, reason: "missing_quest" };
  }

  if (!isPlayerNearPoi(input.playerPosition, targetPoi)) {
    return { ok: false, status: 400, reason: "npc_too_far" };
  }

  await worldDiscoveryService.hydratePlayer(input.playerId);
  const newlyDiscovered = worldDiscoveryService.processDiscovery(
    input.playerId,
    toKappaPosition(input.playerPosition),
    visibleWorldPois,
  );
  if (newlyDiscovered.length > 0) {
    worldDiscoveryService.persistPlayer(input.playerId).catch((err) => {
      console.error("[CampQuestRoute] Failed to persist discovery:", err);
    });
  }

  const discoveredPoiIds = worldDiscoveryService.getDiscoveredPoiIds(input.playerId);
  if (!discoveredPoiIds.includes(parsed.poiId)) {
    return { ok: false, status: 400, reason: "quest_not_available" };
  }

  return {
    ok: true,
    context: {
      worldPois: toCampQuestPois(visibleWorldPois),
      discoveredPoiIds,
    },
  };
}

function sendQuestActionResult<T>(
  res: Response,
  result: { ok: true; result: T } | { ok: false; reason: string; details?: Record<string, unknown> },
): void {
  const statusCode = result.ok ? 200 : 400;
  res.status(statusCode).json({
    ok: result.ok,
    reason: result.ok ? undefined : result.reason,
    details: result.ok ? undefined : result.details,
    result: result.ok ? result.result : undefined,
  });
}

/**
 * POST /api/npc/talk
 *
 * Player talks to NPC - updates quest progress and returns dialogue.
 * Required: playerId, npcId, playerPosition
 */
router.post("/talk", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = req.body?.playerId ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const npcId = parseNpcId(req.body?.npcId);
  if (!npcId) {
    res.status(400).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  const playerPosition = parsePosition(req.body?.playerPosition);
  if (!playerPosition) {
    res.status(400).json({
      ok: false,
      reason: "invalid_player_position",
    });
    return;
  }

  // Check proximity
  if (!npcQuestService.isPlayerNearNpc(playerPosition.x, playerPosition.y, npcId)) {
    res.status(400).json({
      ok: false,
      reason: "npc_too_far",
    });
    return;
  }

  // Update talk objectives
  const talkResult = npcQuestService.updateTalkObjective(playerId, npcId);

  // Get dialogue
  const dialogue = npcQuestService.getNpcDialogue(playerId, npcId);

  // Get active quests for this NPC
  const activeQuests = npcQuestService.getActiveQuests(playerId).filter(
    (q) => npcQuestService.getQuestDefinition(q.questId)?.npcId === npcId,
  );

  res.json({
    ok: true,
    result: {
      dialogue,
      activeQuests,
      talkUpdated: talkResult.ok,
    },
  });
});

/**
 * POST /api/quests/accept
 *
 * Accept a quest from an NPC or gathering camp.
 * Required: playerId, questId, npcId, playerPosition
 */
router.post("/accept", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = req.body?.playerId ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const questId = parseQuestId(req.body?.questId);
  if (!questId) {
    res.status(400).json({
      ok: false,
      reason: "missing_quest",
    });
    return;
  }

  const npcId = parseNpcId(req.body?.npcId);
  if (!npcId) {
    res.status(400).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  const playerPosition = parsePosition(req.body?.playerPosition);
  if (!playerPosition) {
    res.status(400).json({
      ok: false,
      reason: "invalid_player_position",
    });
    return;
  }

  if (isCampQuestId(questId)) {
    const campContext = await resolveCampQuestRouteContext({ playerId, questId, npcId, playerPosition });
    if (!campContext.ok) {
      res.status(campContext.status).json({ ok: false, reason: campContext.reason });
      return;
    }

    const result = await campQuestService.acceptQuest({
      playerId,
      questId,
      logicalIndex: getCurrentLogicalIndex(),
      worldPois: campContext.context.worldPois,
      discoveredPoiIds: campContext.context.discoveredPoiIds,
    });
    sendQuestActionResult(res, result);
    return;
  }

  // Check proximity
  if (!npcQuestService.isPlayerNearNpc(playerPosition.x, playerPosition.y, npcId)) {
    res.status(400).json({
      ok: false,
      reason: "npc_too_far",
    });
    return;
  }

  // Accept quest
  const result = npcQuestService.acceptQuest(playerId, questId);
  sendQuestActionResult(res, result);
});

/**
 * POST /api/quests/complete
 *
 * Complete a quest and claim rewards.
 * Required: playerId, questId, npcId, playerPosition
 */
router.post("/complete", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = req.body?.playerId ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const questId = parseQuestId(req.body?.questId);
  if (!questId) {
    res.status(400).json({
      ok: false,
      reason: "missing_quest",
    });
    return;
  }

  const npcId = parseNpcId(req.body?.npcId);
  if (!npcId) {
    res.status(400).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  const playerPosition = parsePosition(req.body?.playerPosition);
  if (!playerPosition) {
    res.status(400).json({
      ok: false,
      reason: "invalid_player_position",
    });
    return;
  }

  if (isCampQuestId(questId)) {
    const campContext = await resolveCampQuestRouteContext({ playerId, questId, npcId, playerPosition });
    if (!campContext.ok) {
      res.status(campContext.status).json({ ok: false, reason: campContext.reason });
      return;
    }

    const result = await campQuestService.completeQuest({
      playerId,
      questId,
      logicalIndex: getCurrentLogicalIndex(),
      worldPois: campContext.context.worldPois,
      discoveredPoiIds: campContext.context.discoveredPoiIds,
    });
    sendQuestActionResult(res, result);
    return;
  }

  // Check proximity
  if (!npcQuestService.isPlayerNearNpc(playerPosition.x, playerPosition.y, npcId)) {
    res.status(400).json({
      ok: false,
      reason: "npc_too_far",
    });
    return;
  }

  // Complete quest
  const result = npcQuestService.completeQuest(playerId, questId);
  sendQuestActionResult(res, result);
});

/**
 * GET /api/quests/active
 *
 * Get all active NPC quests for a player. Camp quest active state is surfaced by /api/gameplay/snapshot,
 * where the server has the current visible POI context.
 * Required: playerId (query param)
 */
router.get("/active", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = (req.query?.playerId as string) ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const activeQuests = npcQuestService.getActiveQuests(playerId);

  res.json({
    ok: true,
    result: {
      activeQuests,
    },
  });
});

/**
 * GET /api/quests/available
 *
 * Get all available NPC quests for a player. Camp quest offers are surfaced by /api/gameplay/snapshot,
 * where the server has the current visible POI context.
 * Required: playerId (query param)
 */
router.get("/available", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = (req.query?.playerId as string) ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const availableQuests = npcQuestService.getAvailableQuests(playerId);

  res.json({
    ok: true,
    result: {
      availableQuests,
    },
  });
});

/**
 * GET /api/npc/dialogue
 *
 * Get NPC dialogue for player.
 * Required: playerId, npcId (query params)
 */
router.get("/dialogue", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = (req.query?.playerId as string) ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const npcId = parseNpcId(req.query?.npcId);
  if (!npcId) {
    res.status(400).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  const dialogue = npcQuestService.getNpcDialogue(playerId, npcId);

  res.json({
    ok: true,
    result: {
      dialogue,
    },
  });
});

/**
 * GET /api/npc/reputation
 *
 * Get NPC reputation for player.
 * Required: playerId, npcId (query params)
 */
router.get("/reputation", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = (req.query?.playerId as string) ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const npcId = parseNpcId(req.query?.npcId);
  if (!npcId) {
    res.status(400).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  const reputation = npcQuestService.getNpcReputation(playerId, npcId);

  if (!reputation) {
    res.status(404).json({
      ok: false,
      reason: "missing_npc",
    });
    return;
  }

  res.json({
    ok: true,
    result: {
      reputation,
    },
  });
});

/**
 * GET /api/quests/progress/:questId
 *
 * Get quest progress for a specific NPC quest.
 * Required: playerId (query), questId (param)
 */
router.get("/progress/:questId", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const playerId = (req.query?.playerId as string) ?? identity.playerId;

  if (!playerId) {
    res.status(400).json({
      ok: false,
      reason: "missing_player",
    });
    return;
  }

  const questId = parseQuestId(req.params?.questId);
  if (!questId) {
    res.status(400).json({
      ok: false,
      reason: "missing_quest",
    });
    return;
  }

  const progress = npcQuestService.getQuestProgress(playerId, questId);

  if (!progress) {
    res.status(404).json({
      ok: false,
      reason: "missing_quest",
    });
    return;
  }

  res.json({
    ok: true,
    result: {
      progress,
    },
  });
});

export default router;
