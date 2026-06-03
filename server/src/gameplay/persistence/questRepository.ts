/**
 * Phase 6: Quest Repository
 * 
 * Handles quest progress persistence with memory fallback.
 */

import type { PersistedQuestProgress } from "./types.js";

export interface QuestRepository {
  getQuests(playerId: string): Promise<PersistedQuestProgress[]>;
  saveQuests(playerId: string, quests: PersistedQuestProgress[]): Promise<void>;
}

/**
 * Memory-backed quest repository for development/degraded mode.
 */
export function createMemoryQuestRepository(): QuestRepository {
  const questsByPlayer = new Map<string, PersistedQuestProgress[]>();

  return {
    async getQuests(playerId) {
      return questsByPlayer.get(playerId)?.map((quest) => ({ ...quest })) ?? [];
    },

    async saveQuests(playerId, quests) {
      questsByPlayer.set(
        playerId,
        quests.map((quest) => ({ ...quest, playerId }))
      );
    }
  };
}