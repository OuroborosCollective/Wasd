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
} from "./NpcQuestTypes.js";
import type { QuestSnapshot } from "./QuestSnapshotTypes.js";
import {
  normalizeNpcQuestPlayerState,
  type PersistedNpcQuestPlayerState,
} from "./NpcQuestPersistence.js";

interface ActiveQuestState {
  questId: string;
  objectives: Map<string, { current: number; required: number; completed: boolean }>;
  rewardClaimed: boolean;
  started: boolean;
}

interface PlayerQuestState {
  activeQuests: Map<string, ActiveQuestState>;
  completedQuestIds: Set<string>;
  rewardClaimed: Set<string>;
}

interface NpcReputationState {
  reputation: number;
  completedQuestIds: string[];
}

const NPC_DEFINITIONS = new Map([
  ["village_trader_001", {
    id: "village_trader_001",
    displayName: "Mira the Quartermaster",
    x: 462,
    y: 503,
    interactionRadius: 32,
  }],
]);

function createEmptyPlayerState(): PlayerQuestState {
  return {
    activeQuests: new Map(),
    completedQuestIds: new Set(),
    rewardClaimed: new Set(),
  };
}

export class NpcQuestService {
  private readonly playerQuestStates = new Map<string, PlayerQuestState>();
  private readonly npcReputations = new Map<string, Map<string, NpcReputationState>>();
  private readonly questDefinitions = new Map<string, NpcQuestDefinition>([
    [VILLAGE_SUPPLY_ORDER_QUEST.questId, VILLAGE_SUPPLY_ORDER_QUEST],
  ]);
  private readonly npcDefinitions = NPC_DEFINITIONS;

  private getOrCreatePlayerState(playerId: string): PlayerQuestState {
    let state = this.playerQuestStates.get(playerId);
    if (!state) {
      state = createEmptyPlayerState();
      this.playerQuestStates.set(playerId, state);
    }
    return state;
  }

  private getOrCreateNpcReputation(npcId: string, playerId: string): NpcReputationState {
    let npcStates = this.npcReputations.get(npcId);
    if (!npcStates) {
      npcStates = new Map();
      this.npcReputations.set(npcId, npcStates);
    }
    let state = npcStates.get(playerId);
    if (!state) {
      state = { reputation: 0, completedQuestIds: [] };
      npcStates.set(playerId, state);
    }
    return state;
  }

  public getQuestDefinition(questId: string): NpcQuestDefinition | undefined {
    return this.questDefinitions.get(questId);
  }

  public getNpcDefinition(npcId: string) {
    return this.npcDefinitions.get(npcId);
  }

  public isPlayerNearNpc(playerX: number, playerY: number, npcId: string): boolean {
    const npc = this.npcDefinitions.get(npcId);
    if (!npc || !Number.isFinite(playerX) || !Number.isFinite(playerY)) return false;
    const dx = npc.x - playerX;
    const dy = npc.y - playerY;
    return Math.sqrt(dx * dx + dy * dy) <= npc.interactionRadius;
  }

  public getQuestProgress(playerId: string, questId: string): QuestProgressSnapshot | null {
    const quest = this.questDefinitions.get(questId);
    if (!quest) return null;
    const playerState = this.getOrCreatePlayerState(playerId);
    const active = playerState.activeQuests.get(questId);
    let state: QuestProgressSnapshot["state"] = "available";
    if (playerState.completedQuestIds.has(questId)) {
      state = "completed";
    } else if (active) {
      const complete = quest.objectives.every((objective) => active.objectives.get(objective.objectiveId)?.completed === true);
      state = complete ? "ready_to_complete" : "active";
    }
    const objectives = quest.objectives.map((objective): NpcQuestObjective => {
      const current = active?.objectives.get(objective.objectiveId);
      return Object.freeze({
        objectiveId: objective.objectiveId,
        title: objective.title,
        current: current?.current ?? 0,
        required: objective.required,
        completed: current?.completed ?? false,
      });
    });
    return Object.freeze({ questId, state, objectives: Object.freeze(objectives) });
  }

  public getActiveQuests(playerId: string): readonly QuestProgressSnapshot[] {
    const state = this.getOrCreatePlayerState(playerId);
    return Object.freeze(
      [...state.activeQuests.keys()]
        .map((questId) => this.getQuestProgress(playerId, questId))
        .filter((quest): quest is QuestProgressSnapshot => quest !== null)
        .sort((a, b) => a.questId.localeCompare(b.questId)),
    );
  }

