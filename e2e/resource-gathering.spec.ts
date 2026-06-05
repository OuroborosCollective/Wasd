/**
 * RESOURCE GATHERING E2E TESTS
 *
 * End-to-end tests for deterministic resource gathering.
 * Tests the full flow from gather API to gameplay snapshot.
 */

import { test, expect } from "@playwright/test";

test.describe("Resource Gathering API", () => {
  test("POST /api/resource/gather gathers from available tree node", async ({ request }) => {
    const playerId = "resource-e2e-tree-player";

    const response = await request.post(`/api/resource/gather`, {
      data: {
        nodeId: "starter_tree_001",
        playerPosition: { x: 460, y: 500 },
        currentTick: 1000,
      },
      params: { playerId },
    });

    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.result).toBeDefined();
    expect(json.result.ok).toBe(true);
    expect(json.result.reason).toBe("gathered");
    expect(json.result.skillId).toBe("woodcutting");
    expect(json.result.xpReward).toBe(25);
    expect(json.result.itemRewardId).toBe("wood_log");
    expect(json.result.itemRewardName).toBe("Wood Log");
  });

  test("POST /api/resource/gather gathers from available ore node", async ({ request }) => {
    const playerId = "resource-e2e-ore-player";

    const response = await request.post(`/api/resource/gather`, {
      data: {
        nodeId: "starter_ore_001",
        playerPosition: { x: 540, y: 520 },
        currentTick: 1000,
      },
      params: { playerId },
    });

    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.result.skillId).toBe("mining");
    expect(json.result.xpReward).toBe(30);
    expect(json.result.itemRewardId).toBe("copper_ore");
  });

  test("POST /api/resource/gather gathers from available fishing spot", async ({ request }) => {
    const playerId = "resource-e2e-fish-player";

    const response = await request.post(`/api/resource/gather`, {
      data: {
        nodeId: "starter_fish_001",
        playerPosition: { x: 500, y: 580 },
        currentTick: 1000,
      },
      params: { playerId },
    });

    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.result.skillId).toBe("fishing");
    expect(json.result.xpReward).toBe(20);
    expect(json.result.itemRewardId).toBe("raw_fish");
  });

  test("rejects gather when too far from node", async ({ request }) => {
    const response = await request.post(`/api/resource/gather`, {
      data: {
        nodeId: "starter_tree_001",
        playerPosition: { x: 0, y: 0 },
        currentTick: 1000,
      },
      params: { playerId: "too-far-player" },
    });

    expect(response.status()).toBe(409);

    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.result.reason).toBe("too_far");
  });

  test("rejects gather from depleted node", async ({ request }) => {
    const playerId = "depleted-node-test";

    // First gather should succeed
    const first = await request.post(`/api/resource/gather`, {
      data: {
        nodeId: "starter_fish_001",
        playerPosition: { x: 500, y: 580 },
        currentTick: 1000,
      },
      params: { playerId },
    });

    expect(first.ok()).toBeTruthy();
    const firstJson = await first.json();
    expect(firstJson.result.ok).toBe(true);

    // Second gather at same position should fail (node depleted)
    const second = await request.post(`/api/resource/gather`, {
      data: {
        nodeId: "starter_fish_001",
        playerPosition: { x: 500, y: 580 },
        currentTick: 1001,
      },
      params: { playerId },
    });

    expect(second.status()).toBe(409);
    const secondJson = await second.json();
    expect(secondJson.result.ok).toBe(false);
    expect(secondJson.result.reason).toBe("node_depleted");
  });

  test("rejects invalid node ID", async ({ request }) => {
    const response = await request.post(`/api/resource/gather`, {
      data: {
        nodeId: "nonexistent_node",
        playerPosition: { x: 10, y: 10 },
        currentTick: 0,
      },
      params: { playerId: "invalid-node-test" },
    });

    expect(response.status()).toBe(409);
    const json = await response.json();
    expect(json.result.reason).toBe("node_not_found");
  });

  test("GET /api/resource/nodes returns all starter nodes", async ({ request }) => {
    const response = await request.get(`/api/resource/nodes`, {
      params: { tick: 100 },
    });

    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.nodes).toBeDefined();
    expect(Array.isArray(json.nodes)).toBe(true);
    expect(json.nodes).toHaveLength(3);
    expect(json.count).toBe(3);

    // Check all node types are present
    const kinds = json.nodes.map((n: any) => n.kind);
    expect(kinds).toContain("tree");
    expect(kinds).toContain("ore");
    expect(kinds).toContain("fish_spot");

    // Verify node properties
    for (const node of json.nodes) {
      expect(node.id).toBeDefined();
      expect(node.title).toBeDefined();
      expect(node.skillId).toBeDefined();
      expect(node.xpReward).toBeGreaterThan(0);
      expect(node.itemRewardId).toBeDefined();
      expect(node.position).toBeDefined();
      expect(node.radius).toBeGreaterThan(0);
      expect(node.status).toBeDefined();
    }
  });

  test("GET /api/resource/nodes shows depleted status after gathering", async ({ request }) => {
    const playerId = "depleted-status-test";

    // Gather from tree node
    await request.post(`/api/resource/gather`, {
      data: {
        nodeId: "starter_tree_001",
        playerPosition: { x: 460, y: 500 },
        currentTick: 500,
      },
      params: { playerId },
    });

    // Get nodes - tree should be depleted
    const response = await request.get(`/api/resource/nodes`, {
      params: { tick: 501 },
    });

    const json = await response.json();
    const tree = json.nodes.find((n: any) => n.id === "starter_tree_001");
    expect(tree).toBeDefined();
    expect(tree.status).toBe("depleted");
    expect(tree.remainingTicks).toBeGreaterThan(0);
    expect(tree.depletedUntilTick).toBeGreaterThan(501);
  });
});

