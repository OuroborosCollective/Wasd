/**
 * Quest Persistence Unit Tests
 *
 * Deterministic tests for JSON file persistence adapter.
 * Verifies save/load behavior with stable sorting.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describe, expect, it, afterEach } from "vitest";
import { normalizePersistedQuestState } from "../quests/QuestPersistence.js";
import { JsonQuestPersistenceAdapter } from "../quests/JsonQuestPersistenceAdapter.js";
import { createPersistedQuestState } from "../quests/QuestPersistence.js";

const cleanupPaths: string[] = [];

async function createTestFile(testName: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `wasd-quest-${testName}-`));
  cleanupPaths.push(dir);
  return path.join(dir, "quest-state.json");
}

afterEach(async () => {
  while (cleanupPaths.length) {
    const target = cleanupPaths.pop()!;
    await rm(target, { recursive: true, force: true });
  }
});

describe("JsonQuestPersistenceAdapter", () => {
  describe("loadPlayerQuestState", () => {
    it("returns null for missing player", async () => {
      const adapter = new JsonQuestPersistenceAdapter(await createTestFile("missing"));
      await expect(adapter.loadPlayerQuestState("p1")).resolves.toBeNull();
    });

    it("returns null for empty file", async () => {
      const file = await createTestFile("empty-file");
      const adapter = new JsonQuestPersistenceAdapter(file);
      await expect(adapter.loadPlayerQuestState("p1")).resolves.toBeNull();
    });
  });

  describe("savePlayerQuestState", () => {
    it("saves and loads player quest state", async () => {
      const adapter = new JsonQuestPersistenceAdapter(await createTestFile("save-load"));

      await adapter.savePlayerQuestState(createPersistedQuestState("p1", [
        {
          id: "first_steps",
          title: "First Steps",
          description: "Begin.",
          status: "active",
          objectives: [
            {
              id: "talk_to_elder",
              label: "Talk",
              current: 1,
              required: 1,
              completed: true,
            },
          ],
        },
      ]));

      const loaded = await adapter.loadPlayerQuestState("p1");

      expect(loaded?.playerId).toBe("p1");
      expect(loaded?.quests[0]?.id).toBe("first_steps");
      expect(loaded?.quests[0]?.objectives[0]?.completed).toBe(true);
    });

    it("updates existing player state", async () => {
      const file = await createTestFile("update");
      const adapter = new JsonQuestPersistenceAdapter(file);

      // First save
      await adapter.savePlayerQuestState(createPersistedQuestState("p1", [
        {
          id: "first_steps",
          title: "First Steps",
          description: "",
          status: "active",
          objectives: [
            {
              id: "talk_to_elder",
              label: "Talk",
              current: 0,
              required: 1,
              completed: false,
            },
          ],
        },
      ]));

      // Second save with updated state
      await adapter.savePlayerQuestState(createPersistedQuestState("p1", [
        {
          id: "first_steps",
          title: "First Steps",
          description: "",
          status: "active",
          objectives: [
            {
              id: "talk_to_elder",
              label: "Talk",
              current: 1,
              required: 1,
              completed: true,
            },
          ],
        },
      ]));

      const loaded = await adapter.loadPlayerQuestState("p1");
      expect(loaded?.quests[0]?.objectives[0]?.completed).toBe(true);
      // Should only have one player entry
      const all = await adapter.loadAllPlayerQuestStates?.();
      expect(all?.length).toBe(1);
    });

    it("preserves multiple players independently", async () => {
      const file = await createTestFile("multi-player");
      const adapter = new JsonQuestPersistenceAdapter(file);

      await adapter.savePlayerQuestState(createPersistedQuestState("player_a", [
        {
          id: "quest_a",
          title: "Quest A",
          description: "",
          status: "active",
          objectives: [],
        },
      ]));

      await adapter.savePlayerQuestState(createPersistedQuestState("player_b", [
        {
          id: "quest_b",
          title: "Quest B",
          description: "",
          status: "active",
          objectives: [],
        },
      ]));

      const loadedA = await adapter.loadPlayerQuestState("player_a");
      const loadedB = await adapter.loadPlayerQuestState("player_b");

      expect(loadedA?.quests[0]?.id).toBe("quest_a");
      expect(loadedB?.quests[0]?.id).toBe("quest_b");
    });
  });

  describe("loadAllPlayerQuestStates", () => {
    it("returns empty array for no players", async () => {
      const adapter = new JsonQuestPersistenceAdapter(await createTestFile("no-players"));
      const all = await adapter.loadAllPlayerQuestStates?.();
      expect(all).toEqual([]);
    });

    it("sorts players deterministically by playerId", async () => {
      const adapter = new JsonQuestPersistenceAdapter(await createTestFile("sort"));

      await adapter.savePlayerQuestState(createPersistedQuestState("z-player", []));
      await adapter.savePlayerQuestState(createPersistedQuestState("a-player", [
        {
          id: "b_quest",
          title: "B",
          description: "",
          status: "active",
          objectives: [],
        },
        {
          id: "a_quest",
          title: "A",
          description: "",
          status: "active",
          objectives: [],
        },
      ]));

      const all = await adapter.loadAllPlayerQuestStates?.();

      expect(all?.map((p) => p.playerId)).toEqual(["a-player", "z-player"]);
      expect(all?.[0]?.quests.map((q) => q.id)).toEqual(["a_quest", "b_quest"]);
    });
  });

  describe("corrupt JSON handling", () => {
    it("ignores corrupt json without crashing", async () => {
      const file = await createTestFile("corrupt");
      const adapter = new JsonQuestPersistenceAdapter(file);

      // Write invalid data
      await writeFile(file, "{not-json", "utf8");

      await expect(adapter.loadPlayerQuestState("p1")).resolves.toBeNull();
    });

    it("ignores malformed players array without crashing", async () => {
      const file = await createTestFile("malformed");
      const adapter = new JsonQuestPersistenceAdapter(file);

      // Write malformed data
      await writeFile(file, '{"schemaVersion":1,"players":"not-an-array"}', "utf8");

      await expect(adapter.loadPlayerQuestState("p1")).resolves.toBeNull();
    });

    it("normalizes partial quest data", async () => {
      const file = await createTestFile("normalize");
      const adapter = new JsonQuestPersistenceAdapter(file);

      // Write partial data
      await writeFile(file, JSON.stringify({
        schemaVersion: 1,
        players: [{
          playerId: "p1",
          quests: [{
            id: "test",
            // missing title, description, etc.
            objectives: [{
              id: "obj1",
              // missing label, etc.
            }],
          }],
        }],
      }), "utf8");

      const loaded = await adapter.loadPlayerQuestState("p1");

      expect(loaded?.playerId).toBe("p1");
      expect(loaded?.quests[0]?.title).toBe("test");
      expect(loaded?.quests[0]?.objectives[0]?.label).toBe("obj1");
    });
  });

  describe("determinism", () => {
    it("sorts objectives by id within quests", async () => {
      const file = await createTestFile("obj-sort");
      const adapter = new JsonQuestPersistenceAdapter(file);

      await adapter.savePlayerQuestState(createPersistedQuestState("p1", [
        {
          id: "quest_z",
          title: "Z",
          description: "",
          status: "active",
          objectives: [
            { id: "z_obj", label: "Z", current: 0, required: 1, completed: false },
            { id: "a_obj", label: "A", current: 0, required: 1, completed: false },
            { id: "m_obj", label: "M", current: 0, required: 1, completed: false },
          ],
        },
      ]));

      const loaded = await adapter.loadPlayerQuestState("p1");
      const objectiveIds = loaded?.quests[0]?.objectives.map((o) => o.id);

      expect(objectiveIds).toEqual(["a_obj", "m_obj", "z_obj"]);
    });

    it("sorts quests by id within player state", async () => {
      const file = await createTestFile("quest-sort");
      const adapter = new JsonQuestPersistenceAdapter(file);

      await adapter.savePlayerQuestState(createPersistedQuestState("p1", [
        { id: "z_quest", title: "Z", description: "", status: "active", objectives: [] },
        { id: "a_quest", title: "A", description: "", status: "active", objectives: [] },
      ]));

      const loaded = await adapter.loadPlayerQuestState("p1");
      const questIds = loaded?.quests.map((q) => q.id);

      expect(questIds).toEqual(["a_quest", "z_quest"]);
    });
  });
});

describe("createPersistedQuestState", () => {
  it("creates valid persisted state from quest snapshots", () => {
    const state = createPersistedQuestState("player1", [
      {
        id: "test_quest",
        title: "Test",
        description: "Test description",
        status: "active",
        objectives: [],
      },
    ]);

    expect(state.playerId).toBe("player1");
    expect(state.quests.length).toBe(1);
    expect(state.schemaVersion).toBe(1);
  });

  it("normalizes empty playerId to fallback", () => {

    const normalized = normalizePersistedQuestState({}, "fallback-id");

    expect(normalized.playerId).toBe("fallback-id");
  });
});