/**
 * QUEST EVENT ROUTE
 *
 * Controlled quest event endpoint for server-authoritative progression.
 * Accepts only allowlisted event types - no arbitrary mutations.
 *
 * MVP Status:
 * - Dev/test mode: query playerId allowed as fallback
 * - Production mode: requires authenticated playerId
 * - Later: connect to real NPC/combat hooks
 *
 * Rules:
 * - No arbitrary status/completion from client
 * - Server determines progression
 * - Only accept allowlisted event types
 * - NPC id must match objective target for progression
 * - Server-resolved playerId wins over client-provided
 */

import { Router } from "express";
import {
  questProgressionStore,
  type QuestEvent,
} from "../quests/QuestProgressionStore.js";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";

export const questEventRouter = Router();

// Mount at /api/quest/event - router is mounted at /api/quest in ServerBootstrap
questEventRouter.post("/event", async (req, res) => {
  // Ensure JSON body is parsed
  if (!req.body || typeof req.body !== "object") {
    res.status(400).json({
      ok: false,
      error: "invalid_quest_event",
    });
    return;
  }

  const identity = resolveHttpPlayerIdentity(req as Parameters<typeof resolveHttpPlayerIdentity>[0]);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({
      ok: false,
      error: "authenticated_player_required",
    });
    return;
  }

  const event = parseQuestEvent({
    ...(req.body as Record<string, unknown>),
    playerId: identity.playerId,
  });

  if (!event) {
    res.status(400).json({
      ok: false,
      error: "invalid_quest_event",
    });
    return;
  }

  // Hydrate persisted state before processing event
  await questProgressionStore.hydratePlayer(event.playerId);

  const questState = questProgressionStore.applyEvent(event);

  res.json({
    ok: true,
    playerId: event.playerId,
    playerIdentitySource: identity.source,
    authenticated: identity.authenticated,
    questState,
  });
});

function parseQuestEvent(body: unknown): QuestEvent | null {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b !== "object") return null;

  // playerId is now server-resolved from auth/session, not from body
  const playerId =
    typeof b.playerId === "string" && b.playerId.trim()
      ? b.playerId.trim()
      : "anonymous";

  if (b.type === "quest_accept" && typeof b.questId === "string") {
    return {
      type: "quest_accept",
      playerId,
      questId: b.questId,
    };
  }

  if (b.type === "npc_talk" && typeof b.npcId === "string") {
    return {
      type: "npc_talk",
      playerId,
      npcId: b.npcId,
    };
  }

  if (b.type === "npc_kill" && typeof b.npcId === "string") {
    return {
      type: "npc_kill",
      playerId,
      npcId: b.npcId,
    };
  }

  if (b.type === "item_pickup" && typeof b.itemId === "string") {
    return {
      type: "item_pickup",
      playerId,
      itemId: b.itemId,
      quantity: Math.max(1, Number(b.quantity ?? 1)),
    };
  }

  return null;
}