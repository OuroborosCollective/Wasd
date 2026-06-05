/**
 * Quest Gameplay Hooks E2E Tests
 *
 * Tests that NPC interaction and NPC kill events properly trigger
 * quest progression through the QuestGameplayEventBridge.
 *
 * Verifies:
 * - Wrong NPCs do not progress quest objectives
 * - Correct NPCs do progress quest objectives
 * - Quest completion is server-authoritative
 */

import { test, expect } from "@playwright/test";

test.describe("Quest gameplay hooks", () => {
  test("wrong npc interaction does not complete town elder objective", async ({
    request,
  }) => {
    const playerId = "wrong-npc-e2e";

    // Accept quest first
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    // Try talking to wrong NPC
    const wrong = await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_talk",
        npcId: "random_merchant",
      },
    });

    expect(wrong.ok()).toBeTruthy();

    // Check objective NOT completed
    const snapshot = await request.get(
      `/api/gameplay/snapshot?playerId=${playerId}`
    );
    const json = await snapshot.json();

    const quest = json.snapshot.quests.find((q: any) => q.id === "first_steps");
    const objective = quest.objectives.find((o: any) => o.id === "talk_to_elder");

    expect(objective.completed).toBe(false);
  });

  test("correct npc interaction completes town elder objective", async ({
    request,
  }) => {
    const playerId = "correct-npc-e2e";

    // Accept quest first
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    // Talk to correct NPC (town_elder)
    const talk = await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_talk",
        npcId: "town_elder",
      },
    });

    expect(talk.ok()).toBeTruthy();

    // Check objective IS completed
    const snapshot = await request.get(
      `/api/gameplay/snapshot?playerId=${playerId}`
    );
    const json = await snapshot.json();

    const quest = json.snapshot.quests.find((q: any) => q.id === "first_steps");
    const objective = quest.objectives.find((o: any) => o.id === "talk_to_elder");

    expect(objective.completed).toBe(true);
  });

  test("wrong npc kill does not complete training dummy objective", async ({
    request,
  }) => {
    const playerId = "wrong-kill-e2e";

    // Accept quest first
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    // Try killing wrong NPC
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_kill",
        npcId: "friendly_vendor",
      },
    });

    // Check objective NOT completed
    const snapshot = await request.get(
      `/api/gameplay/snapshot?playerId=${playerId}`
    );
    const json = await snapshot.json();

    const quest = json.snapshot.quests.find((q: any) => q.id === "first_steps");
    const objective = quest.objectives.find(
      (o: any) => o.id === "defeat_training_dummy"
    );

    expect(objective.completed).toBe(false);
  });

  test("correct npc kill completes training dummy objective", async ({
    request,
  }) => {
    const playerId = "correct-kill-e2e";

    // Accept quest first
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    // Kill correct NPC (training_dummy)
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_kill",
        npcId: "training_dummy",
      },
    });

    // Check objective IS completed
    const snapshot = await request.get(
      `/api/gameplay/snapshot?playerId=${playerId}`
    );
    const json = await snapshot.json();

    const quest = json.snapshot.quests.find((q: any) => q.id === "first_steps");
    const objective = quest.objectives.find(
      (o: any) => o.id === "defeat_training_dummy"
    );

    expect(objective.completed).toBe(true);
  });

  test("npc_talk with npc_1 completes talk objective", async ({
    request,
  }) => {
    const playerId = "npc-1-e2e";

    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_talk",
        npcId: "npc_1",
      },
    });

    const snapshot = await request.get(
      `/api/gameplay/snapshot?playerId=${playerId}`
    );
    const json = await snapshot.json();

    const quest = json.snapshot.quests.find((q: any) => q.id === "first_steps");
    const objective = quest.objectives.find((o: any) => o.id === "talk_to_elder");

    expect(objective.completed).toBe(true);
  });

  test("npc_kill with npc_2 completes kill objective", async ({ request }) => {
    const playerId = "npc-2-e2e";

    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_kill",
        npcId: "npc_2",
      },
    });

    const snapshot = await request.get(
      `/api/gameplay/snapshot?playerId=${playerId}`
    );
    const json = await snapshot.json();

    const quest = json.snapshot.quests.find((q: any) => q.id === "first_steps");
    const objective = quest.objectives.find(
      (o: any) => o.id === "defeat_training_dummy"
    );

    expect(objective.completed).toBe(true);
  });

  test("full quest completion through correct NPC interactions", async ({
    request,
  }) => {
    const playerId = "full-completion-e2e";

    // Accept quest
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    // Complete both objectives
    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_talk",
        npcId: "town_elder",
      },
    });

    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_kill",
        npcId: "training_dummy",
      },
    });

    // Verify quest is completed
    const snapshot = await request.get(
      `/api/gameplay/snapshot?playerId=${playerId}`
    );
    const json = await snapshot.json();

    const quest = json.snapshot.quests.find((q: any) => q.id === "first_steps");

    expect(quest.status).toBe("completed");
    expect(quest.objectives.every((o: any) => o.completed)).toBe(true);
  });

  test("shop_keeper does not trigger quest progress", async ({ request }) => {
    const playerId = "shop-keeper-e2e";

    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "npc_talk",
        npcId: "shop_keeper",
      },
    });

    const snapshot = await request.get(
      `/api/gameplay/snapshot?playerId=${playerId}`
    );
    const json = await snapshot.json();

    const quest = json.snapshot.quests.find((q: any) => q.id === "first_steps");
    const objective = quest.objectives.find((o: any) => o.id === "talk_to_elder");

    expect(objective.completed).toBe(false);
  });
});