  public getAvailableQuests(playerId: string): readonly QuestProgressSnapshot[] {
    const state = this.getOrCreatePlayerState(playerId);
    const result: QuestProgressSnapshot[] = [];
    for (const [questId, quest] of this.questDefinitions) {
      if (state.completedQuestIds.has(questId) || state.activeQuests.has(questId)) continue;
      result.push(Object.freeze({
        questId,
        state: "available" as const,
        objectives: Object.freeze(quest.objectives.map((objective) => Object.freeze({
          objectiveId: objective.objectiveId,
          title: objective.title,
          current: 0,
          required: objective.required,
          completed: false,
        }))),
      }));
    }
    return Object.freeze(result.sort((a, b) => a.questId.localeCompare(b.questId)));
  }

  public getCompletedQuestIds(playerId: string): readonly string[] {
    return Object.freeze([...this.getOrCreatePlayerState(playerId).completedQuestIds].sort());
  }

  public acceptQuest(playerId: string, questId: string): ActionResult<QuestProgressSnapshot> {
    if (!playerId) return { ok: false, reason: QuestFailReasons.MISSING_PLAYER };
    const quest = this.questDefinitions.get(questId);
    if (!quest) return { ok: false, reason: QuestFailReasons.MISSING_QUEST };
    const state = this.getOrCreatePlayerState(playerId);
    if (state.activeQuests.has(questId)) return { ok: false, reason: QuestFailReasons.QUEST_ALREADY_ACTIVE };
    if (state.completedQuestIds.has(questId)) return { ok: false, reason: QuestFailReasons.QUEST_ALREADY_COMPLETED };
    const objectives = new Map<string, { current: number; required: number; completed: boolean }>();
    for (const objective of quest.objectives) {
      objectives.set(objective.objectiveId, { current: 0, required: objective.required, completed: false });
    }
    state.activeQuests.set(questId, { questId, objectives, rewardClaimed: false, started: true });
    return { ok: true, result: this.getQuestProgress(playerId, questId)! };
  }

  public updateQuestProgress(
    playerId: string,
    eventType: "gather" | "craft" | "sell",
    targetId: string,
    quantity = 1,
  ): ActionResult<readonly QuestProgressSnapshot[]> {
    if (!playerId) return { ok: false, reason: QuestFailReasons.MISSING_PLAYER };
    const safeQuantity = Math.max(0, Math.floor(Number(quantity)));
    if (safeQuantity <= 0) return { ok: true, result: Object.freeze([]) };
    const state = this.getOrCreatePlayerState(playerId);
    const updated: QuestProgressSnapshot[] = [];
    for (const [questId, active] of state.activeQuests) {
      const quest = this.questDefinitions.get(questId);
      if (!quest) continue;
      for (const objective of quest.objectives) {
        const matches = eventType === "craft"
          ? objective.eventType === "craft" && (objective.targetRecipeId === targetId || objective.targetItemId === targetId)
          : objective.eventType === eventType && objective.targetItemId === targetId;
        if (!matches) continue;
        const objectiveState = active.objectives.get(objective.objectiveId);
        if (!objectiveState || objectiveState.completed) continue;
        objectiveState.current = Math.min(objectiveState.required, objectiveState.current + safeQuantity);
        objectiveState.completed = objectiveState.current >= objectiveState.required;
      }
      const progress = this.getQuestProgress(playerId, questId);
      if (progress) updated.push(progress);
    }
    return { ok: true, result: Object.freeze(updated.sort((a, b) => a.questId.localeCompare(b.questId))) };
  }

  public updateTalkObjective(playerId: string, npcId: string): ActionResult<readonly QuestProgressSnapshot[]> {
    if (!playerId) return { ok: false, reason: QuestFailReasons.MISSING_PLAYER };
    const state = this.getOrCreatePlayerState(playerId);
    const updated: QuestProgressSnapshot[] = [];
    for (const [questId, active] of state.activeQuests) {
      const quest = this.questDefinitions.get(questId);
      if (!quest) continue;
      for (const objective of quest.objectives) {
        if (objective.eventType !== "talk" || objective.targetNpcId !== npcId) continue;
        const objectiveState = active.objectives.get(objective.objectiveId);
        if (!objectiveState || objectiveState.completed) continue;
        objectiveState.current = Math.min(objectiveState.required, objectiveState.current + 1);
        objectiveState.completed = objectiveState.current >= objectiveState.required;
      }
      const progress = this.getQuestProgress(playerId, questId);
      if (progress) updated.push(progress);
    }
    return { ok: true, result: Object.freeze(updated.sort((a, b) => a.questId.localeCompare(b.questId))) };
  }

