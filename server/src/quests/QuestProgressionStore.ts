/**
 * QUEST PROGRESSION STORE
 *
 * Minimal in-memory quest progression store.
 * Serves as integration anchor for server-side quest state.
 *
 * MVP Features:
 * - "first_steps" quest with accept, npc_talk, npc_kill events
 * - Deterministic progression - same events produce same state
 * - Player isolation by playerId
 *
 * Status: PARTIAL
 * - In-memory only, no persistence
 * - Later: connect to persistent storage
 * - Later: connect real NPC/combat hooks
 *
 * Rules:
 * - No Date.now() for quest progression
 * - No Math.random()
 * - No client decides completion directly
 */

import {
  normalizeQuestSnapshot,
  sortQuestSnapshots,
  type PlayerQuestState,
  type QuestSnapshot,
} from "./QuestSnapshotTypes";

export type QuestEvent =
  | { type: "quest_accept"; playerId: string; questId: string }
  | { type: "npc_talk"; playerId: string; npcId: string }
  | { type: "npc_kill"; playerId: string; npcId: string }
  | { type: "item_pickup"; playerId: string; itemId: string; quantity: number };

const FIRST_STEPS_QUEST_ID = "first_steps";

function createFirstStepsQuest(
  status: QuestSnapshot["status"] = "available"
): QuestSnapshot {
  return normalizeQuestSnapshot({
    id: FIRST_STEPS_QUEST_ID,
    title: "First Steps",
    description: "Begin your journey in Areloria.",
    status,
    objectives: [
      {
        id: "talk_to_elder",
        label: "Talk to the Town Elder",
        current: 0,
        required: 1,
        completed: false,
      },
      {
        id: "defeat_training_dummy",
        label: "Defeat a training enemy",
        current: 0,
        required: 1,
        completed: false,
      },
    ],
  });
}

export class QuestProgressionStore {
  private readonly playerQuests = new Map<string, Map<string, QuestSnapshot>>();

  getPlayerQuestState(playerId: string): PlayerQuestState {
    const quests = this.playerQuests.get(playerId);

    if (!quests) {
      return {
        playerId,
        quests: [createFirstStepsQuest("available")],
      };
    }

    return {
      playerId,
      quests: sortQuestSnapshots([...quests.values()]),
    };
  }

  acceptQuest(playerId: string, questId: string): QuestSnapshot {
    const quest =
      questId === FIRST_STEPS_QUEST_ID
        ? createFirstStepsQuest("active")
        : normalizeQuestSnapshot({
            id: questId,
            title: questId,
            status: "active",
            objectives: [],
          });

    this.setQuest(playerId, quest);
    return quest;
  }

  applyEvent(event: QuestEvent): PlayerQuestState {
    if (event.type === "quest_accept") {
      this.acceptQuest(event.playerId, event.questId);
      return this.getPlayerQuestState(event.playerId);
    }

    const state = this.getOrCreatePlayerQuestMap(event.playerId);
    let quest =
      state.get(FIRST_STEPS_QUEST_ID) ?? createFirstStepsQuest("active");

    // Auto-activate if available
    if (quest.status === "available") {
      quest = { ...quest, status: "active" as const };
    }

    const objectives = quest.objectives.map((objective) => {
      if (
        event.type === "npc_talk" &&
        objective.id === "talk_to_elder"
      ) {
        return {
          ...objective,
          current: 1,
          completed: true,
        };
      }

      if (
        event.type === "npc_kill" &&
        objective.id === "defeat_training_dummy"
      ) {
        return {
          ...objective,
          current: 1,
          completed: true,
        };
      }

      return objective;
    });

    const completed =
      objectives.length > 0 && objectives.every((o) => o.completed);

    this.setQuest(event.playerId, {
      ...quest,
      status: completed ? "completed" : "active",
      objectives,
    });

    return this.getPlayerQuestState(event.playerId);
  }

  private setQuest(playerId: string, quest: QuestSnapshot): void {
    const quests = this.getOrCreatePlayerQuestMap(playerId);
    quests.set(quest.id, normalizeQuestSnapshot(quest));
  }

  private getOrCreatePlayerQuestMap(
    playerId: string
  ): Map<string, QuestSnapshot> {
    let quests = this.playerQuests.get(playerId);
    if (!quests) {
      quests = new Map();
      quests.set(FIRST_STEPS_QUEST_ID, createFirstStepsQuest("available"));
      this.playerQuests.set(playerId, quests);
    }
    return quests;
  }
}

export const questProgressionStore = new QuestProgressionStore();