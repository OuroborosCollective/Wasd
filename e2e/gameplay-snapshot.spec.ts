import { test, expect } from "@playwright/test";

/**
 * E2E tests for Gameplay Snapshot endpoint
 * 
 * Verifies:
 * - GET /api/gameplay/snapshot returns HTTP 200
 * - Response contains ok=true and snapshot object
 * - snapshot.status is "live" (server reachable)
 * - quests, guild, factions, map exist
 * - No fake data, honest empty/waiting states
 */

test.describe("Gameplay Snapshot E2E", () => {
  test("GET /api/gameplay/snapshot returns 200 with snapshot", async ({ request }) => {
    const res = await request.get("/api/gameplay/snapshot", { timeout: 30_000 });

    expect(
      res.status(),
      "Gameplay snapshot should return HTTP 2xx"
    ).toBeGreaterThanOrEqual(200);
    expect(
      res.status(),
      "Gameplay snapshot should return HTTP 2xx"
    ).toBeLessThan(300);

    const json = await res.json();

    // Response structure
    expect(json.ok).toBe(true);
    expect(json.snapshot).toBeDefined();
    expect(typeof json.snapshot).toBe("object");
  });

  test("snapshot contains all required top-level fields", async ({ request }) => {
    const res = await request.get("/api/gameplay/snapshot", { timeout: 30_000 });
    const json = await res.json();
    const snapshot = json.snapshot;

    // Required fields
    expect(snapshot.status).toBeDefined();
    expect(snapshot.serverTick).toBeDefined();
    expect(snapshot.quests).toBeDefined();
    expect(snapshot.guild).toBeDefined();
    expect(snapshot.factions).toBeDefined();
    expect(snapshot.map).toBeDefined();
  });

  test("snapshot.status is 'live' when server is reachable", async ({ request }) => {
    const res = await request.get("/api/gameplay/snapshot", { timeout: 30_000 });
    const json = await res.json();

    expect(json.snapshot.status).toBe("live");
  });

  test("quests is an array", async ({ request }) => {
    const res = await request.get("/api/gameplay/snapshot", { timeout: 30_000 });
    const json = await res.json();

    expect(Array.isArray(json.snapshot.quests)).toBe(true);
  });

  test("guild has correct structure", async ({ request }) => {
    const res = await request.get("/api/gameplay/snapshot", { timeout: 30_000 });
    const json = await res.json();
    const guild = json.snapshot.guild;

    // Guild structure
    expect(guild).toHaveProperty("id");
    expect(guild).toHaveProperty("name");
    expect(guild).toHaveProperty("memberCount");
    expect(guild).toHaveProperty("rank");
    expect(guild).toHaveProperty("villageEligible");

    // Types
    expect(typeof guild.memberCount).toBe("number");
    expect(typeof guild.villageEligible).toBe("boolean");
  });

  test("factions is an array", async ({ request }) => {
    const res = await request.get("/api/gameplay/snapshot", { timeout: 30_000 });
    const json = await res.json();

    expect(Array.isArray(json.snapshot.factions)).toBe(true);
  });

  test("map has correct structure", async ({ request }) => {
    const res = await request.get("/api/gameplay/snapshot", { timeout: 30_000 });
    const json = await res.json();
    const map = json.snapshot.map;

    // Map structure
    expect(map).toHaveProperty("regionName");
    expect(typeof map.regionName).toBe("string");
  });

  test("serverTick is a number", async ({ request }) => {
    const res = await request.get("/api/gameplay/snapshot", { timeout: 30_000 });
    const json = await res.json();

    expect(typeof json.snapshot.serverTick).toBe("number");
  });

  test("empty state is honest (no fake data)", async ({ request }) => {
    const res = await request.get("/api/gameplay/snapshot", { timeout: 30_000 });
    const json = await res.json();
    const snapshot = json.snapshot;

    // Honest empty state - guild should have null id when unclaimed
    if (snapshot.guild.id === null) {
      expect(snapshot.guild.name).toBeNull();
    }

    // No fake quest data
    for (const quest of snapshot.quests) {
      expect(quest).toHaveProperty("id");
      expect(quest).toHaveProperty("title");
      expect(quest).toHaveProperty("status");
    }

    // No fake faction data
    for (const faction of snapshot.factions) {
      expect(faction).toHaveProperty("id");
      expect(faction).toHaveProperty("name");
      expect(faction).toHaveProperty("standing");
    }
  });

  test("snapshot responds within reasonable time", async ({ request }) => {
    const start = Date.now();
    const res = await request.get("/api/gameplay/snapshot", { timeout: 30_000 });
    const elapsed = Date.now() - start;

    expect(res.status()).toBe(200);
    expect(elapsed, "Gameplay snapshot should respond quickly").toBeLessThan(5000);
  });
});