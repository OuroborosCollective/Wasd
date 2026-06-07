/**
 * Unit tests for InventorySnapshotAdapter
 *
 * Verifies deterministic conversion of inventory items to LiveGameplaySnapshot format.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - Duplicate items merged deterministically
 */

import { describe, expect, it } from "vitest";
import { toLiveInventoryItems } from "./InventorySnapshotAdapter.js";

describe("toLiveInventoryItems", () => {
  it("merges duplicate item ids deterministically", () => {
    const result = toLiveInventoryItems([
      { itemId: "wood_log", quantity: 1 },
      { itemId: "wood_log", quantity: 2 },
      { itemId: "copper_ore", quantity: 1 },
    ]);

    expect(result).toEqual([
      { itemId: "copper_ore", quantity: 1 },
      { itemId: "wood_log", quantity: 3 },
    ]);
  });

  it("filters invalid items", () => {
    const result = toLiveInventoryItems([
      { itemId: "", quantity: 1 },
      { itemId: "wood_log", quantity: 0 },
      { itemId: "raw_fish", quantity: 1 },
    ]);

    expect(result).toEqual([{ itemId: "raw_fish", quantity: 1 }]);
  });

  it("handles items with id instead of itemId", () => {
    const result = toLiveInventoryItems([
      { id: "wood_log", quantity: 3 },
      { itemId: "copper_ore", quantity: 2 },
    ]);

    expect(result).toEqual([
      { itemId: "copper_ore", quantity: 2 },
      { itemId: "wood_log", quantity: 3 },
    ]);
  });

  it("handles items with count instead of quantity", () => {
    const result = toLiveInventoryItems([
      { itemId: "wood_log", count: 5 },
      { itemId: "copper_ore", count: 3 },
    ]);

    expect(result).toEqual([
      { itemId: "copper_ore", quantity: 3 },
      { itemId: "wood_log", quantity: 5 },
    ]);
  });

  it("returns empty array for empty input", () => {
    const result = toLiveInventoryItems([]);
    expect(result).toEqual([]);
  });

  it("filters negative quantities", () => {
    const result = toLiveInventoryItems([
      { itemId: "wood_log", quantity: -5 },
      { itemId: "copper_ore", quantity: 1 },
    ]);

    expect(result).toEqual([{ itemId: "copper_ore", quantity: 1 }]);
  });

  it("filters non-safe-integer quantities", () => {
    const result = toLiveInventoryItems([
      { itemId: "wood_log", quantity: 1.5 },
      { itemId: "copper_ore", quantity: 1 },
    ]);

    expect(result).toEqual([{ itemId: "copper_ore", quantity: 1 }]);
  });

  it("returns frozen array", () => {
    const result = toLiveInventoryItems([{ itemId: "wood_log", quantity: 1 }]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
  });

  it("sorts by itemId alphabetically", () => {
    const result = toLiveInventoryItems([
      { itemId: "z_item", quantity: 1 },
      { itemId: "a_item", quantity: 1 },
      { itemId: "m_item", quantity: 1 },
    ]);

    expect(result.map((i) => i.itemId)).toEqual(["a_item", "m_item", "z_item"]);
  });
});