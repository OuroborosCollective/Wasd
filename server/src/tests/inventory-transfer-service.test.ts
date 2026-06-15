import { describe, expect, it, beforeEach } from "vitest";
import { InventoryStore } from "../inventory/InventoryStore.js";
import { transferInventoryItem } from "../inventory/InventoryTransferService.js";

describe("InventoryTransferService", () => {
  let store: InventoryStore;

  beforeEach(() => {
    store = new InventoryStore();
  });

  it("moves items between server inventories with trade origin evidence", () => {
    store.addItem({ playerId: "sender", itemId: "wood_log", quantity: 5 });

    const result = transferInventoryItem(store, {
      fromPlayerId: "sender",
      toPlayerId: "receiver",
      itemId: "wood_log",
      quantity: 2,
      tick: 120,
      uid: "trade:sender:receiver:wood_log:120:001",
      sourceHash: "trade_hash_001",
    });

    expect(result.ok).toBe(true);
    expect(result.reason).toBe("transferred");
    expect(result.movementHashes).toHaveLength(2);
    expect(store.getPlayerInventory("sender").slots[0].quantity).toBe(3);
    expect(store.getPlayerInventory("receiver").slots[0].quantity).toBe(2);

    const events = store.getMovementEvents();
    const addEvent = events[events.length - 1];
    expect(addEvent.movement).toBe("add");
    expect(addEvent.origin?.source).toBe("trade_delta");
    expect(addEvent.origin?.uid).toBe("trade:sender:receiver:wood_log:120:001");
    expect(addEvent.origin?.sourceHash).toBe("trade_hash_001");
  });

  it("rejects duplicate trade origin uid before mutating inventories", () => {
    store.addItem({ playerId: "sender", itemId: "wood_log", quantity: 5 });

    const first = transferInventoryItem(store, {
      fromPlayerId: "sender",
      toPlayerId: "receiver",
      itemId: "wood_log",
      quantity: 2,
      tick: 121,
      uid: "trade:sender:receiver:wood_log:121:dup",
      sourceHash: "trade_hash_dup",
    });
    const eventCountAfterFirst = store.getMovementEvents().length;

    const second = transferInventoryItem(store, {
      fromPlayerId: "sender",
      toPlayerId: "receiver",
      itemId: "wood_log",
      quantity: 2,
      tick: 121,
      uid: "trade:sender:receiver:wood_log:121:dup",
      sourceHash: "trade_hash_dup",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("duplicate_origin");
    expect(store.getPlayerInventory("sender").slots[0].quantity).toBe(3);
    expect(store.getPlayerInventory("receiver").slots[0].quantity).toBe(2);
    expect(store.getMovementEvents()).toHaveLength(eventCountAfterFirst);
  });

  it("rejects missing sender inventory without movement side effects", () => {
    const result = transferInventoryItem(store, {
      fromPlayerId: "sender",
      toPlayerId: "receiver",
      itemId: "wood_log",
      quantity: 1,
      tick: 122,
      uid: "trade:sender:receiver:wood_log:122:missing",
      sourceHash: "trade_hash_missing",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_enough_items");
    expect(store.getMovementEvents()).toEqual([]);
    expect(store.getPlayerInventory("receiver").slots).toEqual([]);
  });

  it("rejects malformed transfer origin without mutating inventories", () => {
    store.addItem({ playerId: "sender", itemId: "wood_log", quantity: 5 });
    const beforeEvents = store.getMovementEvents().length;

    const result = transferInventoryItem(store, {
      fromPlayerId: "sender",
      toPlayerId: "receiver",
      itemId: "wood_log",
      quantity: 1,
      tick: -1,
      uid: "",
      sourceHash: "",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_origin");
    expect(store.getPlayerInventory("sender").slots[0].quantity).toBe(5);
    expect(store.getMovementEvents()).toHaveLength(beforeEvents);
  });

  it("rejects same-player transfers", () => {
    store.addItem({ playerId: "sender", itemId: "wood_log", quantity: 5 });

    const result = transferInventoryItem(store, {
      fromPlayerId: "sender",
      toPlayerId: "sender",
      itemId: "wood_log",
      quantity: 1,
      tick: 123,
      uid: "trade:sender:sender:wood_log:123:same",
      sourceHash: "trade_hash_same",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("same_player");
    expect(store.getPlayerInventory("sender").slots[0].quantity).toBe(5);
  });
});
