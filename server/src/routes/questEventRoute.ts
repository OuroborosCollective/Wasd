/**
 * QUEST EVENT ROUTE
 *
 * Controlled quest event endpoint for server-authoritative progression.
 * Accepts only allowlisted event types - no arbitrary mutations.
 *
 * MVP Status:
 * - No auth required for test/dev
 * - Later: integrate with session/auth
 * - Later: connect to real NPC/combat hooks
 *
 * Rules:
 * - No arbitrary status/completion from client
 * - Server determines progression
 * - Only accept allowlisted event types
 * - NPC id must match objective target for progression
 */

import { Router } from "express";
import {
  questProgressionStore,
  type QuestEvent,
} from "../quests/QuestProgressionStore.js";

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

  const event = parseQuestEvent(req.body);

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
    questState,
  });
});

function parseQuestEvent(body: unknown): QuestEvent | null {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b !== "object") return null;

  const playerId =
    typeof b.playerId === "string" && b.playerId.trim()
      ? b.playerId.trim()
      : "guest";

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