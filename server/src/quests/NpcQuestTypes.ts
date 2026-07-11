/**
 * NPC QUEST TYPES
 *
 * Server-side types for NPC quest system integration.
 * Deterministic: no random or wall-clock gameplay authority.
 */

import type { QuestSnapshot } from "./QuestSnapshotTypes.js";

export interface NpcQuestObjective {
  readonly objectiveId: string;
  readonly title: string;
  readonly current: number;
  readonly required: number;
  readonly completed: boolean;
}

export interface QuestProgressSnapshot {
  readonly questId: string;
  readonly state: "available" | "active" | "ready_to_complete" | "completed";
  readonly objectives: readonly NpcQuestObjective[];
}

export type NpcDialogueState =
  | "quest_available"
  | "quest_active_missing_wood"
  | "quest_active_ready_to_process"
  | "quest_active_ready_to_sell"
  | "quest_ready_to_complete"
  | "quest_completed";

export interface NpcDialogueSnapshot {
  readonly npcId: string;
  readonly displayName: string;
  readonly dialogueState: NpcDialogueState;
  readonly line: string;
  readonly availableQuestIds: readonly string[];
  readonly activeQuestIds: readonly string[];
  readonly completedQuestIds: readonly string[];
}

export interface NpcReputationSnapshot {
  readonly npcId: string;
  readonly playerId: string;
  readonly reputation: number;
  readonly completedQuestIds: readonly string[];
}

export interface QuestReward {
  readonly coins: number;
  readonly gatheringXp: number;
  readonly craftingXp: number;
  readonly reputation: number;
}

export interface NpcQuestDefinition {
  readonly questId: string;
  readonly title: string;
  readonly description: string;
  readonly npcId: string;
  readonly objectives: readonly {
    readonly objectiveId: string;
    readonly title: string;
    readonly required: number;
    readonly eventType: "gather" | "craft" | "sell" | "talk";
    readonly targetItemId?: string;
    readonly targetNpcId?: string;
    readonly targetRecipeId?: string;
  }[];
  readonly reward: QuestReward;
}

export const VILLAGE_SUPPLY_ORDER_QUEST: NpcQuestDefinition = Object.freeze({
  questId: "village_supply_order_001",
  title: "Mira's First Supply Order",
  description: "Mira the Quartermaster needs wood planks for the village store. Gather wood logs, process them at the workbench, and deliver the planks.",
  npcId: "village_trader_001",
  objectives: Object.freeze([
    Object.freeze({
      objectiveId: "gather_wood_logs",
      title: "Gather 2 Wood Logs",
      required: 2,
      eventType: "gather" as const,
      targetItemId: "wood_log",
    }),
    Object.freeze({
      objectiveId: "process_wood_plank",
      title: "Process 1 Wood Plank at Workbench",
      required: 1,
      eventType: "craft" as const,
      targetRecipeId: "craft_wood_plank",
    }),
    Object.freeze({
      objectiveId: "sell_wood_plank",
      title: "Sell 1 Wood Plank to Mira",
      required: 1,
      eventType: "sell" as const,
      targetItemId: "wood_plank",
    }),
    Object.freeze({
      objectiveId: "return_to_mira",
      title: "Return to Mira",
      required: 1,
      eventType: "talk" as const,
      targetNpcId: "village_trader_001",
    }),
  ]),
  reward: Object.freeze({
    coins: 10,
    gatheringXp: 25,
    craftingXp: 25,
    reputation: 1,
  }),
});

export type ActionResult<T> =
  | {
      readonly ok: true;
      readonly result: T;
      readonly reason?: undefined;
      readonly details?: undefined;
    }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly details?: Record<string, unknown>;
      readonly result?: undefined;
    };

export const QuestFailReasons = Object.freeze({
  MISSING_PLAYER: "missing_player",
  MISSING_NPC: "missing_npc",
  NPC_TOO_FAR: "npc_too_far",
  MISSING_QUEST: "missing_quest",
  QUEST_NOT_AVAILABLE: "quest_not_available",
  QUEST_ALREADY_ACTIVE: "quest_already_active",
  QUEST_ALREADY_COMPLETED: "quest_already_completed",
  OBJECTIVE_NOT_COMPLETE: "objective_not_complete",
  MISSING_REQUIRED_ITEM: "missing_required_item",
  MISSING_REQUIRED_SALE: "missing_required_sale",
  INVALID_QUEST_STATE: "invalid_quest_state",
  REWARD_ALREADY_CLAIMED: "reward_already_claimed",
  PERSISTENCE_FAILED: "persistence_failed",
  REWARD_COMMIT_FAILED: "reward_commit_failed",
  REWARD_RECOVERY_FAILED: "reward_recovery_failed",
} as const);

export type QuestFailReason = typeof QuestFailReasons[keyof typeof QuestFailReasons];

export type { QuestSnapshot };
