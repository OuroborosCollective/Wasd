/**
 * E2E tests for Live Gameplay Snapshot Contract
 *
 * Verifies the deterministic server-authoritative snapshot contract
 * for inventory, equipment, skills, and resource nodes.
 */

import { test, expect } from "@playwright/test";

test.describe("Live Gameplay Snapshot", () => {
  test("snapshot endpoint exposes deterministic gameplay contract", async ({ request }) => {
    const playerId = "e2e-snapshot-player";
    const res = await request.get("/api/gameplay/snapshot", {
      params: { playerId },
    });

    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const snapshot = body.data?.snapshot ?? body.snapshot ?? body.data ?? body;

    expect(snapshot.schemaVersion).toBe("live-gameplay-snapshot.v1");
    expect(snapshot.playerId).toBeTruthy();
    expect(snapshot.tickRateHz).toBe(10);
    expect(snapshot.tickMs).toBe(100);

    expect(Array.isArray(snapshot.inventory)).toBeTruthy();
    expect(Array.isArray(snapshot.equipment)).toBeTruthy();
    expect(Array.isArray(snapshot.skills)).toBeTruthy();
    expect(Array.isArray(snapshot.resourceNodes)).toBeTruthy();
  });

  test("snapshot exposes equipmentStats from server", async ({ request }) => {
    const playerId = "e2e-equip-stats-player";
    const res = await request.get("/api/gameplay/snapshot", {
      params: { playerId },
    });

    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const snapshot = body.data?.snapshot ?? body.snapshot ?? body.data ?? body;

    // equipmentStats must be present and contain all stat keys
    expect(snapshot.equipmentStats).toBeDefined();
    expect(typeof snapshot.equipmentStats.attackPower).toBe("number");
    expect(typeof snapshot.equipmentStats.defense).toBe("number");
    expect(typeof snapshot.equipmentStats.maxHealth).toBe("number");
    expect(typeof snapshot.equipmentStats.maxStamina).toBe("number");
    expect(typeof snapshot.equipmentStats.magicFind).toBe("number");
    expect(typeof snapshot.equipmentStats.gatheringYield).toBe("number");
    expect(typeof snapshot.equipmentStats.gatheringXp).toBe("number");
    expect(typeof snapshot.equipmentStats.lootQuality).toBe("number");
    expect(typeof snapshot.equipmentStats.criticalChancePerMille).toBe("number");

    // Stats must be non-negative integers
    expect(snapshot.equipmentStats.attackPower).toBeGreaterThanOrEqual(0);
    expect(snapshot.equipmentStats.defense).toBeGreaterThanOrEqual(0);
    expect(snapshot.equipmentStats.maxHealth).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(snapshot.equipmentStats.attackPower)).toBe(true);
    expect(Number.isInteger(snapshot.equipmentStats.defense)).toBe(true);
  });

  test("equipment stats are zero for unequipped player", async ({ request }) => {
    const playerId = "e2e-unequipped-stats-player";
    const res = await request.get("/api/gameplay/snapshot", {
      params: { playerId },
    });

    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const snapshot = body.data?.snapshot ?? body.snapshot ?? body.data ?? body;

    // Fresh player with no equipment should have zero stats
    expect(snapshot.equipmentStats.attackPower).toBe(0);
    expect(snapshot.equipmentStats.defense).toBe(0);
    expect(snapshot.equipmentStats.maxHealth).toBe(0);
    expect(snapshot.equipmentStats.maxStamina).toBe(0);
    expect(snapshot.equipmentStats.magicFind).toBe(0);
    expect(snapshot.equipmentStats.gatheringYield).toBe(0);
  });

  test("gathering updates inventory and skills in snapshot", async ({ request }) => {
    const playerId = "e2e-gather-player";

    // Gather from tree node
    const gather = await request.post("/api/resource/gather", {
      data: {
        playerId,
        nodeId: "starter_tree_001",
        playerPosition: { x: 460, y: 500 },
        currentTick: 5000,
      },
    });

    expect(gather.ok()).toBeTruthy();

    const gatherBody = await gather.json();
    expect(gatherBody.ok ?? gatherBody.success ?? true).toBeTruthy();

    // Get gameplay snapshot
    const snapshotRes = await request.get("/api/gameplay/snapshot", {
      params: { playerId },
    });
    expect(snapshotRes.ok()).toBeTruthy();

    const body = await snapshotRes.json();
    const snapshot = body.data?.snapshot ?? body.snapshot ?? body.data ?? body;

    // Verify inventory contains gathered item
    const inventoryIds = snapshot.inventory?.slots?.map((i: any) => i.itemId) ?? [];
    expect(inventoryIds).toContain("wood_log");

    // Verify skill XP was granted
    const skills = snapshot.skills ?? [];
    const skillIds = Array.isArray(skills) ? skills.map((s: any) => s.skillId) : [];
    expect(skillIds).toContain("woodcutting");

    const woodcutting = skills.find((s: any) => s.skillId === "woodcutting");
    if (woodcutting) {
      expect(woodcutting.xp).toBeGreaterThanOrEqual(10);
    }
  });

  test("snapshot has correct tick metadata", async ({ request }) => {
    const playerId = "e2e-tick-metadata-player";
    const res = await request.get("/api/gameplay/snapshot", {
      params: { playerId },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const snapshot = body.data?.snapshot ?? body.snapshot ?? body.data ?? body;

    expect(snapshot.tickRateHz).toBe(10);
    expect(snapshot.tickMs).toBe(100);
    expect(typeof snapshot.serverTick).toBe("number");
  });

  test("inventory is sorted deterministically", async ({ request }) => {
    const playerId = "e2e-sorted-inventory-player";

    // Gather multiple different items
    await request.post("/api/resource/gather", {
      data: {
        playerId,
        nodeId: "starter_tree_001",
        playerPosition: { x: 460, y: 500 },
        currentTick: 10000,
      },
    });

    await request.post("/api/resource/gather", {
      data: {
        playerId,
        nodeId: "starter_ore_001",
        playerPosition: { x: 540, y: 520 },
        currentTick: 10001,
      },
    });

    const res = await request.get("/api/gameplay/snapshot", {
      params: { playerId },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const snapshot = body.data?.snapshot ?? body.snapshot ?? body.data ?? body;

    const slots = snapshot.inventory?.slots ?? [];
    const itemIds = slots.map((s: any) => s.itemId);
    const sortedItemIds = [...itemIds].sort();
    expect(itemIds).toEqual(sortedItemIds);
  });
});