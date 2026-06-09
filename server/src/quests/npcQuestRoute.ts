/**
 * NPC QUEST API ROUTE
 *
 * Server-authoritative NPC quest management endpoints.
 * Deterministic: No Math.random(), no Date.now() for gameplay state.
 * Client sends intent only, server validates and mutates.
 */

import express, { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { npcQuestService } from "./NpcQuestService.js";

const router = Router();
router.use(express.json());

// Parse helpers
function parseQuestId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

function parseNpcId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(trimmed)) return null;
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

function parsePlayerId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 64) return null;
  return trimmed;
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
 * Accept a quest from an NPC.
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

  const statusCode = result.ok ? 200 : 400;
  res.status(statusCode).json({
    ok: result.ok,
    reason: result.ok ? undefined : (result as { ok: false; reason: string }).reason,
    result: result.ok ? (result as { ok: true; result: typeof result.result }).result : undefined,
  });
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

  const statusCode = result.ok ? 200 : 400;
  res.status(statusCode).json({
    ok: result.ok,
    reason: result.ok ? undefined : (result as { ok: false; reason: string }).reason,
    result: result.ok ? (result as { ok: true; result: typeof result.result }).result : undefined,
  });
});

/**
 * GET /api/quests/active
 *
 * Get all active quests for a player.
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
 * Get all available quests for a player.
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
 * Get quest progress for a specific quest.
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