/**
 * NPC QUEST SERVICE
 *
 * Server-authoritative quest management for NPC economy quests.
 * Deterministic: No Math.random(), no Date.now() for gameplay state.
 * All quest mutations happen server-side after validation.
 */

import {
  VILLAGE_SUPPLY_ORDER_QUEST,
  type NpcQuestDefinition,
  type NpcQuestObjective,
  type QuestProgressSnapshot,
  type NpcDialogueSnapshot,
  type NpcReputationSnapshot,
  type QuestReward,
  type ActionResult,
  type NpcDialogueState,
  QuestFailReasons,
  type QuestFailReason,
} from "./NpcQuestTypes.js";
import { type QuestSnapshot } from "./QuestSnapshotTypes.js";

/**
 * Active quest state for a player.
 */
interface ActiveQuestState {
  questId: string;
  objectives: Map<string, { current: number; required: number; completed: boolean }>;
  rewardClaimed: boolean;
  started: boolean;
}

/**
 * Player NPC quest state.
 */
interface PlayerQuestState {
  activeQuests: Map<string, ActiveQuestState>;
  completedQuestIds: Set<string>;
  rewardClaimed: Set<string>;
}

/**
 * NPC Reputation state.
 */
interface NpcReputationState {
  reputation: number;
  completedQuestIds: string[];
}

/**
 * NPC Quest Service - manages quest state for all players.
 * Singleton pattern with server-authoritative state.
 */
export class NpcQuestService {
  private playerQuestStates = new Map<string, PlayerQuestState>();
  private npcReputations = new Map<string, Map<string, NpcReputationState>>(); // npcId -> playerId -> state

  // Quest definitions
  private readonly questDefinitions: Map<string, NpcQuestDefinition> = new Map([
    [VILLAGE_SUPPLY_ORDER_QUEST.questId, VILLAGE_SUPPLY_ORDER_QUEST],
  ]);

  // NPC definitions with positions
  private readonly npcDefinitions = new Map([
    ["village_trader_001", { id: "village_trader_001", displayName: "Mira the Quartermaster", x: 462, y: 503, interactionRadius: 32 }],
  ]);

  /**
   * Get player state, creating if needed.
   */
  private getOrCreatePlayerState(playerId: string): PlayerQuestState {
    let state = this.playerQuestStates.get(playerId);
    if (!state) {
      state = {
        activeQuests: new Map(),
        completedQuestIds: new Set(),
        rewardClaimed: new Set(),
      };
      this.playerQuestStates.set(playerId, state);
    }
    return state;
  }

  /**
   * Get or create NPC reputation state for player.
   */
  private getOrCreateNpcReputation(npcId: string, playerId: string): NpcReputationState {
    let npcStates = this.npcReputations.get(npcId);
    if (!npcStates) {
      npcStates = new Map();
      this.npcReputations.set(npcId, npcStates);
    }

    let state = npcStates.get(playerId);
    if (!state) {
      state = {
        reputation: 0,
        completedQuestIds: [],
      };
      npcStates.set(playerId, state);
    }
    return state;
  }

  /**
   * Get quest definition by ID.
   */
  getQuestDefinition(questId: string): NpcQuestDefinition | undefined {
    return this.questDefinitions.get(questId);
  }

  /**
   * Get NPC definition by ID.
   */
  getNpcDefinition(npcId: string) {
    return this.npcDefinitions.get(npcId);
  }

  /**
   * Calculate distance between two points.
   */
  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if player is within interaction radius of NPC.
   */
  isPlayerNearNpc(playerX: number, playerY: number, npcId: string): boolean {
    const npc = this.npcDefinitions.get(npcId);
    if (!npc) return false;

    const distance = this.calculateDistance(playerX, playerY, npc.x, npc.y);
    return distance <= npc.interactionRadius;
  }

