/**
 * Server-authoritative camp quest action path.
 *
 * Truth sources:
 * - Quest identity and template: CampQuestDirector pure derivation
 * - Quest state: QuestProgressionStore
 * - Required items: InventoryService
 * - Coin reward: WalletService
 * - XP reward: SkillProgressionService
 *
 * No client-supplied completion, no fake snapshots, no wall-clock gameplay reads.
 */

import { getWalletService } from "../economy/economyRuntime.js";
import type { LiveGameplayQuestProgress, LiveGameplayQuestReward, LiveGameplayWallet } from "../gameplay/LiveGameplaySnapshotTypes.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import type { InventoryItemId, PlayerInventoryState } from "../inventory/InventoryTypes.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import type { PlayerSkillState } from "../skills/SkillTypes.js";
import type { QuestSnapshot } from "./QuestSnapshotTypes.js";
import { questProgressionStore } from "./QuestProgressionStore.js";
import {
  CAMP_QUEST_ID_PREFIX,
  type CampQuestOfferDetails,
  type CampQuestPoi,
  generateCampQuestOfferDetails,
  isCampQuestId,
  parseCampQuestId,
  resolveCampQuestOffer,
} from "./CampQuestDirector.js";

export type CampQuestFailReason =
  | "missing_player"
  | "missing_quest"
  | "quest_not_available"
  | "quest_already_active"
  | "quest_already_completed"
  | "objective_not_complete"
  | "missing_required_item"
  | "reward_already_claimed"
  | "inventory_remove_failed"
  | "reward_apply_failed";

export type CampQuestActionResult<T> =
  | { ok: true; result: T }
  | { ok: false; reason: CampQuestFailReason; details?: Record<string, unknown> };

export interface CampQuestContextInput {
  readonly playerId: string;
  readonly logicalIndex: number;
  readonly worldPois: readonly CampQuestPoi[];
  readonly discoveredPoiIds: readonly string[];
}

export interface CampQuestIntentInput extends CampQuestContextInput {
  readonly questId: string;
}

export interface CampQuestCompletionResult {
  readonly questProgress: LiveGameplayQuestProgress;
  readonly reward: LiveGameplayQuestReward;
  readonly wallet: LiveGameplayWallet;
  readonly skills: PlayerSkillState;
  readonly requiredItemId: InventoryItemId;
  readonly deliveredQuantity: number;
}

class CampQuestService {
  async acceptQuest(input: CampQuestIntentInput): Promise<CampQuestActionResult<LiveGameplayQuestProgress>> {
    const playerId = input.playerId.trim();
    if (!playerId) return { ok: false, reason: "missing_player" };

    const details = resolveCampQuestOffer(input);
    if (!details) return { ok: false, reason: "missing_quest" };

    await questProgressionStore.hydratePlayer(playerId);
    const existing = getStoredCampQuest(playerId, input.questId);
    if (existing?.status === "completed") return { ok: false, reason: "quest_already_completed" };
    if (existing?.status === "active") return { ok: false, reason: "quest_already_active" };

    const questSnapshot = await this.createActiveSnapshotFromDetails(playerId, details);
    const stored = questProgressionStore.upsertDerivedQuestSnapshot(playerId, questSnapshot);
    return { ok: true, result: await this.toLiveCampQuest(playerId, stored, input) };
  }

