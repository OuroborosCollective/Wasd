import type { NpcDialogueState } from "./NpcQuestTypes.js";

export interface PersistedNpcQuestObjectiveState {
  readonly objectiveId: string;
  readonly current: number;
  readonly required: number;
  readonly completed: boolean;
}

export interface PersistedNpcQuestActiveState {
  readonly questId: string;
  readonly objectives: readonly PersistedNpcQuestObjectiveState[];
  readonly rewardClaimed: boolean;
  readonly started: boolean;
}

export interface PersistedNpcReputationState {
  readonly npcId: string;
  readonly reputation: number;
  readonly completedQuestIds: readonly string[];
}

export interface PersistedNpcQuestPlayerState {
  readonly schemaVersion: 1;
  readonly playerId: string;
  readonly activeQuests: readonly PersistedNpcQuestActiveState[];
  readonly completedQuestIds: readonly string[];
  readonly rewardClaimedQuestIds: readonly string[];
  readonly reputations: readonly PersistedNpcReputationState[];
  readonly lastDialogueState?: NpcDialogueState;
}

export interface NpcQuestPersistenceAdapter {
  loadPlayerState(playerId: string): Promise<PersistedNpcQuestPlayerState | null>;
  savePlayerState(state: PersistedNpcQuestPlayerState): Promise<void>;
}

function safeId(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_./-]{1,160}$/.test(trimmed) ? trimmed : fallback;
}

function safeIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const identifiers: string[] = [];
  for (const candidate of value) {
    const identifier = safeId(candidate, "");
    if (identifier) identifiers.push(identifier);
  }
  return [...new Set<string>(identifiers)].sort((a, b) => a.localeCompare(b));
}

function safeCount(value: unknown, minimum = 0): number {
  const count = Math.floor(Number(value));
  return Number.isSafeInteger(count) && count >= minimum ? count : minimum;
}

export function normalizeNpcQuestPlayerState(
  input: Partial<PersistedNpcQuestPlayerState> | null | undefined,
  fallbackPlayerId: string,
): PersistedNpcQuestPlayerState {
  const playerId = safeId(input?.playerId, fallbackPlayerId);
  const activeQuests: PersistedNpcQuestActiveState[] = Array.isArray(input?.activeQuests)
    ? input.activeQuests
        .map((quest): PersistedNpcQuestActiveState => ({
          questId: safeId(quest?.questId, "unknown_quest"),
          rewardClaimed: Boolean(quest?.rewardClaimed),
          started: Boolean(quest?.started),
          objectives: Array.isArray(quest?.objectives)
            ? quest.objectives
                .map((objective): PersistedNpcQuestObjectiveState => {
                  const required = Math.max(1, safeCount(objective?.required, 1));
                  const current = Math.min(required, safeCount(objective?.current));
                  return {
                    objectiveId: safeId(objective?.objectiveId, "unknown_objective"),
                    current,
                    required,
                    completed: Boolean(objective?.completed) || current >= required,
                  };
                })
                .sort((a, b) => a.objectiveId.localeCompare(b.objectiveId))
            : [],
        }))
        .filter((quest) => quest.questId !== "unknown_quest")
        .sort((a, b) => a.questId.localeCompare(b.questId))
    : [];

  const completedQuestIds = safeIdList(input?.completedQuestIds);
  const rewardClaimedQuestIds = safeIdList(input?.rewardClaimedQuestIds);
  const reputations: PersistedNpcReputationState[] = Array.isArray(input?.reputations)
    ? input.reputations
        .map((entry): PersistedNpcReputationState => ({
          npcId: safeId(entry?.npcId, "unknown_npc"),
          reputation: Math.trunc(Number(entry?.reputation ?? 0)),
          completedQuestIds: safeIdList(entry?.completedQuestIds),
        }))
        .filter((entry) => entry.npcId !== "unknown_npc")
        .sort((a, b) => a.npcId.localeCompare(b.npcId))
    : [];

  return Object.freeze({
    schemaVersion: 1 as const,
    playerId,
    activeQuests: Object.freeze(activeQuests.map((quest) => Object.freeze({
      ...quest,
      objectives: Object.freeze(quest.objectives.map((objective) => Object.freeze(objective))),
    }))),
    completedQuestIds: Object.freeze(completedQuestIds),
    rewardClaimedQuestIds: Object.freeze(rewardClaimedQuestIds),
    reputations: Object.freeze(reputations.map((entry) => Object.freeze({
      ...entry,
      completedQuestIds: Object.freeze([...entry.completedQuestIds]),
    }))),
    ...(input?.lastDialogueState ? { lastDialogueState: input.lastDialogueState } : {}),
  });
}