  /**
   * Get quest progress snapshot for a quest.
   */
  getQuestProgress(playerId: string, questId: string): QuestProgressSnapshot | null {
    const questDef = this.questDefinitions.get(questId);
    if (!questDef) return null;

    const playerState = this.getOrCreatePlayerState(playerId);
    const activeQuest = playerState.activeQuests.get(questId);

    // Determine state
    let state: QuestProgressSnapshot["state"];
    if (playerState.completedQuestIds.has(questId)) {
      state = "completed";
    } else if (activeQuest) {
      // Check if all objectives are complete
      const allComplete = questDef.objectives.every((obj) => {
        const objState = activeQuest.objectives.get(obj.objectiveId);
        return objState?.completed ?? false;
      });
      state = allComplete ? "ready_to_complete" : "active";
    } else {
      state = "available";
    }

    // Build objectives
    const objectives: NpcQuestObjective[] = questDef.objectives.map((obj) => {
      let current = 0;
      let completed = false;

      if (activeQuest) {
        const objState = activeQuest.objectives.get(obj.objectiveId);
        if (objState) {
          current = objState.current;
          completed = objState.completed;
        }
      }

      return {
        objectiveId: obj.objectiveId,
        title: obj.title,
        current,
        required: obj.required,
        completed,
      };
    });

    return {
      questId,
      state,
      objectives: Object.freeze(objectives),
    };
  }

  /**
   * Get all active quests for a player.
   */
  getActiveQuests(playerId: string): readonly QuestProgressSnapshot[] {
    const playerState = this.getOrCreatePlayerState(playerId);
    const results: QuestProgressSnapshot[] = [];

    for (const questId of playerState.activeQuests.keys()) {
      const progress = this.getQuestProgress(playerId, questId);
      if (progress) {
        results.push(progress);
      }
    }

    return Object.freeze(results.sort((a, b) => a.questId.localeCompare(b.questId)));
  }

  /**
   * Get all available quests for a player (not started, not completed).
   */
  getAvailableQuests(playerId: string): readonly QuestProgressSnapshot[] {
    const playerState = this.getOrCreatePlayerState(playerId);
    const results: QuestProgressSnapshot[] = [];

    for (const [questId, questDef] of this.questDefinitions) {
      if (!playerState.completedQuestIds.has(questId) && !playerState.activeQuests.has(questId)) {
        // Create available snapshot
        const objectives: NpcQuestObjective[] = questDef.objectives.map((obj) => ({
          objectiveId: obj.objectiveId,
          title: obj.title,
          current: 0,
          required: obj.required,
          completed: false,
        }));

        results.push({
          questId,
          state: "available",
          objectives: Object.freeze(objectives),
        });
      }
    }

    return Object.freeze(results.sort((a, b) => a.questId.localeCompare(b.questId)));
  }

  /**
   * Accept a quest for a player.
   */
  acceptQuest(playerId: string, questId: string): ActionResult<QuestProgressSnapshot> {
    if (!playerId) {
      return { ok: false, reason: QuestFailReasons.MISSING_PLAYER };
    }

    const questDef = this.questDefinitions.get(questId);
    if (!questDef) {
      return { ok: false, reason: QuestFailReasons.MISSING_QUEST };
    }

    const playerState = this.getOrCreatePlayerState(playerId);

    // Check if already active
    if (playerState.activeQuests.has(questId)) {
      return { ok: false, reason: QuestFailReasons.QUEST_ALREADY_ACTIVE };
    }

    // Check if already completed
    if (playerState.completedQuestIds.has(questId)) {
      return { ok: false, reason: QuestFailReasons.QUEST_ALREADY_COMPLETED };
    }

    // Create active quest state
    const objectives = new Map<string, { current: number; required: number; completed: boolean }>();
    for (const obj of questDef.objectives) {
      objectives.set(obj.objectiveId, {
        current: 0,
        required: obj.required,
        completed: false,
      });
    }

    playerState.activeQuests.set(questId, {
      questId,
      objectives,
      rewardClaimed: false,
      started: true,
    });

    const progress = this.getQuestProgress(playerId, questId);
    return { ok: true, result: progress! };
  }

