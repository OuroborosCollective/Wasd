/**
 * QUEST PERSISTENCE CONTRACT TEST
 *
 * Verifies that persistence adapters fulfill the contract.
 * Run with different adapters to ensure compatibility.
 */

import { describe, expect, it } from "vitest";
import { JsonQuestPersistenceAdapter } from "../quests/JsonQuestPersistenceAdapter";
import type { QuestPersistenceAdapter } from "../quests/QuestPersistence";

/**
 * Contract tests that any QuestPersistenceAdapter must pass.
 */
export function runQuestPersistenceContractTests(
  name: string,
  createAdapter: () => Promise<QuestPersistenceAdapter>,
) {
  describe(name, () => {
    it("saves and loads normalized quest state", async () => {
      const adapter = await createAdapter();

      await adapter.savePlayerQuestState({
        playerId: "contract-test-player",
        schemaVersion: 1,
        quests: [
          {
            id: "first_steps",
            title: "First Steps",
            description: "Begin your journey.",
            status: "active",
            objectives: [
              {
                id: "talk_to_elder",
                label: "Talk to the Town Elder",
                current: 0,
                required: 1,
                completed: false,
              },
            ],
          },
        ],
      });

      const loaded = await adapter.loadPlayerQuestState("contract-test-player");
      expect(loaded).not.toBeNull();
      expect(loaded?.playerId).toBe("contract-test-player");
      expect(loaded?.quests[0]?.id).toBe("first_steps");
      expect(loaded?.quests[0]?.status).toBe("active");
    });

    it("returns null for non-existent player", async () => {
      const adapter = await createAdapter();

      const loaded = await adapter.loadPlayerQuestState("non-existent-player-xyz");
      expect(loaded).toBeNull();
    });

    it("overwrites existing state on save", async () => {
      const adapter = await createAdapter();

      // Save initial state
      await adapter.savePlayerQuestState({
        playerId: "overwrite-test-player",
        schemaVersion: 1,
        quests: [
          {
            id: "quest_a",
            title: "Quest A",
            description: "",
            status: "active",
            objectives: [],
          },
        ],
      });

      // Overwrite with new state
      await adapter.savePlayerQuestState({
        playerId: "overwrite-test-player",
        schemaVersion: 1,
        quests: [
          {
            id: "quest_b",
            title: "Quest B",
            description: "",
            status: "completed",
            objectives: [],
          },
        ],
      });

      const loaded = await adapter.loadPlayerQuestState("overwrite-test-player");
      expect(loaded?.quests).toHaveLength(1);
      expect(loaded?.quests[0]?.id).toBe("quest_b");
      expect(loaded?.quests[0]?.status).toBe("completed");
    });
  });
}

// Run JSON adapter tests
runQuestPersistenceContractTests("JsonQuestPersistenceAdapter", async () => {
  return new JsonQuestPersistenceAdapter("/tmp/quest-contract-test.json");
});