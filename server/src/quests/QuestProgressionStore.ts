/**
 * QUEST PROGRESSION STORE
 *
 * Server-authoritative quest progression store with optional persistence.
 * Serves as integration anchor for server-side quest state.
 *
 * MVP Features:
 * - "first_steps" quest with accept, npc_talk, npc_kill events
 * - Deterministic progression - same events produce same state
 * - Player isolation by playerId
 * - Optional persistence via QuestPersistenceAdapter
 *
 * Status: PARTIAL
 * - In-memory with optional JSON-file or Postgres persistence
 * - NPC ID validation via allowlist for security
 *
 * Rules:
 * - No Date.now() for quest progression
 * - No Math.random()
 * - No client decides completion directly
 * - NPC ID must match objective target allowlist
 * - Persistence failures do not crash gameplay loop
 */

import {
  normalizeQuestSnapshot,
  sortQuestSnapshots,
  type PlayerQuestState,
  type QuestSnapshot,
} from "./QuestSnapshotTypes";
import {
  createPersistedQuestState,
  type QuestPersistenceAdapter,
} from "./QuestPersistence";
import { JsonQuestPersistenceAdapter } from "./JsonQuestPersistenceAdapter";
import { PgQuestPersistenceAdapter } from "./PgQuestPersistenceAdapter.js";

export type QuestEvent =
  | { type: "quest_accept"; playerId: string; questId: string }
  | { type: "npc_talk"; playerId: string; npcId: string }
  | { type: "npc_kill"; playerId: string; npcId: string }
  | { type: "item_pickup"; playerId: string; itemId: string; quantity: number };

const TOWN_ELDER_IDS = new Set([
  "town_elder",
  "npc_town_elder",
  "npc_1",
]);

const TRAINING_TARGET_IDS = new Set([
  "training_dummy",
  "npc_training_dummy",
  "dummy",
  "npc_2",
]);

const FIRST_STEPS_QUEST_ID = "first_steps";
const REWARD_CLAIMED_OBJECTIVE_ID = "reward_claimed";

function isTownElderNpc(npcId: string): boolean {
  return TOWN_ELDER_IDS.has(npcId);
}

function isTrainingTargetNpc(npcId: string): boolean {
  return TRAINING_TARGET_IDS.has(npcId);
}

function hasRewardClaimedObjective(quest: QuestSnapshot): boolean {
  return quest.objectives.some((objective) => objective.id === REWARD_CLAIMED_OBJECTIVE_ID && objective.completed);
}

function withRewardClaimedObjective(quest: QuestSnapshot): QuestSnapshot {
  if (hasRewardClaimedObjective(quest)) return quest;

  return normalizeQuestSnapshot({
    ...quest,
    status: "completed",
    objectives: [
      ...quest.objectives,
      {
        id: REWARD_CLAIMED_OBJECTIVE_ID,
        label: "Belohnung abgeholt",
        current: 1,
        required: 1,
        completed: true,
      },
    ],
  });
}

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

function createPersistenceAdapter(): QuestPersistenceAdapter {
  const driver = process.env.QUEST_PERSISTENCE_DRIVER ?? "json";

  if (driver === "postgres" && process.env.DATABASE_URL) {
    try {
      return new PgQuestPersistenceAdapter(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[quest-store] Failed to create Postgres adapter, falling back to JSON:", error);
      return new JsonQuestPersistenceAdapter();
    }
  }

  return new JsonQuestPersistenceAdapter();
}

export class QuestProgressionStore {
  private readonly playerQuests = new Map<string, Map<string, QuestSnapshot>>();
  private readonly hydratedPlayers = new Set<string>();

  constructor(private readonly persistence?: QuestPersistenceAdapter) {}

  async hydratePlayer(playerId: string): Promise<void> {
    if (!this.persistence || this.hydratedPlayers.has(playerId)) return;

    const persisted = await this.persistence.loadPlayerQuestState(playerId);
    if (persisted) {
      const map = new Map<string, QuestSnapshot>();
      for (const quest of persisted.quests) {
        map.set(quest.id, normalizeQuestSnapshot(quest));
      }
      this.playerQuests.set(playerId, map);
    }

    this.hydratedPlayers.add(playerId);
  }

  async flushPlayerForTests(playerId: string): Promise<void> {
    if (!this.persistence) return;

    const state = this.getPlayerQuestState(playerId);
    await this.persistence.savePlayerQuestState(
      createPersistedQuestState(playerId, state.quests),
    );
  }

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

  upsertDerivedQuestSnapshot(playerId: string, quest: QuestSnapshot): QuestSnapshot {
    const normalized = normalizeQuestSnapshot(quest);
    const existing = this.getOrCreatePlayerQuestMap(playerId).get(normalized.id);

    if (existing?.status === "completed") {
      return existing;
    }

    this.setQuest(playerId, normalized);
    void this.persistPlayerState(playerId);
    return normalized;
  }

  isQuestRewardClaimed(playerId: string, questId: string): boolean {
    const quest = this.getOrCreatePlayerQuestMap(playerId).get(questId);
    return quest ? hasRewardClaimedObjective(quest) : false;
  }

  markQuestRewardClaimed(playerId: string, questId: string): { ok: boolean; reason: string; quest?: QuestSnapshot } {
    const quests = this.getOrCreatePlayerQuestMap(playerId);
    const quest = quests.get(questId);

    if (!quest) {
      return { ok: false, reason: "quest_not_found" };
    }

    if (quest.status !== "completed") {
      return { ok: false, reason: "quest_not_completed", quest };
    }

    if (hasRewardClaimedObjective(quest)) {
      return { ok: false, reason: "reward_already_claimed", quest };
    }

    const claimedQuest = withRewardClaimedObjective(quest);
    this.setQuest(playerId, claimedQuest);
    void this.persistPlayerState(playerId);
    return { ok: true, reason: "reward_claimed", quest: claimedQuest };
  }

  applyEvent(event: QuestEvent): PlayerQuestState {
    if (event.type === "quest_accept") {
      this.acceptQuest(event.playerId, event.questId);
      void this.persistPlayerState(event.playerId);
      return this.getPlayerQuestState(event.playerId);
    }

    const state = this.getOrCreatePlayerQuestMap(event.playerId);
    let quest =
      state.get(FIRST_STEPS_QUEST_ID) ?? createFirstStepsQuest("active");

    if (quest.status === "available") {
      quest = { ...quest, status: "active" as const };
    }

    const objectives = quest.objectives.map((objective) => {
      if (
        event.type === "npc_talk" &&
        objective.id === "talk_to_elder" &&
        isTownElderNpc(event.npcId)
      ) {
        return {
          ...objective,
          current: 1,
          completed: true,
        };
      }

      if (
        event.type === "npc_kill" &&
        objective.id === "defeat_training_dummy" &&
        isTrainingTargetNpc(event.npcId)
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

    void this.persistPlayerState(event.playerId);

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

  private async persistPlayerState(playerId: string): Promise<void> {
    if (!this.persistence) return;

    try {
      const state = this.getPlayerQuestState(playerId);
      await this.persistence.savePlayerQuestState(
        createPersistedQuestState(playerId, state.quests),
      );
    } catch {
      // Never crash gameplay loop because persistence failed.
    }
  }

  getPersistenceInfo(): { driver: string; adapter: string } {
    const driver = process.env.QUEST_PERSISTENCE_DRIVER ?? "json";
    return {
      driver,
      adapter: this.persistence?.constructor?.name ?? "unknown",
    };
  }
}

export const questProgressionStore = new QuestProgressionStore(
  createPersistenceAdapter(),
);