  /**
   * Update quest progress based on game events.
   * Called by game event handlers (gather, craft, sell).
   */
  updateQuestProgress(
    playerId: string,
    eventType: "gather" | "craft" | "sell",
    targetItemId: string,
    quantity: number = 1,
  ): ActionResult<readonly QuestProgressSnapshot[]> {
    if (!playerId) {
      return { ok: false, reason: QuestFailReasons.MISSING_PLAYER };
    }

    const playerState = this.getOrCreatePlayerState(playerId);
    const updatedQuests: QuestProgressSnapshot[] = [];

    // Find quests that have matching objectives
    for (const [questId, activeQuest] of playerState.activeQuests) {
      const questDef = this.questDefinitions.get(questId);
      if (!questDef) continue;

      for (const obj of questDef.objectives) {
        // Check if this objective matches the event
        // For craft events, check targetRecipeId; for gather/sell, check targetItemId
        let matches = false;
        if (eventType === "craft") {
          // Craft events match via targetRecipeId OR targetItemId (output item)
          matches = obj.targetRecipeId === targetItemId || obj.targetItemId === targetItemId;
        } else {
          // Gather and sell events match via targetItemId
          matches = obj.eventType === eventType && obj.targetItemId === targetItemId;
        }

        if (matches) {
          const objState = activeQuest.objectives.get(obj.objectiveId);
          if (objState && !objState.completed) {
            // Update progress
            objState.current = Math.min(objState.current + quantity, objState.required);
            if (objState.current >= objState.required) {
              objState.completed = true;
            }
          }
        }
      }

      const progress = this.getQuestProgress(playerId, questId);
      if (progress) {
        updatedQuests.push(progress);
      }
    }

    return { ok: true, result: Object.freeze(updatedQuests) };
  }

  /**
   * Update talk_to objectives when player talks to NPC.
   */
  updateTalkObjective(playerId: string, npcId: string): ActionResult<readonly QuestProgressSnapshot[]> {
    if (!playerId) {
      return { ok: false, reason: QuestFailReasons.MISSING_PLAYER };
    }

    const playerState = this.getOrCreatePlayerState(playerId);
    const updatedQuests: QuestProgressSnapshot[] = [];

    for (const [questId, activeQuest] of playerState.activeQuests) {
      const questDef = this.questDefinitions.get(questId);
      if (!questDef) continue;

      for (const obj of questDef.objectives) {
        if (obj.eventType === "talk" && obj.targetNpcId === npcId) {
          const objState = activeQuest.objectives.get(obj.objectiveId);
          if (objState && !objState.completed) {
            objState.current = Math.min(objState.current + 1, objState.required);
            if (objState.current >= objState.required) {
              objState.completed = true;
            }
          }
        }
      }

      const progress = this.getQuestProgress(playerId, questId);
      if (progress) {
        updatedQuests.push(progress);
      }
    }

    return { ok: true, result: Object.freeze(updatedQuests) };
  }

