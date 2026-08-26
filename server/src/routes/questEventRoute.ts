/**
 * QUEST EVENT ROUTE
 *
 * Controlled quest event endpoint for server-authoritative progression.
 * Accepts only allowlisted event types - no arbitrary mutations.
 *
 * Phase 11: Integrated with OuroborosTickSystem via TickSystemContextProvider.
 *
 * Rules:
 * - No arbitrary status/completion from client
 * - Server determines progression
 * - Only accept allowlisted event types
 * - NPC id must match objective target for progression
 * - Server-resolved playerId wins over client-provided
 */

import { Router, json } from "express";
import {
  questProgressionStore,
  type QuestEvent,
} from "../quests/QuestProgressionStore.js";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import type { InventoryItemId } from "../inventory/InventoryTypes.js";
import type { SkillId } from "../skills/SkillTypes.js";

export const questEventRouter = Router();

questEventRouter.use(json({ limit: "64kb" }));

type RewardSpec = {
  readonly xp?: {
    readonly skillId: SkillId;
    readonly amount: number;
  };
  readonly items?: readonly {
    readonly itemId: InventoryItemId;
    readonly quantity: number;
  }[];
};

const QUEST_REWARDS: Record<string, RewardSpec> = {
  first_steps: {
    xp: { skillId: "combat", amount: 25 },
    items: [{ itemId: "cooked_fish", quantity: 1 }],
  },
  start_path_wanderer: {
    xp: { skillId: "combat", amount: 20 },
    items: [{ itemId: "cooked_fish", quantity: 1 }],
  },
  start_path_forager: {
    xp: { skillId: "woodcutting", amount: 25 },
    items: [{ itemId: "wood_log", quantity: 2 }],
  },
  start_path_miner: {
    xp: { skillId: "mining", amount: 25 },
    items: [{ itemId: "copper_ore", quantity: 2 }],
  },
  start_path_angler: {
    xp: { skillId: "fishing", amount: 25 },
    items: [{ itemId: "raw_fish", quantity: 2 }],
  },
  start_path_artisan: {
    xp: { skillId: "crafting", amount: 25 },
    items: [{ itemId: "wood_plank", quantity: 1 }],
  },
};

function isGuestHttpAllowed(): boolean {
  const allowGuest = !["0", "false", "no"].includes(
    process.env.ALLOW_GUEST_LOGIN?.trim().toLowerCase() || "",
  );
  const allowDev = !["0", "false", "no"].includes(
    process.env.ALLOW_DEV_LOGIN?.trim().toLowerCase() || "",
  );
  return allowGuest || allowDev || process.env.ALLOW_DEV_PLAYER_ID === "true";
}

function rejectUnauthenticatedInLockedProduction(identity: { authenticated: boolean }): boolean {
  return process.env.NODE_ENV === "production" && !identity.authenticated && !isGuestHttpAllowed();
}

function parseQuestId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const questId = value.trim();
  if (!/^[a-zA-Z0-9:_-]{1,96}$/.test(questId)) return null;
  return questId;
}

questEventRouter.post("/claim-reward", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req as Parameters<typeof resolveHttpPlayerIdentity>[0]);

  if (rejectUnauthenticatedInLockedProduction(identity)) {
    res.status(401).json({
      ok: false,
      error: "authenticated_player_required",
    });
    return;
  }

  const questId = parseQuestId((req.body as Record<string, unknown> | null)?.questId);
  if (!questId) {
    res.status(400).json({ ok: false, error: "invalid_quest_id" });
    return;
  }

  await questProgressionStore.hydratePlayer(identity.playerId);

  if (questProgressionStore.isQuestRewardClaimed(identity.playerId, questId)) {
    res.json({
      ok: true,
      changed: false,
      playerId: identity.playerId,
      playerIdentitySource: identity.source,
      authenticated: identity.authenticated,
      result: {
        questId,
        reason: "reward_already_claimed",
      },
    });
    return;
  }

  const reward = QUEST_REWARDS[questId];
  if (!reward) {
    res.status(400).json({ ok: false, error: "quest_has_no_reward" });
    return;
  }

  const markResult = questProgressionStore.markQuestRewardClaimed(identity.playerId, questId);
  if (!markResult.ok) {
    res.status(409).json({
      ok: false,
      error: markResult.reason,
      quest: markResult.quest,
    });
    return;
  }

  const grantedItems: { itemId: InventoryItemId; quantity: number }[] = [];

  if (reward.items?.length) {
    const inventory = await getInventoryService();
    for (const item of reward.items) {
      const quantity = Math.max(1, Math.floor(item.quantity));
      const result = await inventory.addItem({
        playerId: identity.playerId,
        itemId: item.itemId,
        quantity,
      });

      if (result.ok) {
        grantedItems.push({ itemId: item.itemId, quantity });
      } else {
        console.warn(
          `[quest-event] failed to grant reward item ${item.itemId} x${quantity} to ${identity.playerId}: ${result.reason}`,
        );
      }
    }
  }

  let grantedXp: { skillId: SkillId; amount: number } | null = null;

  if (reward.xp) {
    const amount = Math.max(1, Math.floor(reward.xp.amount));
    const skillService = await getSkillProgressionService();
    await skillService.applyEvent({
      type: "skill_xp_gain",
      playerId: identity.playerId,
      skillId: reward.xp.skillId,
      amount,
      source: "quest_reward",
    });
    grantedXp = { skillId: reward.xp.skillId, amount };
  }

  const tickContext = tickContextProvider.getContext();
  res.json({
    ok: true,
    changed: true,
    playerId: identity.playerId,
    playerIdentitySource: identity.source,
    authenticated: identity.authenticated,
    result: {
      questId,
      reason: "reward_claimed",
      quest: markResult.quest,
      reward: {
        xp: grantedXp,
        items: grantedItems,
      },
    },
    tickContext: {
      tickId: tickContext.tickId,
      worldTimeHours: tickContext.worldTimeHours,
      seedHash: tickContext.seedHash,
    },
  });
});

questEventRouter.post("/event", async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    res.status(400).json({
      ok: false,
      error: "invalid_quest_event",
    });
    return;
  }

  const identity = resolveHttpPlayerIdentity(req as Parameters<typeof resolveHttpPlayerIdentity>[0]);

  if (rejectUnauthenticatedInLockedProduction(identity)) {
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

  await questProgressionStore.hydratePlayer(event.playerId);

  const questState = questProgressionStore.applyEvent(event);

  const tickContext = tickContextProvider.getContext();
  res.json({
    ok: true,
    playerId: event.playerId,
    playerIdentitySource: identity.source,
    authenticated: identity.authenticated,
    questState,
    tickContext: {
      tickId: tickContext.tickId,
      worldTimeHours: tickContext.worldTimeHours,
      seedHash: tickContext.seedHash,
    },
  });
});

function parseQuestEvent(body: unknown): QuestEvent | null {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b !== "object") return null;

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