  public completeQuest(playerId: string, questId: string): ActionResult<{
    questProgress: QuestProgressSnapshot;
    reward: QuestReward;
    reputation: NpcReputationSnapshot;
  }> {
    if (!playerId) return { ok: false, reason: QuestFailReasons.MISSING_PLAYER };
    const quest = this.questDefinitions.get(questId);
    if (!quest) return { ok: false, reason: QuestFailReasons.MISSING_QUEST };
    const state = this.getOrCreatePlayerState(playerId);
    const active = state.activeQuests.get(questId);
    if (!active) return { ok: false, reason: QuestFailReasons.QUEST_NOT_AVAILABLE };
    const complete = quest.objectives.every((objective) => active.objectives.get(objective.objectiveId)?.completed === true);
    if (!complete) return { ok: false, reason: QuestFailReasons.OBJECTIVE_NOT_COMPLETE };
    if (active.rewardClaimed || state.rewardClaimed.has(questId)) {
      return { ok: false, reason: QuestFailReasons.REWARD_ALREADY_CLAIMED };
    }
    active.rewardClaimed = true;
    state.activeQuests.delete(questId);
    state.completedQuestIds.add(questId);
    state.rewardClaimed.add(questId);
    const reputationState = this.getOrCreateNpcReputation(quest.npcId, playerId);
    reputationState.reputation += quest.reward.reputation;
    if (!reputationState.completedQuestIds.includes(questId)) reputationState.completedQuestIds.push(questId);
    reputationState.completedQuestIds.sort();
    return {
      ok: true,
      result: {
        questProgress: this.getQuestProgress(playerId, questId)!,
        reward: quest.reward,
        reputation: this.getNpcReputation(playerId, quest.npcId)!,
      },
    };
  }

  public getNpcDialogue(playerId: string, npcId: string): NpcDialogueSnapshot {
    const npc = this.npcDefinitions.get(npcId);
    const playerState = this.getOrCreatePlayerState(playerId);
    let dialogueState: NpcDialogueState = "quest_available";
    const active = [...playerState.activeQuests.values()].find(
      (candidate) => this.questDefinitions.get(candidate.questId)?.npcId === npcId,
    );
    if ([...playerState.completedQuestIds].some((questId) => this.questDefinitions.get(questId)?.npcId === npcId)) {
      dialogueState = "quest_completed";
    } else if (active) {
      const quest = this.questDefinitions.get(active.questId);
      const allComplete = quest?.objectives.every((objective) => active.objectives.get(objective.objectiveId)?.completed === true) ?? false;
      const gather = active.objectives.get("gather_wood_logs");
      const process = active.objectives.get("process_wood_plank");
      const sell = active.objectives.get("sell_wood_plank");
      if (allComplete) dialogueState = "quest_ready_to_complete";
      else if (sell?.completed || process?.completed) dialogueState = "quest_active_ready_to_sell";
      else if (gather?.completed) dialogueState = "quest_active_ready_to_process";
      else dialogueState = "quest_active_missing_wood";
    }
    const availableQuestIds = this.getAvailableQuests(playerId)
      .filter((quest) => this.questDefinitions.get(quest.questId)?.npcId === npcId)
      .map((quest) => quest.questId);
    const activeQuestIds = this.getActiveQuests(playerId)
      .filter((quest) => this.questDefinitions.get(quest.questId)?.npcId === npcId)
      .map((quest) => quest.questId);
    const completedQuestIds = [...playerState.completedQuestIds]
      .filter((questId) => this.questDefinitions.get(questId)?.npcId === npcId)
      .sort();
    return Object.freeze({
      npcId,
      displayName: npc?.displayName ?? "Unknown NPC",
      dialogueState,
      line: this.getDialogueLine(npcId, dialogueState),
      availableQuestIds: Object.freeze(availableQuestIds),
      activeQuestIds: Object.freeze(activeQuestIds),
      completedQuestIds: Object.freeze(completedQuestIds),
    });
  }

  private getDialogueLine(npcId: string, state: NpcDialogueState): string {
    if (npcId !== "village_trader_001") return "...";
    switch (state) {
      case "quest_available": return "Greetings, traveler! The village store needs wood planks. Gather two logs, process a plank, sell it to me, then return for confirmation.";
      case "quest_active_missing_wood": return "The supply order still needs two wood logs.";
      case "quest_active_ready_to_process": return "The logs are ready. Process a plank at the workbench.";
      case "quest_active_ready_to_sell": return "Complete the plank sale if it is still pending, then speak with me again to confirm the order.";
      case "quest_ready_to_complete": return "Every objective is confirmed. Claim the persisted reward when ready.";
      case "quest_completed": return "Your completed supply order is recorded.";
    }
  }

  public getNpcReputation(playerId: string, npcId: string): NpcReputationSnapshot | null {
    if (!this.npcDefinitions.has(npcId)) return null;
    const state = this.getOrCreateNpcReputation(npcId, playerId);
    return Object.freeze({
      npcId,
      playerId,
      reputation: state.reputation,
      completedQuestIds: Object.freeze([...state.completedQuestIds].sort()),
    });
  }

