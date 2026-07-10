import { describe, expect, it } from "vitest";
import { InventoryService } from "../../inventory/InventoryService";
import { InventoryStore } from "../../inventory/InventoryStore";
import {
  createPersistedPlayerInventoryState,
  type InventoryPersistenceAdapter,
  type PersistedPlayerInventoryState,
} from "../../inventory/InventoryPersistence";
import { transferInventoryItemPersistent } from "../../inventory/InventoryTransferService";

class MemoryInventoryPersistence implements InventoryPersistenceAdapter {
  private readonly states = new Map<string, PersistedPlayerInventoryState>();
  failNextPlayerId: string | null = null;

  async loadPlayerInventory(playerId: string): Promise<PersistedPlayerInventoryState | null> {
    const state = this.states.get(playerId);
    return state
      ? createPersistedPlayerInventoryState(state.playerId, state, state.appliedOriginUids)
      : null;
  }

  async savePlayerInventory(state: PersistedPlayerInventoryState): Promise<void> {
    if (this.failNextPlayerId === state.playerId) {
      this.failNextPlayerId = null;
      throw new Error(`save_failed:${state.playerId}`);
    }
    this.states.set(
      state.playerId,
      createPersistedPlayerInventoryState(state.playerId, state, state.appliedOriginUids),
    );
  }
}

function transferInput() {
  return {
    fromPlayerId: "sender",
    toPlayerId: "receiver",
    itemId: "wood_log",
    quantity: 2,
    tick: 88,
    uid: "trade:intent-hash-88",
    sourceHash: "intent-hash-88",
  } as const;
}

describe("persistent inventory transfer", () => {
  it("persists both player states and movement evidence", async () => {
    const persistence = new MemoryInventoryPersistence();
    const service = new InventoryService(new InventoryStore(), persistence);
    await service.addItem({ playerId: "sender", itemId: "wood_log", quantity: 3 });
    const movementCountBefore = service.getMovementEventCount();

    const result = await transferInventoryItemPersistent(service, transferInput());

    expect(result).toEqual(expect.objectContaining({
      ok: true,
      reason: "transferred",
      movementHashes: expect.arrayContaining([expect.any(String), expect.any(String)]),
    }));
    expect(result.movementHashes).toHaveLength(2);
    expect(service.getMovementEventCount()).toBe(movementCountBefore + 2);

    const restarted = new InventoryService(new InventoryStore(), persistence);
    expect((await restarted.getPlayerInventory("sender")).slots).toEqual([
      expect.objectContaining({ itemId: "wood_log", quantity: 1 }),
    ]);
    expect((await restarted.getPlayerInventory("receiver")).slots).toEqual([
      expect.objectContaining({ itemId: "wood_log", quantity: 2 }),
    ]);
    expect(restarted.getAppliedOriginUids("receiver")).toEqual(["trade:intent-hash-88"]);
  });

  it("restores sender, receiver, origins, and events when receiver persistence fails", async () => {
    const persistence = new MemoryInventoryPersistence();
    const service = new InventoryService(new InventoryStore(), persistence);
    await service.addItem({ playerId: "sender", itemId: "wood_log", quantity: 3 });
    const movementCountBefore = service.getMovementEventCount();
    persistence.failNextPlayerId = "receiver";

    const result = await transferInventoryItemPersistent(service, transferInput());

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: "transaction_failed" }));
    expect((await service.getPlayerInventory("sender")).slots).toEqual([
      expect.objectContaining({ itemId: "wood_log", quantity: 3 }),
    ]);
    expect((await service.getPlayerInventory("receiver")).slots).toEqual([]);
    expect(service.getAppliedOriginUids("receiver")).toEqual([]);
    expect(service.getMovementEventCount()).toBe(movementCountBefore);

    const restarted = new InventoryService(new InventoryStore(), persistence);
    expect((await restarted.getPlayerInventory("sender")).slots).toEqual([
      expect.objectContaining({ itemId: "wood_log", quantity: 3 }),
    ]);
    expect((await restarted.getPlayerInventory("receiver")).slots).toEqual([]);
  });
});
