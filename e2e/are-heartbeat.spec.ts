import { test, expect } from "@playwright/test";

/**
 * E2E tests for ARE Heartbeat endpoint
 * 
 * Verifies:
 * - GET /api/are/heartbeat returns HTTP 200
 * - Response contains all required fields
 * - kappa is exactly 1000
 * - replayHash is deterministic/stable
 * - heartbeatStatus is "live"
 */

test.describe("ARE Heartbeat E2E", () => {
  test("ARE heartbeat returns deterministic live snapshot", async ({ request }) => {
    const res = await request.get("/api/are/heartbeat", { timeout: 30_000 });

    expect(
      res.status(),
      "ARE heartbeat should return HTTP 2xx"
    ).toBeGreaterThanOrEqual(200);
    expect(
      res.status(),
      "ARE heartbeat should return HTTP 2xx"
    ).toBeLessThan(300);

    const json = await res.json();

    // Required fields
    expect(typeof json.tickId).toBe("number");
    expect(json.kappa).toBe(1000);
    expect(typeof json.observerCount).toBe("number");
    expect(typeof json.replayHash).toBe("string");
    expect(json.replayHash.length).toBeGreaterThanOrEqual(8);
    expect(typeof json.serverTick).toBe("number");
    expect(json.heartbeatStatus).toBe("live");

    // tickId and serverTick should match
    expect(json.tickId).toBe(json.serverTick);
  });

  test("ARE heartbeat replayHash is stable for same tick", async ({ request }) => {
    // Fetch twice in quick succession
    const res1 = await request.get("/api/are/heartbeat", { timeout: 30_000 });
    const res2 = await request.get("/api/are/heartbeat", { timeout: 30_000 });

    expect(res1.status()).toBe(200);
    expect(res2.status()).toBe(200);

    const json1 = await res1.json();
    const json2 = await res2.json();

    // tickId should be the same (or tick advanced by at most 1)
    expect(
      json1.tickId === json2.tickId || json2.tickId === json1.tickId + 1,
      "tickId should not differ by more than 1 between calls"
    ).toBe(true);

    // If same tickId, replayHash must match
    if (json1.tickId === json2.tickId) {
      expect(json1.replayHash).toBe(json2.replayHash);
    }

    // kappa must always be 1000
    expect(json1.kappa).toBe(1000);
    expect(json2.kappa).toBe(1000);
  });

  test("ARE heartbeat responds within reasonable time", async ({ request }) => {
    const start = Date.now();
    const res = await request.get("/api/are/heartbeat", { timeout: 30_000 });
    const elapsed = Date.now() - start;

    expect(res.status()).toBe(200);
    expect(elapsed, "ARE heartbeat should respond quickly").toBeLessThan(5000);
  });

  test("ARE heartbeat kappa invariant is always 1000", async ({ request }) => {
    // Make multiple requests to verify kappa is always 1000
    for (let i = 0; i < 5; i++) {
      const res = await request.get("/api/are/heartbeat", { timeout: 30_000 });
      const json = await res.json();
      expect(json.kappa).toBe(1000);
    }
  });
});