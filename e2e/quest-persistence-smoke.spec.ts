/**
 * Quest Persistence Smoke E2E Tests
 *
 * Tests that quest state persists correctly through the API layer.
 * Uses in-process server state (not actual server restart).
 */

import { test, expect } from "@playwright/test";

test.describe("Quest persistence smoke", () => {
  test("quest state remains available through snapshot for same player", async ({ request }) => {
    const playerId = "persist-smoke-player";

    // Accept quest
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    // Talk to elder to complete first objective
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_talk",
        npcId: "town_elder",
      },
    });

    // Check snapshot - state should be persisted and restored
    const snapshot = await request.get(`/api/gameplay/snapshot?playerId=${playerId}`);
    expect(snapshot.ok()).toBeTruthy();

    const json = await snapshot.json();
    const quest = json.snapshot.quests.find((q: any) => q.id === "first_steps");
    const objective = quest.objectives.find((o: any) => o.id === "talk_to_elder");

    expect(quest.status).toBe("active");
    expect(objective.completed).toBe(true);
  });

  test("quest state is isolated by playerId", async ({ request }) => {
    const playerA = "persist-smoke-a";
    const playerB = "persist-smoke-b";

    // Accept quest for player A
    await request.post("/api/quest/event", {
      data: {
        playerId: playerA,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    // Check player B - should have available quest, not active
    const snapshotB = await request.get(`/api/gameplay/snapshot?playerId=${playerB}`);
    const jsonB = await snapshotB.json();
    const questB = jsonB.snapshot.quests.find((q: any) => q.id === "first_steps");

    expect(questB.status).toBe("available");
  });

  test("multiple events persist in correct order", async ({ request }) => {
    const playerId = "persist-smoke-multi";

    // Accept
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    // Talk to elder
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_talk",
        npcId: "town_elder",
      },
    });

    // Kill training dummy
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_kill",
        npcId: "training_dummy",
      },
    });

    // Final snapshot should show completed quest
    const snapshot = await request.get(`/api/gameplay/snapshot?playerId=${playerId}`);
    const json = await snapshot.json();
    const quest = json.snapshot.quests.find((q: any) => q.id === "first_steps");

    expect(quest.status).toBe("completed");
    expect(quest.objectives.every((o: any) => o.completed)).toBe(true);
  });

  test("state persists across multiple snapshot requests", async ({ request }) => {
    const playerId = "persist-smoke-repeat";

    // Setup state
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    // Multiple snapshot requests
    for (let i = 0; i < 3; i++) {
      const snapshot = await request.get(`/api/gameplay/snapshot?playerId=${playerId}`);
      const json = await snapshot.json();
      const quest = json.snapshot.quests.find((q: any) => q.id === "first_steps");

      expect(quest.status).toBe("active");
    }
  });
});