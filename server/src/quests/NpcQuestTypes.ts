/**
 * NPC QUEST TYPES
 *
 * Server-side types for NPC quest system integration.
 * Deterministic: No Math.random(), no Date.now() for gameplay state.
 */

import type { QuestSnapshot } from "./QuestSnapshotTypes.js";

/**
 * Quest objective with deterministic progress tracking.
 */
export interface NpcQuestObjective {
  readonly objectiveId: string;
  readonly title: string;
  readonly current: number;
  readonly required: number;
  readonly completed: boolean;
}

/**
 * Quest progress snapshot for quest tracker UI.
 */
export interface QuestProgressSnapshot {
  readonly questId: string;
  readonly state: "available" | "active" | "ready_to_complete" | "completed";
  readonly objectives: readonly NpcQuestObjective[];
}

/**
 * NPC dialogue states based on quest progress.
 */
export type NpcDialogueState =
  | "quest_available"
  | "quest_active_missing_wood"
  | "quest_active_ready_to_process"
  | "quest_active_ready_to_sell"
  | "quest_ready_to_complete"
  | "quest_completed";

/**
 * NPC dialogue snapshot for client UI.
 */
export interface NpcDialogueSnapshot {
  readonly npcId: string;
  readonly displayName: string;
  readonly dialogueState: NpcDialogueState;
  readonly line: string;
  readonly availableQuestIds: readonly string[];
  readonly activeQuestIds: readonly string[];
  readonly completedQuestIds: readonly string[];
}

/**
 * NPC reputation snapshot for player-NPC relationship.
 */
export interface NpcReputationSnapshot {
  readonly npcId: string;
  readonly playerId: string;
  readonly reputation: number;
  readonly completedQuestIds: readonly string[];
}

/**
 * Quest reward definition.
 */
export interface QuestReward {
  readonly coins: number;
  readonly gatheringXp: number;
  readonly craftingXp: number;
  readonly reputation: number;
}

/**
 * Quest definition for NPC quest system.
 */
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

/**
 * Village Supply Order quest definition.
 */
export const VILLAGE_SUPPLY_ORDER_QUEST: NpcQuestDefinition = {
  questId: "village_supply_order_001",
  title: "Mira's First Supply Order",
  description: "Mira the Quartermaster needs wood planks for the village store. Gather wood logs, process them at the workbench, and deliver the planks.",
  npcId: "village_trader_001",
  objectives: [
    {
      objectiveId: "gather_wood_logs",
      title: "Gather 2 Wood Logs",
      required: 2,
      eventType: "gather",
      targetItemId: "wood_log",
    },
    {
      objectiveId: "process_wood_plank",
      title: "Process 1 Wood Plank at Workbench",
      required: 1,
      eventType: "craft",
      targetRecipeId: "craft_wood_plank",
    },
    {
      objectiveId: "sell_wood_plank",
      title: "Sell 1 Wood Plank to Mira",
      required: 1,
      eventType: "sell",
      targetItemId: "wood_plank",
    },
    {
      objectiveId: "return_to_mira",
      title: "Return to Mira",
      required: 1,
      eventType: "talk",
      targetNpcId: "village_trader_001",
    },
  ],
  reward: {
    coins: 10,
    gatheringXp: 25,
    craftingXp: 25,
    reputation: 1,
  },
};

/**
 * Action result shape for API responses.
 */
export type ActionResult<T> =
  | { ok: true; result: T }
  | { ok: false; reason: string; details?: Record<string, unknown> };

/**
 * Fail reasons for quest operations.
 */
export const QuestFailReasons = {
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
} as const;

export type QuestFailReason = typeof QuestFailReasons[keyof typeof QuestFailReasons];