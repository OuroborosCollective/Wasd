import { describe, expect, it } from "vitest";
import { EconomyService } from "../../economy/EconomyService";
import { WalletService } from "../../economy/WalletService";
import { WalletStore } from "../../economy/WalletStore";
import type { PersistedWalletState, WalletPersistenceAdapter } from "../../economy/WalletPersistence";
import { VendorStockService } from "../../economy/VendorStockService";
import { VendorStockStore } from "../../economy/VendorStockStore";
import type { PersistedVendorStockState, VendorStockPersistenceAdapter } from "../../economy/VendorStockPersistence";
import { InventoryService } from "../../inventory/InventoryService";
import { InventoryStore } from "../../inventory/InventoryStore";
import {
  createPersistedPlayerInventoryState,
  type InventoryPersistenceAdapter,
  type PersistedPlayerInventoryState,
} from "../../inventory/InventoryPersistence";
import { RuntimeHistoryLog } from "../../history/RuntimeHistoryLog";

class MemoryInventoryPersistence implements InventoryPersistenceAdapter {
  private readonly states = new Map<string, PersistedPlayerInventoryState>();
  failNextSave = false;

  async loadPlayerInventory(playerId: string): Promise<PersistedPlayerInventoryState | null> {
    const state = this.states.get(playerId);
    return state
      ? createPersistedPlayerInventoryState(state.playerId, state, state.appliedOriginUids)
      : null;
  }

  async savePlayerInventory(state: PersistedPlayerInventoryState): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error("inventory_save_failed");
    }
    this.states.set(
      state.playerId,
      createPersistedPlayerInventoryState(state.playerId, state, state.appliedOriginUids),
    );
  }
}

class MemoryWalletPersistence implements WalletPersistenceAdapter {
  private readonly states = new Map<string, PersistedWalletState>();
  failNextSave = false;

  async loadWallet(playerId: string): Promise<PersistedWalletState | null> {
    const state = this.states.get(playerId);
    return state ? { ...state, balances: { ...state.balances } } : null;
  }

  async saveWallet(state: PersistedWalletState): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error("wallet_save_failed");
    }
    this.states.set(state.playerId, { ...state, balances: { ...state.balances } });
  }
}

class MemoryVendorStockPersistence implements VendorStockPersistenceAdapter {
  private readonly states = new Map<string, PersistedVendorStockState>();
  failNextSave = false;

  async loadStock(vendorId: string): Promise<PersistedVendorStockState | null> {
    const state = this.states.get(vendorId);
    return state ? { ...state, items: { ...state.items } } : null;
  }

  async saveStock(state: PersistedVendorStockState): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error("vendor_stock_save_failed");
    }
    this.states.set(state.vendorId, { ...state, items: { ...state.items } });
  }

  async health(): Promise<{ ok: boolean; driver: string }> {
    return { ok: true, driver: "memory" };
  }
}

class FailSecondRemoveInventoryStore extends InventoryStore {
  private removeCount = 0;

  override removeItem(
    input: Parameters<InventoryStore["removeItem"]>[0],
  ): ReturnType<InventoryStore["removeItem"]> {
    this.removeCount += 1;
    if (this.removeCount === 2) {
      return {
        ok: false,
        playerId: input.playerId,
        itemId: input.itemId === "copper_ore" ? "copper_ore" : "wood_log",
        quantity: input.quantity,
        reason: "not_enough_items",
        state: this.getPlayerInventory(input.playerId),
      };
    }
    return super.removeItem(input);
  }
}

function createRuntime(store: InventoryStore = new InventoryStore()) {
  const inventoryPersistence = new MemoryInventoryPersistence();
  const walletPersistence = new MemoryWalletPersistence();
  const vendorPersistence = new MemoryVendorStockPersistence();
  const inventory = new InventoryService(store, inventoryPersistence);
  const wallet = new WalletService(new WalletStore(), walletPersistence);
  const vendor = new VendorStockService(new VendorStockStore(), vendorPersistence);
  const economy = new EconomyService(inventory, wallet, vendor, new RuntimeHistoryLog());

  return {
    economy,
    inventory,
    inventoryPersistence,
    store,
    wallet,
    walletPersistence,
    vendor,
    vendorPersistence,
  };
}

const PLAYER_POSITION = { x: 462, y: 503 };
const VENDOR_ID = "village_trader_001";