  /**
   * Complete a quest and grant rewards.
   */
  completeQuest(playerId: string, questId: string): ActionResult<{
    questProgress: QuestProgressSnapshot;
    reward: QuestReward;
    reputation: NpcReputationSnapshot;
  }> {
    if (!playerId) {
      return { ok: false, reason: QuestFailReasons.MISSING_PLAYER };
    }

    const questDef = this.questDefinitions.get(questId);
    if (!questDef) {
      return { ok: false, reason: QuestFailReasons.MISSING_QUEST };
    }

    const playerState = this.getOrCreatePlayerState(playerId);
    const activeQuest = playerState.activeQuests.get(questId);

    // Check if quest is active
    if (!activeQuest) {
      return { ok: false, reason: QuestFailReasons.QUEST_NOT_AVAILABLE };
    }

    // Check if all objectives are complete
    const allComplete = questDef.objectives.every((obj) => {
      const objState = activeQuest.objectives.get(obj.objectiveId);
      return objState?.completed ?? false;
    });

    if (!allComplete) {
      return { ok: false, reason: QuestFailReasons.OBJECTIVE_NOT_COMPLETE };
    }

    // Check if reward already claimed
    if (activeQuest.rewardClaimed) {
      return { ok: false, reason: QuestFailReasons.REWARD_ALREADY_CLAIMED };
    }

    // Mark reward as claimed
    activeQuest.rewardClaimed = true;

    // Move to completed
    playerState.activeQuests.delete(questId);
    playerState.completedQuestIds.add(questId);
    playerState.rewardClaimed.add(questId);

    // Update NPC reputation
    const npcRep = this.getOrCreateNpcReputation(questDef.npcId, playerId);
    npcRep.reputation += questDef.reward.reputation;
    npcRep.completedQuestIds.push(questId);

    const progress = this.getQuestProgress(playerId, questId);
    const reputation = this.getNpcReputation(playerId, questDef.npcId);

    return {
      ok: true,
      result: {
        questProgress: progress!,
        reward: questDef.reward,
        reputation: reputation!,
      },
    };
  }

  /**
   * Get NPC dialogue snapshot for player.
   */
  getNpcDialogue(playerId: string, npcId: string): NpcDialogueSnapshot {
    const npc = this.npcDefinitions.get(npcId);
    const displayName = npc?.displayName ?? "Unknown NPC";

    const playerState = this.getOrCreatePlayerState(playerId);

    // Determine dialogue state
    let dialogueState: NpcDialogueState = "quest_available";

    // Check for active quest
    const activeQuest = Array.from(playerState.activeQuests.values()).find(
      (q) => this.questDefinitions.get(q.questId)?.npcId === npcId,
    );

    if (playerState.completedQuestIds.has("village_supply_order_001")) {
      dialogueState = "quest_completed";
    } else if (activeQuest) {
      const questDef = this.questDefinitions.get(activeQuest.questId);
      if (questDef) {
        // Check objective states to determine dialogue
        const gatherObj = activeQuest.objectives.get("gather_wood_logs");
        const processObj = activeQuest.objectives.get("process_wood_plank");
        const sellObj = activeQuest.objectives.get("sell_wood_plank");
        const returnObj = activeQuest.objectives.get("return_to_mira");

        if (returnObj?.completed) {
          dialogueState = "quest_ready_to_complete";
        } else if (sellObj?.completed) {
          dialogueState = "quest_ready_to_complete";
        } else if (processObj?.completed) {
          dialogueState = "quest_active_ready_to_sell";
        } else if (gatherObj?.completed) {
          dialogueState = "quest_active_ready_to_process";
        } else {
          dialogueState = "quest_active_missing_wood";
        }
      }
    }

    // Generate dialogue line based on state
    const line = this.getDialogueLine(npcId, dialogueState);

    // Get quest IDs
    const availableQuestIds = this.getAvailableQuests(playerId)
      .filter((q) => this.questDefinitions.get(q.questId)?.npcId === npcId)
      .map((q) => q.questId);

    const activeQuestIds = this.getActiveQuests(playerId)
      .filter((q) => this.questDefinitions.get(q.questId)?.npcId === npcId)
      .map((q) => q.questId);

    const completedQuestIds = Array.from(playerState.completedQuestIds).filter(
      (qId) => this.questDefinitions.get(qId)?.npcId === npcId,
    );

    return Object.freeze({
      npcId,
      displayName,
      dialogueState,
      line,
      availableQuestIds: Object.freeze([...availableQuestIds]),
      activeQuestIds: Object.freeze([...activeQuestIds]),
      completedQuestIds: Object.freeze([...completedQuestIds]),
    });
  }