  async completeQuest(input: CampQuestIntentInput): Promise<CampQuestActionResult<CampQuestCompletionResult>> {
    const playerId = input.playerId.trim();
    if (!playerId) return { ok: false, reason: "missing_player" };
    if (!isCampQuestId(input.questId)) return { ok: false, reason: "missing_quest" };

    const details = resolveCampQuestOffer(input);
    if (!details) return { ok: false, reason: "missing_quest" };

    await questProgressionStore.hydratePlayer(playerId);
    const existing = getStoredCampQuest(playerId, input.questId);
    if (!existing) return { ok: false, reason: "quest_not_available" };
    if (existing.status === "completed") return { ok: false, reason: "reward_already_claimed" };
    if (existing.status !== "active") return { ok: false, reason: "quest_not_available" };

    const inventoryService = await getInventoryService();
    const hasRequiredItems = await inventoryService.hasItems({
      playerId,
      items: [{ itemId: details.requiredItemId, quantity: details.requiredQuantity }],
    });
    if (!hasRequiredItems) {
      const inventory = await inventoryService.getPlayerInventory(playerId);
      return {
        ok: false,
        reason: "missing_required_item",
        details: {
          itemId: details.requiredItemId,
          required: details.requiredQuantity,
          current: getInventoryQuantity(inventory, details.requiredItemId),
        },
      };
    }

    const removeResult = await inventoryService.removeItem({
      playerId,
      itemId: details.requiredItemId,
      quantity: details.requiredQuantity,
    });
    if (!removeResult.ok) {
      return {
        ok: false,
        reason: "inventory_remove_failed",
        details: {
          itemId: details.requiredItemId,
          quantity: details.requiredQuantity,
          removeReason: removeResult.reason,
        },
      };
    }

    try {
      const reward = details.quest.reward ?? { coins: 0, gatheringXp: 0, craftingXp: 0, reputation: 0 };
      const walletService = await getWalletService();
      const wallet = await walletService.addCoins({ playerId, amount: reward.coins });
      const skillService = await getSkillProgressionService();

      let skills = await skillService.getPlayerSkillState(playerId);
      if (reward.gatheringXp > 0) {
        skills = await skillService.applyEvent({
          type: "skill_xp_gain",
          playerId,
          skillId: details.rewardSkillId,
          amount: reward.gatheringXp,
          source: "quest_reward",
        });
      }
      if (reward.craftingXp > 0) {
        skills = await skillService.applyEvent({
          type: "skill_xp_gain",
          playerId,
          skillId: "crafting",
          amount: reward.craftingXp,
          source: "quest_reward",
        });
      }

      const completedSnapshot = createCompletedSnapshot(details);
      const stored = questProgressionStore.upsertDerivedQuestSnapshot(playerId, completedSnapshot);
      const questProgress = await this.toLiveCampQuest(playerId, stored, input);

      return {
        ok: true,
        result: Object.freeze({
          questProgress,
          reward,
          wallet: Object.freeze({ coin: wallet.balances.coin }),
          skills,
          requiredItemId: details.requiredItemId,
          deliveredQuantity: details.requiredQuantity,
        }),
      };
    } catch (error) {
      return {
        ok: false,
        reason: "reward_apply_failed",
        details: { message: String(error) },
      };
    }
  }

  async getActiveQuests(input: CampQuestContextInput): Promise<readonly LiveGameplayQuestProgress[]> {
    const playerId = input.playerId.trim();
    if (!playerId) return Object.freeze([]);

    await questProgressionStore.hydratePlayer(playerId);
    const state = questProgressionStore.getPlayerQuestState(playerId);
    const active = state.quests.filter((quest) => quest.id.startsWith(CAMP_QUEST_ID_PREFIX) && quest.status === "active");
    const live = await Promise.all(active.map((quest) => this.toLiveCampQuest(playerId, quest, input)));
    return Object.freeze(live.sort((a, b) => a.questId.localeCompare(b.questId)));
  }

  async getAvailableQuests(input: CampQuestContextInput): Promise<readonly LiveGameplayQuestProgress[]> {
    const playerId = input.playerId.trim();
    if (!playerId) return Object.freeze([]);

    await questProgressionStore.hydratePlayer(playerId);
    const state = questProgressionStore.getPlayerQuestState(playerId);
    const hiddenQuestIds = state.quests
      .filter((quest) => quest.id.startsWith(CAMP_QUEST_ID_PREFIX) && (quest.status === "active" || quest.status === "completed"))
      .map((quest) => quest.id);

    const offers = generateCampQuestOfferDetails({
      playerId,
      logicalIndex: input.logicalIndex,
      worldPois: input.worldPois,
      discoveredPoiIds: input.discoveredPoiIds,
      completedQuestIds: hiddenQuestIds,
      hiddenQuestIds,
    }).map((details) => details.quest);

    return Object.freeze(offers.sort((a, b) => a.questId.localeCompare(b.questId)));
  }

  async getCompletedQuestIds(playerId: string): Promise<readonly string[]> {
    const normalizedPlayerId = playerId.trim();
    if (!normalizedPlayerId) return Object.freeze([]);

    await questProgressionStore.hydratePlayer(normalizedPlayerId);
    const completed = questProgressionStore
      .getPlayerQuestState(normalizedPlayerId)
      .quests
      .filter((quest) => quest.id.startsWith(CAMP_QUEST_ID_PREFIX) && quest.status === "completed")
      .map((quest) => quest.id)
      .sort();

    return Object.freeze(completed);
  }