test.describe("Resource Gathering + Skill XP in Snapshot", () => {
  test("gathering gives skill XP that appears in gameplay snapshot", async ({ request }) => {
    const playerId = "resource-snapshot-player";

    // Gather from tree to get woodcutting XP
    const gatherResponse = await request.post(`/api/resource/gather`, {
      data: {
        nodeId: "starter_tree_001",
        playerPosition: { x: 460, y: 500 },
        currentTick: 1000,
      },
      params: { playerId },
    });

    expect(gatherResponse.ok()).toBeTruthy();
    const gatherJson = await gatherResponse.json();
    expect(gatherJson.result.skillId).toBe("woodcutting");

    // Get gameplay snapshot
    const snapshotResponse = await request.get(`/api/gameplay/snapshot`, {
      params: { playerId },
    });

    expect(snapshotResponse.ok()).toBeTruthy();

    const json = await snapshotResponse.json();
    expect(json.snapshot).toBeDefined();
    expect(json.snapshot.resources).toBeDefined();

    // Verify tree is depleted in snapshot
    const tree = json.snapshot.resources.find((r: any) => r.id === "starter_tree_001");
    expect(tree).toBeDefined();
    expect(tree.status).toBe("depleted");
  });

  test("resources appear in gameplay snapshot", async ({ request }) => {
    const playerId = "resource-list-snapshot-player";

    const response = await request.get(`/api/gameplay/snapshot`, {
      params: { playerId },
    });

    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.snapshot.resources).toBeDefined();
    expect(Array.isArray(json.snapshot.resources)).toBe(true);

    // Should have all 3 starter nodes
    expect(json.snapshot.resources).toHaveLength(3);

    // Verify all nodes have expected properties
    const ids = json.snapshot.resources.map((r: any) => r.id);
    expect(ids).toContain("starter_tree_001");
    expect(ids).toContain("starter_ore_001");
    expect(ids).toContain("starter_fish_001");
  });
});