  /**
   * Get dialogue line based on state.
   */
  private getDialogueLine(npcId: string, state: NpcDialogueState): string {
    if (npcId === "village_trader_001") {
      switch (state) {
        case "quest_available":
          return "Greetings, traveler! The village store is in need of wood planks. Could you gather 2 wood logs, process them into planks, and sell one to me?";
        case "quest_active_missing_wood":
          return "Still gathering wood logs? You need 2 wood logs for the supply order. Talk to me when you have them!";
        case "quest_active_ready_to_process":
          return "Great, you have the wood logs! Now process them into planks at the workbench nearby. Come back when you have 1 plank ready.";
        case "quest_active_ready_to_sell":
          return "You have a wood plank? Perfect! Please sell it to me to complete the supply order.";
        case "quest_ready_to_complete":
          return "Thank you for the wood plank! The village store is grateful. Here is your payment and some XP for your work.";
        case "quest_completed":
          return "Welcome back! Your help with the supply order was invaluable. If you need anything, just ask!";
      }
    }
    return "...";
  }

  /**
   * Get NPC reputation for player.
   */
  getNpcReputation(playerId: string, npcId: string): NpcReputationSnapshot | null {
    const npc = this.npcDefinitions.get(npcId);
    if (!npc) return null;

    const playerState = this.getOrCreatePlayerState(playerId);
    const npcRep = this.getOrCreateNpcReputation(npcId, playerId);

    return Object.freeze({
      npcId,
      playerId,
      reputation: npcRep.reputation,
      completedQuestIds: Object.freeze([...npcRep.completedQuestIds]),
    });
  }

  /**
   * Get all NPC reputations for a player.
   */
  getAllNpcReputations(playerId: string): readonly NpcReputationSnapshot[] {
    const results: NpcReputationSnapshot[] = [];

    for (const npcId of this.npcDefinitions.keys()) {
      const rep = this.getNpcReputation(playerId, npcId);
      if (rep) {
        results.push(rep);
      }
    }

    return Object.freeze(results.sort((a, b) => a.npcId.localeCompare(b.npcId)));
  }

  /**
   * Convert to QuestSnapshot for LiveGameplaySnapshot integration.
   */
  toQuestSnapshots(playerId: string): QuestSnapshot[] {
    const playerState = this.getOrCreatePlayerState(playerId);
    const results: QuestSnapshot[] = [];

    // Add active quests
    for (const [questId] of playerState.activeQuests) {
      const progress = this.getQuestProgress(playerId, questId);
      if (progress) {
        const questDef = this.questDefinitions.get(questId);
        results.push({
          id: questId,
          title: questDef?.title ?? questId,
          description: questDef?.description ?? "",
          status: progress.state === "ready_to_complete" ? "active" : progress.state,
          objectives: progress.objectives.map((obj) => ({
            id: obj.objectiveId,
            label: obj.title,
            current: obj.current,
            required: obj.required,
            completed: obj.completed,
          })),
        });
      }
    }

    // Add available quests
    for (const quest of this.getAvailableQuests(playerId)) {
      const questDef = this.questDefinitions.get(quest.questId);
      results.push({
        id: quest.questId,
        title: questDef?.title ?? quest.questId,
        description: questDef?.description ?? "",
        status: "available",
        objectives: quest.objectives.map((obj) => ({
          id: obj.objectiveId,
          label: obj.title,
          current: 0,
          required: obj.required,
          completed: false,
        })),
      });
    }

    // Add completed quests
    for (const questId of playerState.completedQuestIds) {
      const questDef = this.questDefinitions.get(questId);
      results.push({
        id: questId,
        title: questDef?.title ?? questId,
        description: questDef?.description ?? "",
        status: "completed",
        objectives: [],
      });
    }

    return results.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Reset player quest state (for testing).
   */
  resetPlayerState(playerId: string): void {
    this.playerQuestStates.delete(playerId);
  }
}

/**
 * Global singleton instance.
 */
export const npcQuestService = new NpcQuestService();