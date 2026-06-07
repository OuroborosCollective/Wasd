/**
 * Unit tests for LiveGameplaySnapshotComposer
 *
 * Verifies deterministic, server-authoritative snapshot composition.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - Arrays sorted deterministically
 * - Empty arrays instead of undefined
 */

import { describe, expect, it } from "vitest";
import { LiveGameplaySnapshotComposer } from "./LiveGameplaySnapshotComposer.js";

describe("LiveGameplaySnapshotComposer", () => {
  it("composes deterministic sorted snapshot", async () => {
    const composer = new LiveGameplaySnapshotComposer({
      getInventoryItems: () => [
        { itemId: "wood_log", quantity: 2 },
        { itemId: "copper_ore", quantity: 1 },
      ],
      getEquipmentSlots: () => [
        { slot: "tool", itemId: "wooden_axe" },
        { slot: "weapon", itemId: null },
      ],
      getSkillStates: () => [
        { skillId: "woodcutting", xp: 10, level: 1 },
        { skillId: "mining", xp: 0, level: 1 },
      ],
      getResourceNodes: () => [
        { nodeId: "node_tree_001", resourceId: "tree", skillId: "woodcutting", x: 10, y: 20, available: true },
      ],
    });

    const snapshot = await composer.compose("player_test", 42);

    expect(snapshot.schemaVersion).toBe("live-gameplay-snapshot.v1");
    expect(snapshot.playerId).toBe("player_test");
    expect(snapshot.logicalIndex).toBe(42);
    expect(snapshot.tickRateHz).toBe(10);
    expect(snapshot.tickMs).toBe(100);

    expect(snapshot.inventory.map((i) => i.itemId)).toEqual(["copper_ore", "wood_log"]);
    expect(snapshot.equipment.map((e) => e.slot)).toEqual(["tool", "weapon"]);
    expect(snapshot.skills.map((s) => s.skillId)).toEqual(["mining", "woodcutting"]);
    expect(snapshot.resourceNodes.map((n) => n.nodeId)).toEqual(["node_tree_001"]);
  });

  it("normalizes invalid logicalIndex to zero", async () => {
    const composer = new LiveGameplaySnapshotComposer({
      getInventoryItems: () => [],
      getEquipmentSlots: () => [],
      getSkillStates: () => [],
      getResourceNodes: () => [],
    });

    const snapshot = await composer.compose("player_test", -1);
    expect(snapshot.logicalIndex).toBe(0);
  });

  it("normalizes non-safe-integer logicalIndex to zero", async () => {
    const composer = new LiveGameplaySnapshotComposer({
      getInventoryItems: () => [],
      getEquipmentSlots: () => [],
      getSkillStates: () => [],
      getResourceNodes: () => [],
    });

    const snapshot = await composer.compose("player_test", Infinity);
    expect(snapshot.logicalIndex).toBe(0);
  });

  it("handles empty arrays", async () => {
    const composer = new LiveGameplaySnapshotComposer({
      getInventoryItems: () => [],
      getEquipmentSlots: () => [],
      getSkillStates: () => [],
      getResourceNodes: () => [],
    });

    const snapshot = await composer.compose("player_empty", 0);

    expect(snapshot.inventory).toEqual([]);
    expect(snapshot.equipment).toEqual([]);
    expect(snapshot.skills).toEqual([]);
    expect(snapshot.resourceNodes).toEqual([]);
  });

  it("returns frozen snapshot object", async () => {
    const composer = new LiveGameplaySnapshotComposer({
      getInventoryItems: () => [{ itemId: "wood_log", quantity: 1 }],
      getEquipmentSlots: () => [],
      getSkillStates: () => [],
      getResourceNodes: () => [],
    });

    const snapshot = await composer.compose("player_test", 0);

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.inventory)).toBe(true);
    expect(Object.isFrozen(snapshot.equipment)).toBe(true);
    expect(Object.isFrozen(snapshot.skills)).toBe(true);
    expect(Object.isFrozen(snapshot.resourceNodes)).toBe(true);
  });

  it("sorts multiple inventory items by itemId", async () => {
    const composer = new LiveGameplaySnapshotComposer({
      getInventoryItems: () => [
        { itemId: "z_item", quantity: 1 },
        { itemId: "a_item", quantity: 1 },
        { itemId: "m_item", quantity: 1 },
      ],
      getEquipmentSlots: () => [],
      getSkillStates: () => [],
      getResourceNodes: () => [],
    });

    const snapshot = await composer.compose("player_test", 0);

    expect(snapshot.inventory.map((i) => i.itemId)).toEqual(["a_item", "m_item", "z_item"]);
  });

  it("handles async deps", async () => {
    const composer = new LiveGameplaySnapshotComposer({
      getInventoryItems: async () => [{ itemId: "async_item", quantity: 5 }],
      getEquipmentSlots: async () => [{ slot: "tool", itemId: "axe" }],
      getSkillStates: async () => [{ skillId: "woodcutting", xp: 100, level: 2 }],
      getResourceNodes: async () => [{ nodeId: "node_1", resourceId: "tree", skillId: "woodcutting", x: 0, y: 0, available: true }],
    });

    const snapshot = await composer.compose("async_player", 10);

    expect(snapshot.inventory).toHaveLength(1);
    expect(snapshot.inventory[0].itemId).toBe("async_item");
    expect(snapshot.skills[0].skillId).toBe("woodcutting");
  });
});