  public getAllNpcReputations(playerId: string): readonly NpcReputationSnapshot[] {
    return Object.freeze(
      [...this.npcDefinitions.keys()]
        .map((npcId) => this.getNpcReputation(playerId, npcId))
        .filter((snapshot): snapshot is NpcReputationSnapshot => snapshot !== null)
        .sort((a, b) => a.npcId.localeCompare(b.npcId)),
    );
  }

  public toQuestSnapshots(playerId: string): QuestSnapshot[] {
    const result: QuestSnapshot[] = [];
    for (const progress of this.getActiveQuests(playerId)) {
      const definition = this.questDefinitions.get(progress.questId);
      result.push({
        id: progress.questId,
        title: definition?.title ?? progress.questId,
        description: definition?.description ?? "",
        status: "active",
        objectives: progress.objectives.map((objective) => ({
          id: objective.objectiveId,
          label: objective.title,
          current: objective.current,
          required: objective.required,
          completed: objective.completed,
        })),
      });
    }
    for (const progress of this.getAvailableQuests(playerId)) {
      const definition = this.questDefinitions.get(progress.questId);
      result.push({
        id: progress.questId,
        title: definition?.title ?? progress.questId,
        description: definition?.description ?? "",
        status: "available",
        objectives: progress.objectives.map((objective) => ({
          id: objective.objectiveId,
          label: objective.title,
          current: 0,
          required: objective.required,
          completed: false,
        })),
      });
    }
    for (const questId of this.getCompletedQuestIds(playerId)) {
      const definition = this.questDefinitions.get(questId);
      result.push({
        id: questId,
        title: definition?.title ?? questId,
        description: definition?.description ?? "",
        status: "completed",
        objectives: [],
      });
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
  }

  public exportPlayerState(playerId: string): PersistedNpcQuestPlayerState {
    const state = this.getOrCreatePlayerState(playerId);
    const reputations = [...this.npcDefinitions.keys()].map((npcId) => {
      const reputation = this.getOrCreateNpcReputation(npcId, playerId);
      return {
        npcId,
        reputation: reputation.reputation,
        completedQuestIds: [...reputation.completedQuestIds].sort(),
      };
    });
    return normalizeNpcQuestPlayerState({
      schemaVersion: 1,
      playerId,
      activeQuests: [...state.activeQuests.values()].map((quest) => ({
        questId: quest.questId,
        rewardClaimed: quest.rewardClaimed,
        started: quest.started,
        objectives: [...quest.objectives.entries()].map(([objectiveId, objective]) => ({
          objectiveId,
          ...objective,
        })),
      })),
      completedQuestIds: [...state.completedQuestIds],
      rewardClaimedQuestIds: [...state.rewardClaimed],
      reputations,
    }, playerId);
  }

  public restorePlayerState(input: PersistedNpcQuestPlayerState): void {
    const state = normalizeNpcQuestPlayerState(input, input.playerId);
    const playerState = createEmptyPlayerState();
    for (const quest of state.activeQuests) {
      if (!this.questDefinitions.has(quest.questId)) continue;
      playerState.activeQuests.set(quest.questId, {
        questId: quest.questId,
        rewardClaimed: quest.rewardClaimed,
        started: quest.started,
        objectives: new Map(quest.objectives.map((objective) => [objective.objectiveId, {
          current: objective.current,
          required: objective.required,
          completed: objective.completed,
        }])),
      });
    }
    playerState.completedQuestIds = new Set(state.completedQuestIds.filter((id) => this.questDefinitions.has(id)));
    playerState.rewardClaimed = new Set(state.rewardClaimedQuestIds.filter((id) => this.questDefinitions.has(id)));
    this.playerQuestStates.set(state.playerId, playerState);
    for (const reputation of state.reputations) {
      if (!this.npcDefinitions.has(reputation.npcId)) continue;
      let npcStates = this.npcReputations.get(reputation.npcId);
      if (!npcStates) {
        npcStates = new Map();
        this.npcReputations.set(reputation.npcId, npcStates);
      }
      npcStates.set(state.playerId, {
        reputation: reputation.reputation,
        completedQuestIds: [...reputation.completedQuestIds],
      });
    }
  }

  public clonePlayerState(playerId: string): PersistedNpcQuestPlayerState {
    return this.exportPlayerState(playerId);
  }

  public resetPlayerState(playerId: string): void {
    this.playerQuestStates.delete(playerId);
    for (const states of this.npcReputations.values()) states.delete(playerId);
  }
}

export const npcQuestService = new NpcQuestService();