describe("Economy atomicity and persisted idempotency", () => {
  it("restores inventory, wallet, stock, and movement events when sell persistence fails", async () => {
    const runtime = createRuntime();
    await runtime.inventory.addItem({ playerId: "seller", itemId: "wood_log", quantity: 2 });
    const movementCountBefore = runtime.store.getMovementEventCount();
    runtime.walletPersistence.failNextSave = true;

    const result = await runtime.economy.sellResource({
      playerId: "seller",
      itemId: "wood_log",
      quantity: 2,
      playerPosition: PLAYER_POSITION,
      vendorId: VENDOR_ID,
      currentTick: 100,
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: "transaction_failed" }));
    expect((await runtime.inventory.getPlayerInventory("seller")).slots).toEqual([
      expect.objectContaining({ itemId: "wood_log", quantity: 2 }),
    ]);
    expect((await runtime.wallet.getWallet("seller")).balances.coin).toBe(0);
    expect(await runtime.vendor.getItemQuantity(VENDOR_ID, "wood_log")).toBe(0);
    expect(runtime.store.getMovementEventCount()).toBe(movementCountBefore);
  });

  it("restores stock, wallet, inventory, origins, and movement events when buy inventory persistence fails", async () => {
    const runtime = createRuntime();
    await runtime.wallet.addCoins({ playerId: "buyer", amount: 100 });
    await runtime.vendor.addItems(VENDOR_ID, "wood_log", 5);
    runtime.inventoryPersistence.failNextSave = true;

    const result = await runtime.economy.buyResource({
      playerId: "buyer",
      itemId: "wood_log",
      quantity: 1,
      playerPosition: PLAYER_POSITION,
      vendorId: VENDOR_ID,
      currentTick: 101,
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: "transaction_failed" }));
    expect((await runtime.inventory.getPlayerInventory("buyer")).slots).toEqual([]);
    expect(runtime.inventory.getAppliedOriginUids("buyer")).toEqual([]);
    expect(runtime.store.getMovementEventCount()).toBe(0);
    expect((await runtime.wallet.getWallet("buyer")).balances.coin).toBe(100);
    expect(await runtime.vendor.getItemQuantity(VENDOR_ID, "wood_log")).toBe(5);
  });

  it("does not pay or stock sell-all when one inventory removal fails", async () => {
    const runtime = createRuntime(new FailSecondRemoveInventoryStore());
    await runtime.inventory.addItem({ playerId: "bulk-seller", itemId: "wood_log", quantity: 2 });
    await runtime.inventory.addItem({ playerId: "bulk-seller", itemId: "copper_ore", quantity: 3 });
    const movementCountBefore = runtime.store.getMovementEventCount();

    const result = await runtime.economy.sellAllResources({
      playerId: "bulk-seller",
      playerPosition: PLAYER_POSITION,
      vendorId: VENDOR_ID,
      currentTick: 102,
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: "transaction_failed" }));
    expect((await runtime.inventory.getPlayerInventory("bulk-seller")).slots).toEqual([
      expect.objectContaining({ itemId: "copper_ore", quantity: 3 }),
      expect.objectContaining({ itemId: "wood_log", quantity: 2 }),
    ]);
    expect((await runtime.wallet.getWallet("bulk-seller")).balances.coin).toBe(0);
    expect(await runtime.vendor.getItemQuantity(VENDOR_ID, "wood_log")).toBe(0);
    expect(await runtime.vendor.getItemQuantity(VENDOR_ID, "copper_ore")).toBe(0);
    expect(runtime.store.getMovementEventCount()).toBe(movementCountBefore);
  });

  it("hydrates applied origins after restart and scopes duplicate detection per player", async () => {
    const persistence = new MemoryInventoryPersistence();
    const first = new InventoryService(new InventoryStore(), persistence);
    const origin = {
      uid: "canonical-origin-001",
      tick: 200,
      source: "gather_delta" as const,
      sourceHash: "hash-001",
    };

    expect(await first.addItem({ playerId: "player-a", itemId: "wood_log", quantity: 1, origin }))
      .toEqual(expect.objectContaining({ ok: true }));

    const restarted = new InventoryService(new InventoryStore(), persistence);
    expect(await restarted.addItem({ playerId: "player-a", itemId: "wood_log", quantity: 1, origin }))
      .toEqual(expect.objectContaining({ ok: false, reason: "duplicate_origin" }));
    expect(await restarted.addItem({ playerId: "player-b", itemId: "wood_log", quantity: 1, origin }))
      .toEqual(expect.objectContaining({ ok: true }));
  });
});
