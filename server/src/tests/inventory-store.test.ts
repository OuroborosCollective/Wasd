/**
 * INVENTORY STORE UNIT TESTS
 *
 * Tests for server-authoritative inventory store.
 * Deterministic, player-isolated, stackable items.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { InventoryStore } from "../inventory/InventoryStore.js";

describe("InventoryStore", () => {
  let store: InventoryStore;

  beforeEach(() => {
    store = new InventoryStore();
  });

  describe("getPlayerInventory", () => {
    it("creates empty inventory for new player", () => {
      const state = store.getPlayerInventory("p1");

      expect(state.playerId).toBe("p1");
      expect(state.slots).toEqual([]);
      expect(state.capacity).toBe(32);
    });

    it("returns equivalent state for same playerId", () => {
      const state1 = store.getPlayerInventory("p1");
      const state2 = store.getPlayerInventory("p1");

      expect(state2).toEqual(state1);
    });

    it("has correct schema version", () => {
      const state = store.getPlayerInventory("p1");

      expect(state.schemaVersion).toBe(1);
    });
  });

  describe("addItem - stackable resources", () => {
    it("adds wood_log to empty inventory", () => {
      const result = store.addItem({
        playerId: "p1",
        itemId: "wood_log",
        quantity: 1,
      });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe("added");
      expect(result.state?.slots).toHaveLength(1);
      expect(result.state?.slots[0].itemId).toBe("wood_log");
      expect(result.state?.slots[0].quantity).toBe(1);
    });

    it("stacks same item deterministically", () => {
      store.addItem({ playerId: "p1", itemId: "wood_log", quantity: 1 });

      const result = store.addItem({ playerId: "p1", itemId: "wood_log", quantity: 2 });

      expect(result.ok).toBe(true);
      expect(result.state?.slots).toHaveLength(1);
      expect(result.state?.slots[0].itemId).toBe("wood_log");
      expect(result.state?.slots[0].quantity).toBe(3);
    });

    it("respects maxStack limit", () => {
      store.addItem({ playerId: "p1", itemId: "wood_log", quantity: 998 });

      const result = store.addItem({ playerId: "p1", itemId: "wood_log", quantity: 5 });

      expect(result.ok).toBe(true);
      expect(result.state?.slots[0].quantity).toBe(999);
    });
  });

  describe("addItem - origin checks", () => {
    it("records deterministic add movement events with origin evidence", () => {
      const result = store.addItem({
        playerId: "p1",
        itemId: "wood_log",
        quantity: 2,
        origin: { uid: "loot:p1:tick10:wood:001", tick: 10, source: "loot_delta", sourceHash: "loot_hash_001" },
      });

      expect(result.ok).toBe(true);
      const events = store.getMovementEvents("p1");
      expect(events).toHaveLength(1);
      expect(events[0].movement).toBe("add");
      expect(events[0].movementHash).toMatch(/^[0-9a-f]+$/);
      expect(events[0].beforeStateHash).not.toBe(events[0].afterStateHash);
      expect(events[0].origin?.uid).toBe("loot:p1:tick10:wood:001");
    });

    it("rejects duplicate origin uid without mutating inventory", () => {
      const first = store.addItem({
        playerId: "p1",
        itemId: "wood_log",
        quantity: 1,
        origin: { uid: "loot:p1:tick10:wood:002", tick: 10, source: "loot_delta", sourceHash: "loot_hash_002" },
      });
      const second = store.addItem({
        playerId: "p1",
        itemId: "wood_log",
        quantity: 99,
        origin: { uid: "loot:p1:tick10:wood:002", tick: 10, source: "loot_delta", sourceHash: "loot_hash_002" },
      });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(false);
      expect(second.reason).toBe("duplicate_origin");
      expect(store.getPlayerInventory("p1").slots[0].quantity).toBe(1);
      expect(store.getMovementEvents("p1")).toHaveLength(1);
    });

    it("rejects malformed origin data", () => {
      const result = store.addItem({
        playerId: "p1",
        itemId: "wood_log",
        quantity: 1,
        origin: { uid: "", tick: -1, source: "loot_delta", sourceHash: "" },
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_origin");
      expect(store.getPlayerInventory("p1").slots).toEqual([]);
      expect(store.getMovementEvents("p1")).toEqual([]);
    });
  });

  describe("addItem - different items", () => {
    it("creates separate slots for different items", () => {
      store.addItem({ playerId: "p1", itemId: "wood_log", quantity: 1 });
      store.addItem({ playerId: "p1", itemId: "copper_ore", quantity: 1 });

      const state = store.getPlayerInventory("p1");

      expect(state.slots).toHaveLength(2);
      expect(state.slots.find((s) => s.itemId === "wood_log")?.quantity).toBe(1);
      expect(state.slots.find((s) => s.itemId === "copper_ore")?.quantity).toBe(1);
    });
  });

  describe("addItem - validation", () => {
    it("rejects invalid item ids", () => {
      const result = store.addItem({ playerId: "p1", itemId: "admin_sword", quantity: 1 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_item");
    });

    it("rejects zero quantity", () => {
      const result = store.addItem({ playerId: "p1", itemId: "wood_log", quantity: 0 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_quantity");
    });

    it("rejects negative quantity", () => {
      const result = store.addItem({ playerId: "p1", itemId: "wood_log", quantity: -5 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_quantity");
    });

    it("rejects anonymous playerId", () => {
      const result = store.addItem({ playerId: "anonymous", itemId: "wood_log", quantity: 1 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_item");
    });

    it("rejects empty playerId", () => {
      const result = store.addItem({ playerId: "", itemId: "wood_log", quantity: 1 });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_item");
    });
  });

  describe("removeItem", () => {
    it("records remove movement events", () => {
      store.addItem({ playerId: "p1", itemId: "wood_log", quantity: 5 });
      const result = store.removeItem({ playerId: "p1", itemId: "wood_log", quantity: 2 });

      expect(result.ok).toBe(true);
      const events = store.getMovementEvents("p1");
      expect(events).toHaveLength(2);
      expect(events[1].movement).toBe("remove");
      expect(events[1].beforeStateHash).not.toBe(events[1].afterStateHash);
      expect(result.state?.slots[0].quantity).toBe(3);
    });
  });

  describe("player isolation", () => {
    it("isolates player inventory by playerId", () => {
      store.addItem({ playerId: "p1", itemId: "raw_fish", quantity: 5 });
      const p2Inventory = store.getPlayerInventory("p2");
      expect(p2Inventory.slots).toEqual([]);
    });

    it("each player has independent inventory", () => {
      store.addItem({ playerId: "p1", itemId: "wood_log", quantity: 10 });
      store.addItem({ playerId: "p2", itemId: "copper_ore", quantity: 3 });

      const p1State = store.getPlayerInventory("p1");
      const p2State = store.getPlayerInventory("p2");

      expect(p1State.slots).toHaveLength(1);
      expect(p1State.slots[0].itemId).toBe("wood_log");
      expect(p1State.slots[0].quantity).toBe(10);
      expect(p2State.slots).toHaveLength(1);
      expect(p2State.slots[0].itemId).toBe("copper_ore");
      expect(p2State.slots[0].quantity).toBe(3);
    });
  });

  describe("replacePlayerInventory", () => {
    it("replaces player inventory from persistence", () => {
      store.addItem({ playerId: "p1", itemId: "wood_log", quantity: 1 });
      store.replacePlayerInventory("p1", {
        playerId: "p1",
        schemaVersion: 1,
        capacity: 32,
        slots: [{ slotId: "slot_wood_log", itemId: "wood_log", name: "Wood Log", quantity: 50, category: "resource", stackable: true, maxStack: 999 }],
      });

      const state = store.getPlayerInventory("p1");
      expect(state.slots).toHaveLength(1);
      expect(state.slots[0].quantity).toBe(50);
    });
  });

  describe("clearForTests", () => {
    it("clears all player inventory and movement events", () => {
      store.addItem({ playerId: "p1", itemId: "wood_log", quantity: 10 });
      store.addItem({ playerId: "p2", itemId: "copper_ore", quantity: 5 });

      store.clearForTests();

      expect(store.getPlayerInventory("p1").slots).toEqual([]);
      expect(store.getPlayerInventory("p2").slots).toEqual([]);
      expect(store.getMovementEvents()).toEqual([]);
    });
  });
});
