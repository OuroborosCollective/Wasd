/**
 * RESOURCE NODE STORE TESTS
 *
 * Deterministic unit tests for ResourceNodeStore.
 * No Math.random(), no Date.now() for gameplay state.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { ResourceNodeStore } from "../resources/ResourceNodeStore";
import type { ResourceNodeDefinition } from "../resources/ResourceTypes";

const testNodes: ResourceNodeDefinition[] = [
  {
    id: "test_tree",
    kind: "tree",
    title: "Test Tree",
    skillId: "woodcutting",
    requiredLevel: 1,
    xpReward: 25,
    itemRewardId: "wood_log",
    itemRewardName: "Wood Log",
    respawnTicks: 10,
    position: { x: 10, y: 10 },
    radius: 5,
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
  },
  {
    id: "test_fish",
    kind: "fish_spot",
    title: "Test Fish",
    skillId: "fishing",
    requiredLevel: 2,
    xpReward: 20,
    itemRewardId: "raw_fish",
    itemRewardName: "Raw Fish",
    respawnTicks: 5,
    position: { x: 100, y: 100 },
    radius: 10,
  },
];

describe("ResourceNodeStore", () => {
  let store: ResourceNodeStore;

  beforeEach(() => {
    store = new ResourceNodeStore(testNodes);
  });

  describe("initial state", () => {
    it("starts with all nodes available", () => {
      const snapshots = store.listSnapshots(0);
      expect(snapshots).toHaveLength(3);
      for (const snapshot of snapshots) {
        expect(snapshot.status).toBe("available");
        expect(snapshot.remainingTicks).toBe(0);
      }
    });

    it("returns null for unknown node", () => {
      const snapshot = store.getSnapshot("unknown_node", 0);
      expect(snapshot).toBeNull();
    });
  });

  describe("gather", () => {
    it("gathers available node and depletes it", () => {
      const result = store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe("gathered");
      expect(result.xpReward).toBe(25);
      expect(result.baseXpReward).toBe(25);
      expect(result.gatheringStreak).toBe(1);
      expect(result.gatheringMomentumPermille).toBe(0);
      expect(result.gatheringMomentumWindowTicks).toBe(600);
      expect(result.skillId).toBe("woodcutting");
      expect(result.itemRewardId).toBe("wood_log");
      expect(result.itemRewardName).toBe("Wood Log");

      const snapshot = store.getSnapshot("test_tree", 100);
      expect(snapshot?.status).toBe("depleted");
      expect(snapshot?.remainingTicks).toBe(10);
      expect(snapshot?.depletedUntilTick).toBe(110);
    });

    it("rewards deterministic same-skill gathering momentum inside the tick window", () => {
      const first = store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      const second = store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 110,
        playerSkillLevel: 1,
      });

      expect(first.xpReward).toBe(25);
      expect(first.gatheringStreak).toBe(1);
      expect(first.gatheringMomentumPermille).toBe(0);
      expect(second.ok).toBe(true);
      expect(second.baseXpReward).toBe(25);
      expect(second.xpReward).toBe(26);
      expect(second.gatheringStreak).toBe(2);
      expect(second.gatheringMomentumPermille).toBe(50);
    });

    it("resets gathering momentum when the skill changes", () => {
      store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      const ore = store.gather({
        playerId: "p1",
        nodeId: "test_ore",
        playerPosition: { x: 50, y: 50 },
        currentTick: 101,
        playerSkillLevel: 1,
      });

      expect(ore.ok).toBe(true);
      expect(ore.skillId).toBe("mining");
      expect(ore.xpReward).toBe(30);
      expect(ore.gatheringStreak).toBe(1);
      expect(ore.gatheringMomentumPermille).toBe(0);
    });

    it("resets gathering momentum after the tick window expires", () => {
      store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      const expired = store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 701,
        playerSkillLevel: 1,
      });

      expect(expired.ok).toBe(true);
      expect(expired.xpReward).toBe(25);
      expect(expired.gatheringStreak).toBe(1);
      expect(expired.gatheringMomentumPermille).toBe(0);
    });

    it("rejects gather from depleted node", () => {
      // First gather depletes the node
      store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      // Second gather is blocked
      const blocked = store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 105,
        playerSkillLevel: 1,
      });

      expect(blocked.ok).toBe(false);
      expect(blocked.reason).toBe("node_depleted");
    });

    it("allows gather after respawn tick", () => {
      store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      // At tick 110, node should be available again
      const result = store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 110,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe("gathered");
    });

    it("rejects player too far from node", () => {
      const result = store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 100, y: 100 },
        currentTick: 0,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("too_far");
    });

    it("rejects player with insufficient skill level", () => {
      const result = store.gather({
        playerId: "p1",
        nodeId: "test_fish",
        playerPosition: { x: 100, y: 100 },
        currentTick: 0,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("level_too_low");
    });

    it("rejects invalid player ID", () => {
      const result = store.gather({
        playerId: "",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 0,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("rejects anonymous player ID", () => {
      const result = store.gather({
        playerId: "anonymous",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 0,
        playerSkillLevel: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("rejects unknown node ID", () => {
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

    it("returns correct snapshot with depletedUntilTick and remainingTicks", () => {
      store.gather({
        playerId: "p1",
        nodeId: "test_ore",
        playerPosition: { x: 50, y: 50 },
        currentTick: 200,
        playerSkillLevel: 1,
      });

      const snapshot = store.getSnapshot("test_ore", 205);

      expect(snapshot?.status).toBe("depleted");
      expect(snapshot?.depletedUntilTick).toBe(215);
      expect(snapshot?.remainingTicks).toBe(10);
    });
  });

  describe("listSnapshots", () => {
    it("returns sorted snapshots by ID", () => {
      const snapshots = store.listSnapshots(0);

      expect(snapshots).toHaveLength(3);
      expect(snapshots[0].id).toBe("test_fish");
      expect(snapshots[1].id).toBe("test_ore");
      expect(snapshots[2].id).toBe("test_tree");
    });

    it("includes all node properties in snapshot", () => {
      const snapshots = store.listSnapshots(0);
      const tree = snapshots.find((s) => s.id === "test_tree");

      expect(tree).toMatchObject({
        id: "test_tree",
        kind: "tree",
        title: "Test Tree",
        skillId: "woodcutting",
        requiredLevel: 1,
        xpReward: 25,
        itemRewardId: "wood_log",
        itemRewardName: "Wood Log",
        position: { x: 10, y: 10 },
        radius: 5,
        status: "available",
        depletedUntilTick: null,
        remainingTicks: 0,
      });
    });
  });

  describe("clearForTests", () => {
    it("resets all nodes to available state", () => {
      // Deplete a node
      store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      // Clear
      store.clearForTests();

      // Node should be available again
      const snapshot = store.getSnapshot("test_tree", 100);
      expect(snapshot?.status).toBe("available");
      expect(snapshot?.remainingTicks).toBe(0);
    });
  });

  describe("determinism", () => {
    it("same gather produces same result", () => {
      store.clearForTests();

      const result1 = store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      store.clearForTests();

      const result2 = store.gather({
        playerId: "p1",
        nodeId: "test_tree",
        playerPosition: { x: 10, y: 10 },
        currentTick: 100,
        playerSkillLevel: 1,
      });

      expect(result1.ok).toBe(result2.ok);
      expect(result1.xpReward).toBe(result2.xpReward);
      expect(result1.skillId).toBe(result2.skillId);
      expect(result1.gatheringStreak).toBe(result2.gatheringStreak);
      expect(result1.gatheringMomentumPermille).toBe(result2.gatheringMomentumPermille);
    });
  });
});
