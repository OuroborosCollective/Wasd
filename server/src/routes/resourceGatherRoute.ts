/**
 * RESOURCE GATHER API ROUTE
 *
 * Controlled API for resource gathering interactions.
 * Server-authoritative: playerId, position, skill level, XP, items.
 */

import express from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { gatheringService } from "../resources/GatheringService.js";
import { npcQuestRuntime } from "../quests/NpcQuestRuntime.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import {
  canonicalizeClientIntent,
  chunkKeyFromWorldPosition,
} from "../intents/ServerCanonicalIntent.js";

const router = express.Router();
router.use(express.json());

const MAX_POSITION = 100_000;
const MIN_POSITION = -100_000;

type ValidTickContext = ReturnType<typeof tickContextProvider.getContext> & {
  tickIndex: number;
  tickId: number | string;
};

function envFlagEnabled(value: string | undefined): boolean {
  return !["0", "false", "no"].includes(value?.trim().toLowerCase() || "");
}

function isGuestHttpAllowed(): boolean {
  return (
    envFlagEnabled(process.env.ALLOW_GUEST_LOGIN) ||
    envFlagEnabled(process.env.ALLOW_DEV_LOGIN) ||
    process.env.ALLOW_DEV_PLAYER_ID === "true"
  );
}

function parseNodeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]{1,96}$/.test(trimmed) ? trimmed : null;
}

function parsePosition(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const x = Number(raw.x);
  const y = Number(raw.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < MIN_POSITION || x > MAX_POSITION || y < MIN_POSITION || y > MAX_POSITION) return null;
  return {
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
  };
}

function parseOptionalRequestId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_./-]{1,160}$/.test(trimmed) ? trimmed : undefined;
}

function resolveValidTickContext(): ValidTickContext | null {
  const context = tickContextProvider.getContext();
  const tickIndex = Number(context.tickIndex);
  const tickId = context.tickId;
  const validTickId =
    (typeof tickId === "number" && Number.isSafeInteger(tickId) && tickId >= 0) ||
    (typeof tickId === "string" && /^[a-zA-Z0-9:_./-]{1,160}$/.test(tickId));

  if (!Number.isSafeInteger(tickIndex) || tickIndex < 0 || !validTickId) return null;
  return { ...context, tickIndex, tickId } as ValidTickContext;
}

router.post("/gather", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  if (process.env.NODE_ENV === "production" && !identity.authenticated && !isGuestHttpAllowed()) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return;
  }

  const nodeId = parseNodeId(req.body?.nodeId);
  if (!nodeId) {
    res.status(400).json({
      ok: false,
      error: "invalid_node_id",
      detail: "nodeId must be a safe identifier (alphanumeric, underscore, hyphen)",
    });
    return;
  }

  const playerPosition = parsePosition(req.body?.playerPosition);
  if (!playerPosition) {
    res.status(400).json({
      ok: false,
      error: "invalid_player_position",
      detail: "playerPosition is required and must contain finite x/y coordinates",
    });
    return;
  }

  const tickContext = resolveValidTickContext();
  if (!tickContext) {
    res.status(503).json({ ok: false, error: "runtime_tick_unavailable" });
    return;
  }

  const canonicalIntent = canonicalizeClientIntent<"gather">(
    {
      action: "gather",
      requestId: parseOptionalRequestId(req.body?.requestId ?? req.body?.intentId),
      payload: { nodeId, playerPosition },
    },
    {
      actorId: identity.playerId,
      tickId: tickContext.tickId,
      logicalIndex: tickContext.tickIndex,
      receivedOrder: 0,
      chunkKey: chunkKeyFromWorldPosition(playerPosition),
    },
  );

  const result = await gatheringService.gather({
    playerId: canonicalIntent.actorId,
    nodeId: canonicalIntent.payload.nodeId,
    playerPosition: canonicalIntent.payload.playerPosition,
    currentTick: canonicalIntent.logicalIndex,
    inventoryOrigin: {
      uid: canonicalIntent.intentHash,
      tick: canonicalIntent.logicalIndex,
      source: "gather_delta",
      sourceHash: canonicalIntent.intentHash,
    },
  });

  if (!result.ok) {
    res.status(409).json({
      ok: false,
      result,
      questProgressCommitted: null,
      canonicalIntent,
      tickContext: {
        tickId: tickContext.tickId,
        worldTimeHours: tickContext.worldTimeHours,
        seedHash: tickContext.seedHash,
      },
    });
    return;
  }

  let questProgressHistoryHash: string | undefined;
  if (result.itemRewardId && result.inventoryAdded) {
    const questProgress = await npcQuestRuntime.updateQuestProgress(
      canonicalIntent.actorId,
      {
        intentHash: canonicalIntent.intentHash,
        tick: canonicalIntent.logicalIndex,
        chunkKey: canonicalIntent.chunkKey,
        eventType: "gather",
        targetId: result.itemRewardId,
        quantity: result.inventoryQuantity ?? 0,
      },
    );
    if (!questProgress.ok) {
      res.status(503).json({
        ok: false,
        error: "quest_progress_commit_failed",
        gatherCommitted: true,
        result,
        questProgressCommitted: false,
        questProgressError: questProgress.reason,
        canonicalIntent,
      });
      return;
    }
    questProgressHistoryHash = questProgress.result.historyHash;
  }

  res.status(200).json({
    ok: true,
    gatherCommitted: true,
    result,
    questProgressCommitted: result.itemRewardId && result.inventoryAdded ? true : null,
    ...(questProgressHistoryHash ? { questProgressHistoryHash } : {}),
    canonicalIntent,
    tickContext: {
      tickId: tickContext.tickId,
      worldTimeHours: tickContext.worldTimeHours,
      seedHash: tickContext.seedHash,
    },
  });
});

router.get("/nodes", async (_req, res) => {
  const tickContext = resolveValidTickContext();
  if (!tickContext) {
    res.status(503).json({ ok: false, error: "runtime_tick_unavailable" });
    return;
  }

  const nodes = gatheringService.listResourceSnapshots(tickContext.tickIndex);
  res.json({
    ok: true,
    nodes,
    count: nodes.length,
    tickContext: {
      tickId: tickContext.tickId,
      worldTimeHours: tickContext.worldTimeHours,
      seedHash: tickContext.seedHash,
    },
  });
});

export default router;
