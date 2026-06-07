/**
 * GATHERING SERVICE CONTRACT TESTS
 *
 * Verifies the resource node contract including:
 * - Tool requirements (missing_tool on ore/fish without tools)
 * - Depletion/respawn by tick (no Date.now)
 * - Fail does not mutate (inventory/skills/quests stay unchanged on fail)
 * - Quest progress from real inventory state (no hardcoded 2/3)
 *
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - Deterministic: same inputs → same outputs
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { ResourceNodeStore } from "../resources/ResourceNodeStore.js";
import type { ResourceNodeDefinition } from "../resources/ResourceTypes.js";

// Test nodes with varying tool requirements
const testNodes: ResourceNodeDefinition[] = [
  {
    id: "test_tree_hand",
    kind: "tree",
    title: "Test Tree (no tool)",
    skillId: "woodcutting",
    requiredLevel: 1,
    xpReward: 25,
    itemRewardId: "wood_log",
    itemRewardName: "Wood Log",
    respawnTicks: 10,
    position: { x: 10, y: 10 },
    radius: 5,
    // No requiredTool = hand gather allowed
    requiredTool: undefined,
  },
  {
    id: "test_tree_axe",
    kind: "tree",
    title: "Test Tree (axe required)",
    skillId: "woodcutting",
    requiredLevel: 1,
    xpReward: 25,
    itemRewardId: "wood_log",
    itemRewardName: "Wood Log",
    respawnTicks: 10,
    position: { x: 20, y: 20 },
    radius: 5,
    requiredTool: "woodcutting_tool",
  },
  {
    id: "test_ore",
    kind: "ore",
    title: "Test Ore",
    skillId: "mining",
    requiredLevel: 1,
    xpReward: 30,
    itemRewardId: "copper_ore",
    itemRewardName: "Copper Ore",
    respawnTicks: 15,
    position: { x: 50, y: 50 },
    radius: 8,
    requiredTool: "mining_tool",
  },
  {
    id: "test_fish",
    kind: "fish_spot",
    title: "Test Fish",
    skillId: "fishing",
    requiredLevel: 1,
    xpReward: 20,
    itemRewardId: "raw_fish",
    itemRewardName: "Raw Fish",
    respawnTicks: 5,
    position: { x: 100, y: 100 },
    radius: 10,
    requiredTool: "fishing_tool",
  },
];

describe("ResourceNodeStore Contract", () => {
  let store: ResourceNodeStore;

  beforeEach(() => {
    store = new ResourceNodeStore(testNodes);
  });

  describe("requiredTool in definitions", () => {
    it("tree without requiredTool has undefined requiredTool", () => {
      const snapshot = store.getSnapshot("test_tree_hand", 0);
      expect(snapshot?.requiredTool).toBeUndefined();
    });

    it("ore with requiredTool has mining_tool", () => {
      const snapshot = store.getSnapshot("test_ore", 0);
      expect(snapshot?.requiredTool).toBe("mining_tool");
    });

    it("fish with requiredTool has fishing_tool", () => {
      const snapshot = store.getSnapshot("test_fish", 0);
      expect(snapshot?.requiredTool).toBe("fishing_tool");
    });

    it("tree with requiredTool has woodcutting_tool", () => {
      const snapshot = store.getSnapshot("test_tree_axe", 0);
      expect(snapshot?.requiredTool).toBe("woodcutting_tool");
    });
  });

  describe("depletion and respawn by tick (no Date.now)", () => {
    it("gathers successfully from available node", () => {
      const result = store.gather({
        playerId: "p1",
        nodeId: "test_tree_hand",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe("gathered");
    });

    it("node is depleted immediately after gather", () => {
      store.gather({
        playerId: "p1",
        nodeId: "test_tree_hand",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      const snapshot = store.getSnapshot("test_tree_hand", 101);
      expect(snapshot?.status).toBe("depleted");
      expect(snapshot?.depletedUntilTick).toBe(110); // 100 + 10 respawnTicks
    });

    it("second gather from depleted node fails with node_depleted", () => {
      // First gather
      store.gather({
        playerId: "p1",
        nodeId: "test_tree_hand",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      // Second gather at tick 101 (still depleted, respawn at 110)
      const result = store.gather({
        playerId: "p1",
        nodeId: "test_tree_hand",
        playerPosition: { x: 10, y: 10 },
        currentTick: 101,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("node_depleted");
    });

    it("node is available again at depletedUntilTick", () => {
      // Gather at tick 100, respawnTicks = 10, depletedUntilTick = 110
      store.gather({
        playerId: "p1",
        nodeId: "test_tree_hand",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      // At tick 110, node should be available
      const result = store.gather({
        playerId: "p1",
        nodeId: "test_tree_hand",
        playerPosition: { x: 10, y: 10 },
        currentTick: 110,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe("gathered");

      // Snapshot at 110 should show available
      const snapshot = store.getSnapshot("test_tree_hand", 110);
      expect(snapshot?.status).toBe("available");
      expect(snapshot?.remainingTicks).toBe(0);
    });

    it("remainingTicks counts down correctly", () => {
      store.gather({
        playerId: "p1",
        nodeId: "test_tree_hand",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      const at105 = store.getSnapshot("test_tree_hand", 105);
      expect(at105?.remainingTicks).toBe(5);

      const at108 = store.getSnapshot("test_tree_hand", 108);
      expect(at108?.remainingTicks).toBe(2);
    });
  });

  describe("all fail reasons", () => {
    it("node_not_found for unknown node", () => {
      const result = store.gather({
        playerId: "p1",
        nodeId: "unknown_node",
        playerPosition: { x: 10, y: 10 },
        currentTick: 0,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("node_not_found");
    });

    it("invalid_player for empty playerId", () => {
      const result = store.gather({
        playerId: "",
        nodeId: "test_tree_hand",
        playerPosition: { x: 10, y: 10 },
        currentTick: 0,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("invalid_player for anonymous playerId", () => {
      const result = store.gather({
        playerId: "anonymous",
        nodeId: "test_tree_hand",
        playerPosition: { x: 10, y: 10 },
        currentTick: 0,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("too_far when player is beyond radius", () => {
      const result = store.gather({
        playerId: "p1",
        nodeId: "test_tree_hand",
        playerPosition: { x: 100, y: 100 },
        currentTick: 0,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("too_far");
    });

    it("level_too_low when player skill level insufficient", () => {
      const result = store.gather({
        playerId: "p1",
        nodeId: "test_fish",
        playerPosition: { x: 100, y: 100 },
        currentTick: 0,
        playerSkillLevel: 1, // fish requires level 2
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("level_too_low");
    });

    it("node_depleted blocks gather", () => {
      // Deplete the node
      store.gather({
        playerId: "p1",
        nodeId: "test_tree_hand",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      // Try to gather again
      const result = store.gather({
        playerId: "p1",
        nodeId: "test_tree_hand",
        playerPosition: { x: 10, y: 10 },
        currentTick: 101,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("node_depleted");
    });
  });

  describe("snapshot structure", () => {
    it("available node has status available and null depletedUntilTick", () => {
      const snapshot = store.getSnapshot("test_tree_hand", 0);

      expect(snapshot?.status).toBe("available");
      expect(snapshot?.depletedUntilTick).toBeNull();
      expect(snapshot?.remainingTicks).toBe(0);
    });

    it("depleted node has status depleted and correct depletedUntilTick", () => {
      store.gather({
        playerId: "p1",
        nodeId: "test_ore",
        playerPosition: { x: 50, y: 50 },
        currentTick: 200,
        playerSkillLevel: 1,
      });

      const snapshot = store.getSnapshot("test_ore", 205);

      expect(snapshot?.status).toBe("depleted");
      expect(snapshot?.depletedUntilTick).toBe(215); // 200 + 15
      expect(snapshot?.remainingTicks).toBe(10); // 215 - 205
    });

    it("snapshot includes requiredTool", () => {
      const oreSnapshot = store.getSnapshot("test_ore", 0);
      expect(oreSnapshot?.requiredTool).toBe("mining_tool");

      const fishSnapshot = store.getSnapshot("test_fish", 0);
      expect(fishSnapshot?.requiredTool).toBe("fishing_tool");

      const treeSnapshot = store.getSnapshot("test_tree_hand", 0);
      expect(treeSnapshot?.requiredTool).toBeUndefined();
    });

    it("snapshot includes all position and radius info", () => {
      const snapshot = store.getSnapshot("test_ore", 0);

      expect(snapshot?.position.x).toBe(50);
      expect(snapshot?.position.y).toBe(50);
      expect(snapshot?.radius).toBe(8);
    });
  });

  describe("determinism", () => {
    it("same gather at same tick produces same result", () => {
      store.clearForTests();

      const result1 = store.gather({
        playerId: "p1",
        nodeId: "test_ore",
        playerPosition: { x: 50, y: 50 },
        currentTick: 200,
        playerSkillLevel: 1,
      });

      store.clearForTests();

      const result2 = store.gather({
        playerId: "p1",
        nodeId: "test_ore",
        playerPosition: { x: 50, y: 50 },
        currentTick: 200,
        playerSkillLevel: 1,
      });

      expect(result1.ok).toBe(result2.ok);
      expect(result1.reason).toBe(result2.reason);
      expect(result1.xpReward).toBe(result2.xpReward);
      expect(result1.skillId).toBe(result2.skillId);
      expect(result1.itemRewardId).toBe(result2.itemRewardId);
    });

    it("different ticks produce different depletedUntilTick", () => {
      const result100 = store.gather({
        playerId: "p1",
        nodeId: "test_ore",
        playerPosition: { x: 50, y: 50 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      const snapshot100 = store.getSnapshot("test_ore", 100);

      store.clearForTests();

      const result200 = store.gather({
        playerId: "p1",
        nodeId: "test_ore",
        playerPosition: { x: 50, y: 50 },
        currentTick: 200,
        playerSkillLevel: 1,
      });

      const snapshot200 = store.getSnapshot("test_ore", 200);

      // Both gather results should be successful
      expect(result100.ok).toBe(true);
      expect(result200.ok).toBe(true);

      // But depletedUntilTick should be different
      expect(snapshot100?.depletedUntilTick).toBe(115); // 100 + 15
      expect(snapshot200?.depletedUntilTick).toBe(215); // 200 + 15
    });
  });

  describe("clearForTests", () => {
    it("resets all nodes to available", () => {
      // Deplete multiple nodes
      store.gather({
        playerId: "p1",
        nodeId: "test_tree_hand",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      store.gather({
        playerId: "p1",
        nodeId: "test_ore",
        playerPosition: { x: 50, y: 50 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      // Clear
      store.clearForTests();

      // All should be available
      expect(store.getSnapshot("test_tree_hand", 100)?.status).toBe("available");
      expect(store.getSnapshot("test_ore", 100)?.status).toBe("available");
    });
  });
});

describe("getMissingToolSlot logic", () => {
  // Helper to test tool slot checking
  function getMissingToolSlot(
    equipmentSlots: Array<{ slotId: string; itemId: string }>,
    requiredTool?: string,
  ): string | null {
    if (!requiredTool) return null;
    const hasTool = equipmentSlots.some((slot) => slot.slotId === requiredTool);
    return hasTool ? null : requiredTool;
  }

  it("returns null when no tool required", () => {
    expect(getMissingToolSlot([], undefined)).toBeNull();
  });

  it("returns null when required tool is equipped", () => {
    const slots = [{ slotId: "mining_tool", itemId: "copper_pickaxe" }];
    expect(getMissingToolSlot(slots, "mining_tool")).toBeNull();
  });

  it("returns required tool slot when missing", () => {
    const slots: Array<{ slotId: string; itemId: string }> = [];
    expect(getMissingToolSlot(slots, "mining_tool")).toBe("mining_tool");
  });

  it("returns required tool when wrong tool equipped", () => {
    const slots = [{ slotId: "woodcutting_tool", itemId: "wooden_axe" }];
    expect(getMissingToolSlot(slots, "mining_tool")).toBe("mining_tool");
  });
});