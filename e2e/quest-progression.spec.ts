/**
 * Quest Progression API E2E Tests
 *
 * Tests server-side quest progression via /api/quest/event.
 * Verifies that quest state progresses from available to completed.
 */

import { test, expect } from "@playwright/test";

test.describe("Quest progression API", () => {
  const playerId = "quest-e2e-guest";

  test.beforeEach(async ({ request }) => {
    // Reset quest state for each test by accepting and immediately
    // completing the quest, then starting fresh
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
  });

  test("first_steps is available for new player", async ({ request }) => {
    // Use a fresh player ID
    const freshPlayerId = "quest-e2e-new-player";

    const initial = await request.get(
      `/api/gameplay/snapshot?playerId=${freshPlayerId}`
    );
    expect(initial.ok()).toBeTruthy();

    const initialJson = await initial.json();
    expect(Array.isArray(initialJson.snapshot.quests)).toBe(true);

    const firstStepsInitial = initialJson.snapshot.quests.find(
      (q: any) => q.id === "first_steps"
    );
    expect(firstStepsInitial).toBeTruthy();
    expect(firstStepsInitial.status).toBe("available");
  });

  test("first_steps progresses from available to active on accept", async ({
    request,
  }) => {
    const freshPlayerId = "quest-e2e-accept-test";

    // Initial state should be available
    const initial = await request.get(
      `/api/gameplay/snapshot?playerId=${freshPlayerId}`
    );
    const initialJson = await initial.json();
    expect(initialJson.snapshot.quests.find((q: any) => q.id === "first_steps")?.status).toBe("available");

    // Accept quest
    const accept = await request.post("/api/quest/event", {
      data: {
        playerId: freshPlayerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });
    expect(accept.ok()).toBeTruthy();

    // Should now be active
    const afterAccept = await request.get(
      `/api/gameplay/snapshot?playerId=${freshPlayerId}`
    );
    const afterAcceptJson = await afterAccept.json();
    const activeQuest = afterAcceptJson.snapshot.quests.find(
      (q: any) => q.id === "first_steps"
    );
    expect(activeQuest.status).toBe("active");
  });

  test("npc_talk completes talk_to_elder objective", async ({ request }) => {
    const freshPlayerId = "quest-e2e-talk-test";

    // Accept quest first
    await request.post("/api/quest/event", {
      data: {
        playerId: freshPlayerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });

    // Talk to NPC
    const talk = await request.post("/api/quest/event", {
      data: {
        playerId: freshPlayerId,
        type: "npc_talk",
        npcId: "town_elder",
      },
    });
    expect(talk.ok()).toBeTruthy();

    // Check objective completed
    const afterTalk = await request.get(
      `/api/gameplay/snapshot?playerId=${freshPlayerId}`
    );
    const afterTalkJson = await afterTalk.json();
    const talkQuest = afterTalkJson.snapshot.quests.find(
      (q: any) => q.id === "first_steps"
    );
    const talkObjective = talkQuest.objectives.find(
      (o: any) => o.id === "talk_to_elder"
    );
    expect(talkObjective.completed).toBe(true);
    // Quest should still be active (one objective left)
    expect(talkQuest.status).toBe("active");
  });

  test("full progression: available -> active -> completed", async ({
    request,
  }) => {
    const freshPlayerId = "quest-e2e-full-progression";

    // Step 1: Initial - available
    const initial = await request.get(
      `/api/gameplay/snapshot?playerId=${freshPlayerId}`
    );
    const initialJson = await initial.json();
    expect(
      initialJson.snapshot.quests.find((q: any) => q.id === "first_steps")?.status
    ).toBe("available");

    // Step 2: Accept - active
    await request.post("/api/quest/event", {
      data: {
        playerId: freshPlayerId,
        type: "quest_accept",
        questId: "first_steps",
      },
    });
    const afterAccept = await request.get(
      `/api/gameplay/snapshot?playerId=${freshPlayerId}`
    );
    expect(
      (await afterAccept.json()).snapshot.quests.find(
        (q: any) => q.id === "first_steps"
      )?.status
    ).toBe("active");

    // Step 3: Talk to elder
    await request.post("/api/quest/event", {
      data: {
        playerId: freshPlayerId,
        type: "npc_talk",
        npcId: "town_elder",
      },
    });

    // Step 4: Kill training dummy - should complete quest
    await request.post("/api/quest/event", {
      data: {
        playerId: freshPlayerId,
        type: "npc_kill",
        npcId: "training_dummy",
      },
    });

    // Step 5: Verify completed
    const finalSnapshot = await request.get(
      `/api/gameplay/snapshot?playerId=${freshPlayerId}`
    );
    const finalJson = await finalSnapshot.json();
    const completedQuest = finalJson.snapshot.quests.find(
      (q: any) => q.id === "first_steps"
    );

    expect(completedQuest.status).toBe("completed");
    expect(
      completedQuest.objectives.every((o: any) => o.completed)
    ).toBe(true);
  });

  test("invalid quest event returns 400", async ({ request }) => {
    const res = await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "set_completed_directly",
        questId: "first_steps",
      },
    });

    expect(res.status()).toBe(400);
  });

  test("invalid event type returns 400", async ({ request }) => {
    const res = await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "invalid_event_type",
      },
    });

    expect(res.status()).toBe(400);
  });

  test("missing required fields returns 400", async ({ request }) => {
    const res = await request.post("/api/quest/event", {
      data: {
        playerId,
        type: "quest_accept",
        // missing questId
      },
    });

    expect(res.status()).toBe(400);
  });
});