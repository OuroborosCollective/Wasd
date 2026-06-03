export type QuestStatus = "locked" | "available" | "active" | "completed";

export interface QuestObjective {
  id: string;
  label: string;
  current: number;
  required: number;
}

export interface QuestState {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
  objectives: QuestObjective[];
  tracked: boolean;
}

export type QuestEvent =
  | {
      type: "quest_snapshot";
      quests: QuestState[];
    }
  | {
      type: "quest_accept";
      questId: string;
    }
  | {
      type: "quest_progress";
      questId: string;
      objectiveId: string;
      current: number;
    }
  | {
      type: "quest_complete";
      questId: string;
    }
  | {
      type: "quest_track";
      questId: string;
    };

export function createInitialQuests(): QuestState[] {
  return [
    {
      id: "first_steps",
      title: "First Steps",
      description: "Learn the basics of movement, combat and interaction.",
      status: "available",
      tracked: true,
      objectives: [
        {
          id: "move",
          label: "Move around",
          current: 0,
          required: 1
        },
        {
          id: "use_skill",
          label: "Use a skill",
          current: 0,
          required: 1
        }
      ]
    }
  ];
}

export function getTrackedQuest(quests: QuestState[]): QuestState | null {
  return quests.find((quest) => quest.tracked) ?? null;
}

export function applyQuestEvent(
  quests: QuestState[],
  event: QuestEvent
): QuestState[] {
  if (event.type === "quest_snapshot") {
    return event.quests.map((quest) => ({
      ...quest,
      objectives: quest.objectives.map((objective) => ({ ...objective }))
    }));
  }

  if (event.type === "quest_track") {
    return quests.map((quest) => ({
      ...quest,
      tracked: quest.id === event.questId
    }));
  }

  if (event.type === "quest_accept") {
    return quests.map((quest) =>
      quest.id === event.questId && quest.status === "available"
        ? { ...quest, status: "active", tracked: true }
        : quest
    );
  }

  if (event.type === "quest_progress") {
    return quests.map((quest) => {
      if (quest.id !== event.questId) return quest;

      return {
        ...quest,
        objectives: quest.objectives.map((objective) =>
          objective.id === event.objectiveId
            ? {
                ...objective,
                current: Math.min(objective.required, event.current)
              }
            : objective
        )
      };
    });
  }

  if (event.type === "quest_complete") {
    return quests.map((quest) =>
      quest.id === event.questId
        ? {
            ...quest,
            status: "completed",
            objectives: quest.objectives.map((objective) => ({
              ...objective,
              current: objective.required
            }))
          }
        : quest
    );
  }

  return quests;
}