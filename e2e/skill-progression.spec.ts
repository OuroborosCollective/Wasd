/**
 * SKILL PROGRESSION E2E TESTS
 *
 * End-to-end tests for skill progression API and snapshot integration.
 * Tests the full flow from API to gameplay snapshot.
 */

import { test, expect } from "@playwright/test";

test.describe("Skill Progression API", () => {
  test("POST /api/skill/event adds XP to player", async ({ request }) => {
    const playerId = "skill-e2e-player-1";

    const response = await request.post(`/api/skill/event`, {
      data: {
        skillId: "combat",
        amount: 125,
      },
      params: { playerId },
    });

    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.playerId).toBe(playerId);
    expect(Array.isArray(json.skills)).toBe(true);

    const combat = json.skills.find((s: any) => s.id === "combat");
    expect(combat).toBeDefined();
    expect(combat.xp).toBeGreaterThanOrEqual(125);
    expect(combat.level).toBeGreaterThanOrEqual(1);
    expect(combat.title).toBe("Combat");
  });

  test("GET /api/skill/state returns current player skills", async ({ request }) => {
    const playerId = "skill-e2e-player-2";

    // First add some XP
    await request.post(`/api/skill/event`, {
      data: { skillId: "mining", amount: 200 },
      params: { playerId },
    });

    // Then get state
    const response = await request.get(`/api/skill/state`, {
      params: { playerId },
    });

    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.skills).toHaveLength(5);
    expect(json.skills.map((s: any) => s.id).sort()).toEqual([
      "combat",
      "crafting",
      "fishing",
      "mining",
      "woodcutting",
    ]);

    const mining = json.skills.find((s: any) => s.id === "mining");
    expect(mining.xp).toBeGreaterThanOrEqual(200);
  });

  test("rejects invalid skill ID", async ({ request }) => {
    const response = await request.post(`/api/skill/event`, {
      data: { skillId: "hacking", amount: 100 },
      params: { playerId: "bad-skill-test" },
    });

    expect(response.status()).toBe(400);
  });

  test("rejects amount over 5000", async ({ request }) => {
    const response = await request.post(`/api/skill/event`, {
      data: { skillId: "combat", amount: 9999 },
      params: { playerId: "over-cap-test" },
    });

    expect(response.status()).toBe(400);
  });

  test("rejects zero or negative amount", async ({ request }) => {
    const response = await request.post(`/api/skill/event`, {
      data: { skillId: "combat", amount: 0 },
      params: { playerId: "zero-amount-test" },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe("Skill in Gameplay Snapshot", () => {
  test("skills appear in gameplay snapshot after XP gain", async ({ request }) => {
    const playerId = "snapshot-skill-player";

    // Add XP via skill event
    const eventResponse = await request.post(`/api/skill/event`, {
      data: { skillId: "combat", amount: 500 },
      params: { playerId },
    });

    expect(eventResponse.ok()).toBeTruthy();

    // Get gameplay snapshot
    const snapshotResponse = await request.get(`/api/gameplay/snapshot`, {
      params: { playerId },
    });

    expect(snapshotResponse.ok()).toBeTruthy();

    const json = await snapshotResponse.json();
    expect(json.snapshot).toBeDefined();
    expect(json.snapshot.skills).toBeDefined();
    expect(Array.isArray(json.snapshot.skills)).toBe(true);

    // Should have all 5 skills
    expect(json.snapshot.skills).toHaveLength(5);

    // Combat should have accumulated XP
    const combat = json.snapshot.skills.find((s: any) => s.id === "combat");
    expect(combat).toBeDefined();
    expect(combat.xp).toBeGreaterThanOrEqual(500);
    expect(combat.level).toBeGreaterThanOrEqual(1);
    expect(combat.title).toBe("Combat");
  });

  test("new player starts with all skills at level 1", async ({ request }) => {
    const playerId = "new-skill-player-snapshot";

    const response = await request.get(`/api/gameplay/snapshot`, {
      params: { playerId },
    });

    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.snapshot.skills).toHaveLength(5);

    for (const skill of json.snapshot.skills) {
      expect(skill.level).toBe(1);
      expect(skill.xp).toBe(0);
    }
  });
});

test.describe("Skill Progression Isolation", () => {
  test("players have independent skill states", async ({ request }) => {
    const player1 = "isolation-p1";
    const player2 = "isolation-p2";

    // Add different XP to different skills
    await request.post(`/api/skill/event`, {
      data: { skillId: "combat", amount: 1000 },
      params: { playerId: player1 },
    });

    await request.post(`/api/skill/event`, {
      data: { skillId: "mining", amount: 500 },
      params: { playerId: player2 },
    });

    // Get snapshots
    const p1Snapshot = await request.get(`/api/gameplay/snapshot`, {
      params: { playerId: player1 },
    });
    const p2Snapshot = await request.get(`/api/gameplay/snapshot`, {
      params: { playerId: player2 },
    });

    const p1Json = await p1Snapshot.json();
    const p2Json = await p2Snapshot.json();

    // Player 1 should have high combat XP
    const p1Combat = p1Json.snapshot.skills.find((s: any) => s.id === "combat");
    expect(p1Combat.xp).toBeGreaterThanOrEqual(1000);

    // Player 2 should have high mining XP but no combat XP from their actions
    const p2Mining = p2Json.snapshot.skills.find((s: any) => s.id === "mining");
    expect(p2Mining.xp).toBeGreaterThanOrEqual(500);

    // Player 2's combat should not have gained XP from player 1's actions
    const p2Combat = p2Json.snapshot.skills.find((s: any) => s.id === "combat");
    expect(p2Combat.xp).toBe(0);
  });
});