  private async createActiveSnapshotFromDetails(playerId: string, details: CampQuestOfferDetails): Promise<QuestSnapshot> {
    const inventoryService = await getInventoryService();
    const inventory = await inventoryService.getPlayerInventory(playerId);
    return createActiveSnapshot(details, getInventoryQuantity(inventory, details.requiredItemId));
  }

  private async toLiveCampQuest(
    playerId: string,
    quest: QuestSnapshot,
    context: CampQuestContextInput,
  ): Promise<LiveGameplayQuestProgress> {
    const details = resolveCampQuestOffer({
      playerId,
      questId: quest.id,
      worldPois: context.worldPois,
      discoveredPoiIds: context.discoveredPoiIds,
    });

    if (!details) return questSnapshotToLive(quest);
    if (quest.status === "completed") return questSnapshotToLive(createCompletedSnapshot(details), details);

    const inventoryService = await getInventoryService();
    const inventory = await inventoryService.getPlayerInventory(playerId);
    return questSnapshotToLive(createActiveSnapshot(details, getInventoryQuantity(inventory, details.requiredItemId)), details);
  }
}

function getStoredCampQuest(playerId: string, questId: string): QuestSnapshot | undefined {
  return questProgressionStore
    .getPlayerQuestState(playerId)
    .quests
    .find((quest) => quest.id === questId && quest.id.startsWith(CAMP_QUEST_ID_PREFIX));
}

function getInventoryQuantity(inventory: PlayerInventoryState, itemId: InventoryItemId): number {
  return inventory.slots
    .filter((slot) => slot.itemId === itemId)
    .reduce((sum, slot) => sum + Math.max(0, Math.floor(slot.quantity)), 0);
}

function createActiveSnapshot(details: CampQuestOfferDetails, currentQuantity: number): QuestSnapshot {
  const carried = Math.min(Math.max(0, Math.floor(currentQuantity)), details.requiredQuantity);
  const ready = carried >= details.requiredQuantity;
  const quest = details.quest;

  return {
    id: quest.questId,
    title: quest.title ?? quest.questId,
    description: quest.description ?? "",
    status: "active",
    objectives: [
      {
        id: `${quest.questId}:deliver`,
        label: quest.objectives[0]?.title ?? `Deliver ${details.requiredQuantity} ${details.requiredItemId}`,
        current: carried,
        required: details.requiredQuantity,
        completed: ready,
      },
      {
        id: `${quest.questId}:return`,
        label: quest.objectives[1]?.title ?? "Return to camp",
        current: ready ? 1 : 0,
        required: 1,
        completed: ready,
      },
    ],
  };
}

function createCompletedSnapshot(details: CampQuestOfferDetails): QuestSnapshot {
  const quest = details.quest;

  return {
    id: quest.questId,
    title: quest.title ?? quest.questId,
    description: quest.description ?? "",
    status: "completed",
    objectives: [
      {
        id: `${quest.questId}:deliver`,
        label: quest.objectives[0]?.title ?? `Deliver ${details.requiredQuantity} ${details.requiredItemId}`,
        current: details.requiredQuantity,
        required: details.requiredQuantity,
        completed: true,
      },
      {
        id: `${quest.questId}:return`,
        label: quest.objectives[1]?.title ?? "Return to camp",
        current: 1,
        required: 1,
        completed: true,
      },
    ],
  };
}

function campNpcIdFromQuestId(questId: string): string {
  const parsed = parseCampQuestId(questId);
  return parsed ? `camp_npc:${parsed.poiId}` : "camp_npc:unknown";
}

function questSnapshotToLive(quest: QuestSnapshot, details?: CampQuestOfferDetails): LiveGameplayQuestProgress {
  const objectives = quest.objectives.map((objective) => ({
    objectiveId: objective.id,
    title: objective.label,
    current: objective.current,
    required: objective.required,
    completed: objective.completed,
  }));
  const allComplete = objectives.length > 0 && objectives.every((objective) => objective.completed);
  const state = quest.status === "completed"
    ? "completed"
    : quest.status === "active" && allComplete
      ? "ready_to_complete"
      : quest.status === "active"
        ? "active"
        : "available";

  const base = {
    questId: quest.id,
    title: quest.title,
    description: quest.description,
    npcId: details?.quest.npcId ?? campNpcIdFromQuestId(quest.id),
    state,
    objectives: Object.freeze(objectives),
  } satisfies Omit<LiveGameplayQuestProgress, "reward">;

  if (!details?.quest.reward) return Object.freeze(base);

  return Object.freeze({
    ...base,
    reward: details.quest.reward,
  });
}

export const campQuestService = new CampQuestService();
