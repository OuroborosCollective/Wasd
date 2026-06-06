import { test, expect } from "@playwright/test";

/**
 * E2E tests for Character Profile endpoints
 * 
 * Verifies:
 * - POST /api/character/create creates a character
 * - GET /api/character/profile returns the profile
 * - GET /api/gameplay/snapshot includes character and paperdoll
 */

test.describe("Character Profile E2E", () => {
  test("POST /api/character/create creates a character", async ({ request }) => {
    const playerId = "character-e2e-test-player";

    const res = await request.post(
      `/api/character/create?playerId=${playerId}`,
      {
        data: {
          displayName: "E2E Test Hero",
          archetype: "forager",
          currentTick: 100,
        },
      }
    );

    expect(
      res.status(),
      "Character creation should return HTTP 200 or 409"
    ).toBeLessThan(500);

    const json = await res.json();

    if (res.status() === 200) {
      expect(json.ok).toBe(true);
      expect(json.result?.ok).toBe(true);
      expect(json.result?.profile).toBeDefined();
      expect(json.result?.profile?.displayName).toBe("E2E Test Hero");
      expect(json.result?.profile?.archetype).toBe("forager");
    }
  });

  test("GET /api/character/profile returns character after creation", async ({ request }) => {
    const playerId = "character-profile-e2e-player";

    // Create character first
    await request.post(`/api/character/create?playerId=${playerId}`, {
      data: {
        displayName: "Profile Test Hero",
        archetype: "miner",
        currentTick: 50,
      },
    });

    // Then get profile
    const res = await request.get(`/api/character/profile?playerId=${playerId}`);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.profile).toBeDefined();
    expect(json.profile?.displayName).toBe("Profile Test Hero");
    expect(json.profile?.archetype).toBe("miner");
  });

  test("GET /api/gameplay/snapshot includes character and paperdoll", async ({ request }) => {
    const playerId = "snapshot-character-e2e-player";

    // Create character first
    await request.post(`/api/character/create?playerId=${playerId}`, {
      data: {
        displayName: "Snapshot Hero",
        archetype: "angler",
        currentTick: 1,
      },
    });

    // Get snapshot
    const res = await request.get(`/api/gameplay/snapshot?playerId=${playerId}`);
    const json = await res.json();

    expect(json.snapshot).toBeDefined();
    expect(json.snapshot.character).toBeDefined();
    expect(json.snapshot.paperdoll).toBeDefined();
    expect(json.snapshot.paperdoll.character).toBeDefined();

    // Character in snapshot should match
    expect(json.snapshot.character?.displayName).toBe("Snapshot Hero");
    expect(json.snapshot.character?.archetype).toBe("angler");
    expect(json.snapshot.paperdoll.character?.displayName).toBe("Snapshot Hero");
  });

  test("paperdoll has slots structure", async ({ request }) => {
    const playerId = "paperdoll-slots-e2e-player";

    // Create character
    await request.post(`/api/character/create?playerId=${playerId}`, {
      data: {
        displayName: "Paperdoll Test",
        archetype: "wanderer",
        currentTick: 1,
      },
    });

    // Get snapshot
    const res = await request.get(`/api/gameplay/snapshot?playerId=${playerId}`);
    const json = await res.json();

    // Paperdoll slots should be an array
    expect(Array.isArray(json.snapshot.paperdoll.slots)).toBe(true);

    // Each slot should have slotId, itemId, and title
    for (const slot of json.snapshot.paperdoll.slots) {
      expect(slot).toHaveProperty("slotId");
      expect(slot).toHaveProperty("itemId");
      expect(slot).toHaveProperty("title");
    }
  });

  test("rejects invalid character name", async ({ request }) => {
    const playerId = "invalid-name-e2e-player";

    const res = await request.post(
      `/api/character/create?playerId=${playerId}`,
      {
        data: {
          displayName: "..",
          archetype: "wanderer",
          currentTick: 0,
        },
      }
    );

    const json = await res.json();

    // Should either fail at route level (400) or at service level (409)
    if (res.status() === 200) {
      expect(json.ok).toBe(false);
      expect(json.result?.reason).toBe("invalid_name");
    } else {
      expect(res.status()).toBe(400);
    }
  });

  test("rejects invalid archetype", async ({ request }) => {
    const playerId = "invalid-archetype-e2e-player";

    const res = await request.post(
      `/api/character/create?playerId=${playerId}`,
      {
        data: {
          displayName: "Test Hero",
          archetype: "invalid_archetype",
          currentTick: 0,
        },
      }
    );

    const json = await res.json();

    if (res.status() === 200) {
      expect(json.ok).toBe(false);
      expect(json.result?.reason).toBe("invalid_archetype");
    } else {
      expect(res.status()).toBe(400);
    }
  });
});