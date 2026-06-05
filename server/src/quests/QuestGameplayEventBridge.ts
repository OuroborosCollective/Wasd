/**
 * QUEST GAMEPLAY EVENT BRIDGE
 *
 * Adapter layer that translates gameplay-facing NPC interaction and NPC kill events
 * into QuestProgressionStore events.
 *
 * NPC and Combat systems do not need to know QuestProgressionStore internals.
 * They call this bridge instead.
 *
 * Rules:
 * - No Date.now()
 * - No Math.random()
 * - No direct client authority
 * - Not every NPC triggers progress - only allowlisted IDs
 * - Result is machine-readable
 */

import { questProgressionStore } from "./QuestProgressionStore";
import { bridgeNpcKillToCombatXp } from "../skills/SkillGameplayEventBridge.js";

export type GameplayQuestEvent =
  | {
      type: "player_npc_interaction";
      playerId: string;
      npcId: string;
    }
  | {
      type: "player_npc_kill";
      playerId: string;
      npcId: string;
    };

export interface QuestGameplayEventResult {
  ok: boolean;
  playerId: string;
  changed: boolean;
  questIds: string[];
  reason?: string;
}

const TOWN_ELDER_IDS = new Set([
  "town_elder",
  "npc_town_elder",
  "npc_1",
]);

const TRAINING_TARGET_IDS = new Set([
  "training_dummy",
  "npc_training_dummy",
  "dummy",
  "npc_2",
]);

function changedQuestIdsBeforeAfter(beforeIds: string[], afterIds: string[]): string[] {
  return [...new Set([...beforeIds, ...afterIds])].sort();
}

export function handleGameplayQuestEvent(event: GameplayQuestEvent): QuestGameplayEventResult {
  const before = questProgressionStore.getPlayerQuestState(event.playerId);

  if (event.type === "player_npc_interaction") {
    if (!TOWN_ELDER_IDS.has(event.npcId)) {
      return {
        ok: true,
        playerId: event.playerId,
        changed: false,
        questIds: before.quests.map((q) => q.id).sort(),
        reason: "npc_does_not_progress_quest",
      };
    }

    const after = questProgressionStore.applyEvent({
      type: "npc_talk",
      playerId: event.playerId,
      npcId: event.npcId,
    });

    return {
      ok: true,
      playerId: event.playerId,
      changed: JSON.stringify(before.quests) !== JSON.stringify(after.quests),
      questIds: changedQuestIdsBeforeAfter(
        before.quests.map((q) => q.id),
        after.quests.map((q) => q.id)
      ),
    };
  }

  if (event.type === "player_npc_kill") {
    // Bridge NPC kill to skill XP (combat) - always fires for kills
    void bridgeNpcKillToCombatXp(event.playerId);

    if (!TRAINING_TARGET_IDS.has(event.npcId)) {
      return {
        ok: true,
        playerId: event.playerId,
        changed: false,
        questIds: before.quests.map((q) => q.id).sort(),
        reason: "npc_kill_does_not_progress_quest",
      };
    }

    const after = questProgressionStore.applyEvent({
      type: "npc_kill",
      playerId: event.playerId,
      npcId: event.npcId,
    });

    return {
      ok: true,
      playerId: event.playerId,
      changed: JSON.stringify(before.quests) !== JSON.stringify(after.quests),
      questIds: changedQuestIdsBeforeAfter(
        before.quests.map((q) => q.id),
        after.quests.map((q) => q.id)
      ),
    };
  }

  const unknownEvent = event as { playerId: string };
  return {
    ok: false,
    playerId: unknownEvent.playerId,
    changed: false,
    questIds: before.quests.map((q) => q.id).sort(),
    reason: "unsupported_event",
  };
}