/**
 * QUEST PERSISTENCE INTERFACES
 *
 * Stable persistence contracts for server-authoritative quest state.
 * Ensures deterministic save/load behavior across server restarts.
 *
 * Rules:
 * - No Date.now()
 * - No Math.random()
 * - No mutation of input
 * - Stable sort by id for determinism
 * - schemaVersion explicit for future migrations
 */

import type { PlayerQuestState, QuestSnapshot } from "./QuestSnapshotTypes";

export interface PersistedQuestPlayerState {
  playerId: string;
  quests: QuestSnapshot[];
  schemaVersion: 1;
}

export interface QuestPersistenceAdapter {
  loadPlayerQuestState(playerId: string): Promise<PersistedQuestPlayerState | null>;
  savePlayerQuestState(state: PersistedQuestPlayerState): Promise<void>;
  loadAllPlayerQuestStates?(): Promise<PersistedQuestPlayerState[]>;
}

export function normalizePersistedQuestState(
  input: Partial<PersistedQuestPlayerState> | null | undefined,
  fallbackPlayerId: string,
): PersistedQuestPlayerState {
  const playerId = typeof input?.playerId === "string" && input.playerId.trim()
    ? input.playerId.trim()
    : fallbackPlayerId;

  const quests = Array.isArray(input?.quests)
    ? input.quests.map((quest) => ({
        ...quest,
        id: String(quest.id),
        title: String(quest.title ?? quest.id),
        description: String(quest.description ?? ""),
        status: quest.status ?? "available",
        objectives: Array.isArray(quest.objectives)
          ? quest.objectives.map((objective) => ({
              id: String(objective.id),
              label: String(objective.label ?? objective.id),
              current: Math.max(0, Number(objective.current ?? 0)),
              required: Math.max(1, Number(objective.required ?? 1)),
              completed: Boolean(objective.completed),
            })).sort((a, b) => a.id.localeCompare(b.id))
          : [],
      })).sort((a, b) => a.id.localeCompare(b.id))
    : [];

  return {
    playerId,
    quests,
    schemaVersion: 1,
  };
}

export function createPersistedQuestState(
  playerId: string,
  quests: QuestSnapshot[],
): PersistedQuestPlayerState {
  return normalizePersistedQuestState({
    playerId,
    quests,
    schemaVersion: 1,
  }, playerId);
}