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
import {
  LiveGameplaySnapshotComposer,
  buildMarketStateFromRuntimeInputs,
} from "../gameplay/LiveGameplaySnapshotComposer.js";
import { createDefaultStatBlock } from "../equipment/EquipmentStatTypes.js";
import type { EquipmentStatBlock } from "../equipment/EquipmentStatTypes.js";

function createBaseComposer(overrides: Partial<ConstructorParameters<typeof LiveGameplaySnapshotComposer>[0]> = {}) {
  return new LiveGameplaySnapshotComposer({
    getInventoryItems: () => [],
    getEquipmentSlots: () => [],
    getSkillStates: () => [],
    getResourceNodes: () => [],
    getWallet: () => ({ coin: 0 }),
    ...overrides,
  });
}

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
      getWallet: () => ({ coin: 0 }),
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
    const snapshot = await createBaseComposer().compose("player_test", -1);
    expect(snapshot.logicalIndex).toBe(0);
  });

  it("normalizes non-safe-integer logicalIndex to zero", async () => {
    const snapshot = await createBaseComposer().compose("player_test", Infinity);
    expect(snapshot.logicalIndex).toBe(0);
  });

  it("handles empty arrays", async () => {
    const snapshot = await createBaseComposer().compose("player_empty", 0);

    expect(snapshot.inventory).toEqual([]);
    expect(snapshot.equipment).toEqual([]);
    expect(snapshot.skills).toEqual([]);
    expect(snapshot.resourceNodes).toEqual([]);
    expect(snapshot.wallet.coin).toBe(0);
  });

  it("returns frozen snapshot object", async () => {
    const composer = createBaseComposer({
      getInventoryItems: () => [{ itemId: "wood_log", quantity: 1 }],
      getWallet: () => ({ coin: 42 }),
    });

    const snapshot = await composer.compose("player_test", 0);

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.inventory)).toBe(true);
    expect(Object.isFrozen(snapshot.equipment)).toBe(true);
    expect(Object.isFrozen(snapshot.skills)).toBe(true);
    expect(Object.isFrozen(snapshot.resourceNodes)).toBe(true);
    expect(Object.isFrozen(snapshot.wallet)).toBe(true);
    expect(snapshot.wallet.coin).toBe(42);
  });

  it("sorts multiple inventory items by itemId", async () => {
    const composer = createBaseComposer({
      getInventoryItems: () => [
        { itemId: "z_item", quantity: 1 },
        { itemId: "a_item", quantity: 1 },
        { itemId: "m_item", quantity: 1 },
      ],
    });

    const snapshot = await composer.compose("player_test", 0);

    expect(snapshot.inventory.map((i) => i.itemId)).toEqual(["a_item", "m_item", "z_item"]);
  });

  it("handles async deps", async () => {
    const composer = createBaseComposer({
      getInventoryItems: async () => [{ itemId: "async_item", quantity: 5 }],
      getEquipmentSlots: async () => [{ slot: "tool", itemId: "axe" }],
      getSkillStates: async () => [{ skillId: "woodcutting", xp: 100, level: 2 }],
      getResourceNodes: async () => [{ nodeId: "node_1", resourceId: "tree", skillId: "woodcutting", x: 0, y: 0, available: true }],
      getWallet: async () => ({ coin: 100 }),
    });

    const snapshot = await composer.compose("async_player", 10);

    expect(snapshot.inventory).toHaveLength(1);
    expect(snapshot.inventory[0].itemId).toBe("async_item");
    expect(snapshot.skills[0].skillId).toBe("woodcutting");
    expect(snapshot.wallet.coin).toBe(100);
  });

  it("returns zero stats when getEquipmentStats is not provided", async () => {
    const snapshot = await createBaseComposer().compose("player_no_stats", 0);
    const defaults = createDefaultStatBlock();

    expect(snapshot.equipmentStats.attackPower).toBe(defaults.attackPower);
    expect(snapshot.equipmentStats.defense).toBe(defaults.defense);
    expect(snapshot.equipmentStats.maxHealth).toBe(defaults.maxHealth);
    expect(snapshot.equipmentStats.maxStamina).toBe(defaults.maxStamina);
    expect(snapshot.equipmentStats.magicFind).toBe(0);
    expect(snapshot.equipmentStats.gatheringYield).toBe(0);
  });

  it("returns custom equipmentStats when getEquipmentStats is provided", async () => {
    const customStats: EquipmentStatBlock = Object.freeze({
      attackPower: 12,
      defense: 5,
      maxHealth: 50,
      maxStamina: 30,
      magicFind: 20,
      gatheringYield: 2,
      gatheringXp: 100,
      lootQuality: 15,
      criticalChancePerMille: 75,
    });

    const composer = createBaseComposer({
      getEquipmentStats: () => customStats,
    });

    const snapshot = await composer.compose("player_with_stats", 0);

    expect(snapshot.equipmentStats.attackPower).toBe(12);
    expect(snapshot.equipmentStats.defense).toBe(5);
    expect(snapshot.equipmentStats.maxHealth).toBe(50);
    expect(snapshot.equipmentStats.maxStamina).toBe(30);
    expect(snapshot.equipmentStats.magicFind).toBe(20);
    expect(snapshot.equipmentStats.gatheringYield).toBe(2);
    expect(snapshot.equipmentStats.gatheringXp).toBe(100);
    expect(snapshot.equipmentStats.lootQuality).toBe(15);
    expect(snapshot.equipmentStats.criticalChancePerMille).toBe(75);
  });

  it("returns frozen equipmentStats", async () => {
    const composer = createBaseComposer({
      getEquipmentStats: () => createDefaultStatBlock(),
    });

    const snapshot = await composer.compose("player_test", 0);
    expect(Object.isFrozen(snapshot.equipmentStats)).toBe(true);
  });

  it("exposes market state from resource and stock inputs", async () => {
    const composer = createBaseComposer({
      getResourceNodes: () => [
        { nodeId: "tree_a", resourceId: "tree", skillId: "woodcutting", x: 0, y: 0, available: true },
        { nodeId: "tree_b", resourceId: "tree", skillId: "woodcutting", x: 1, y: 0, available: true },
        { nodeId: "ore_depleted", resourceId: "copper_ore", skillId: "mining", x: 2, y: 0, available: false },
      ],
      getCampStocks: () => [
        {
          poiId: "camp_market",
          lastUpdatedTick: 99,
          items: [
            { itemId: "wood_log", quantity: 10 },
            { itemId: "raw_fish", quantity: 25 },
          ],
        },
      ],
    });

    const snapshot = await composer.compose("market_player", 120);
    const wood = snapshot.marketState.prices.find((price) => price.itemId === "wood_log");
    const fish = snapshot.marketState.prices.find((price) => price.itemId === "raw_fish");

    expect(snapshot.marketState.tick).toBe(120);
    expect(snapshot.marketState.marketHash.startsWith("market:")).toBe(true);
    expect(wood).toMatchObject({
      availableQuantity: 12,
      resourceNodeCount: 2,
      demandBand: "stocked",
      basePrice: 1,
      unitPrice: 1,
    });
    expect(fish).toMatchObject({
      availableQuantity: 25,
      resourceNodeCount: 0,
      demandBand: "oversupplied",
      basePrice: 2,
      unitPrice: 1,
    });
  });

  it("replays the same market state for the same resource counters", () => {
    const first = buildMarketStateFromRuntimeInputs(
      77,
      [
        { nodeId: "tree_b", resourceId: "tree", skillId: "woodcutting", x: 1, y: 0, available: true },
        { nodeId: "tree_a", resourceId: "tree", skillId: "woodcutting", x: 0, y: 0, available: true },
      ],
      [
        { poiId: "b", lastUpdatedTick: 1, items: [{ itemId: "copper_ore", quantity: 11 }] },
        { poiId: "a", lastUpdatedTick: 1, items: [{ itemId: "raw_fish", quantity: 3 }] },
      ],
    );
    const replay = buildMarketStateFromRuntimeInputs(
      77,
      [
        { nodeId: "tree_a", resourceId: "tree", skillId: "woodcutting", x: 0, y: 0, available: true },
        { nodeId: "tree_b", resourceId: "tree", skillId: "woodcutting", x: 1, y: 0, available: true },
      ],
      [
        { poiId: "a", lastUpdatedTick: 1, items: [{ itemId: "raw_fish", quantity: 3 }] },
        { poiId: "b", lastUpdatedTick: 1, items: [{ itemId: "copper_ore", quantity: 11 }] },
      ],
    );

    expect(replay).toEqual(first);
  });

  it("benchmarks direct string comparison against localeCompare", async () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      itemId: `item_${Math.floor(Math.sin(i) * 1000)}`,
      quantity: i,
    }));

    // Warmup
    const warmData = [...items];
    warmData.sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0));

    const iterations = 50000;

    const startDirect = performance.now();
    for (let i = 0; i < iterations; i++) {
      const copy = [...items];
      copy.sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0));
    }
    const endDirect = performance.now();
    const directTime = endDirect - startDirect;

    const startLocale = performance.now();
    for (let i = 0; i < iterations; i++) {
      const copy = [...items];
      copy.sort((a, b) => a.itemId.localeCompare(b.itemId));
    }
    const endLocale = performance.now();
    const localeTime = endLocale - startLocale;

    console.log(`\n=== LiveGameplaySnapshotComposer Sort Benchmark (50,000 iterations) ===`);
    console.log(`Direct String comparison (<, >): ${directTime.toFixed(2)}ms`);
    console.log(`localeCompare string comparison: ${localeTime.toFixed(2)}ms`);
    console.log(`Speedup factor: ${(localeTime / directTime).toFixed(2)}x\n`);

    expect(directTime).toBeLessThan(localeTime);
  });
});
