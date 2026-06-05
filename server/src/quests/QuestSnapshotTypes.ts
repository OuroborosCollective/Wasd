/**
 * QUEST SNAPSHOT TYPES
 *
 * Server-side quest snapshot types for QuestProgressionStore.
 * Compatible with client LiveGameplaySnapshot types.
 *
 * Rules:
 * - No Date.now() for quest progression
 * - No Math.random()
 * - No mutation of input in normalizers
 * - Stable sort by id for determinism
 */

export type QuestStatus =
  | "available"
  | "active"
  | "completed"
  | "locked";

export interface QuestObjectiveSnapshot {
  id: string;
  label: string;
  current: number;
  required: number;
  completed: boolean;
}

export interface QuestSnapshot {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
  objectives: QuestObjectiveSnapshot[];
}

export interface PlayerQuestState {
  playerId: string;
  quests: QuestSnapshot[];
}

export const EMPTY_PLAYER_QUEST_STATE: PlayerQuestState = {
  playerId: "unknown",
  quests: [],
};

/**
 * Normalize a partial quest snapshot to a complete one.
 * Pure function - no mutation of input.
 */
export function normalizeQuestSnapshot(input: Partial<QuestSnapshot>): QuestSnapshot {
  const id = String(input.id ?? "unknown");
  const objectives = Array.isArray(input.objectives)
    ? input.objectives
        .map((objective) => ({
          id: String(objective.id ?? "unknown"),
          label: String(objective.label ?? objective.id ?? "Objective"),
          current: Math.max(0, Number(objective.current ?? 0)),
          required: Math.max(1, Number(objective.required ?? 1)),
          completed: Boolean(objective.completed),
        }))
        .sort((a, b) => a.id.localeCompare(b.id))
    : [];

  return {
    id,
    title: String(input.title ?? id),
    description: String(input.description ?? ""),
    status: input.status ?? "available",
    objectives,
  };
}

/**
 * Sort quest snapshots by id for deterministic output.
 */
export function sortQuestSnapshots(quests: QuestSnapshot[]): QuestSnapshot[] {
  return [...quests].sort((a, b) => a.id.localeCompare(b.id));
}