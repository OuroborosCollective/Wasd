import { describe, expect, it } from "vitest";
import { InventoryService } from "../../inventory/InventoryService";
import { InventoryStore } from "../../inventory/InventoryStore";
import type { InventoryPersistenceAdapter, PersistedPlayerInventoryState } from "../../inventory/InventoryPersistence";
import { EconomyService } from "../../economy/EconomyService";
import { WalletService } from "../../economy/WalletService";
import { WalletStore } from "../../economy/WalletStore";
import type { PersistedWalletState, WalletPersistenceAdapter } from "../../economy/WalletPersistence";
import { VendorStockService } from "../../economy/VendorStockService";
import { VendorStockStore } from "../../economy/VendorStockStore";
import type { PersistedVendorStockState, VendorStockPersistenceAdapter } from "../../economy/VendorStockPersistence";
import { RuntimeHistoryLog } from "../../history/RuntimeHistoryLog";
import {
  canonicalizeClientIntent,
  chunkKeyFromWorldPosition,
} from "../../intents/ServerCanonicalIntent";

class MemoryInventoryPersistence implements InventoryPersistenceAdapter {
  private readonly states = new Map<string, PersistedPlayerInventoryState>();

  async loadPlayerInventory(playerId: string): Promise<PersistedPlayerInventoryState | null> {
    return this.states.get(playerId) ?? null;
  }

  async savePlayerInventory(state: PersistedPlayerInventoryState): Promise<void> {
    this.states.set(state.playerId, state);
  }
}

class MemoryWalletPersistence implements WalletPersistenceAdapter {
  private readonly states = new Map<string, PersistedWalletState>();

  async loadWallet(playerId: string): Promise<PersistedWalletState | null> {
    return this.states.get(playerId) ?? null;
  }

  async saveWallet(state: PersistedWalletState): Promise<void> {
    this.states.set(state.playerId, state);
  }
}

class MemoryVendorStockPersistence implements VendorStockPersistenceAdapter {
  private readonly states = new Map<string, PersistedVendorStockState>();

  async loadStock(vendorId: string): Promise<PersistedVendorStockState | null> {
    return this.states.get(vendorId) ?? null;
  }

  async saveStock(state: PersistedVendorStockState): Promise<void> {
    this.states.set(state.vendorId, state);
  }

  async health(): Promise<{ ok: boolean; driver: string }> {
    return { ok: true, driver: "memory" };
  }
}

function normalizeForReplay(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(normalizeForReplay);
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => [key, normalizeForReplay(record[key])]),
  );
}

async function runVendorSellReplay() {
  const playerId = "vendor-sell-replay-player";
  const vendorId = "village_trader_001";
  const itemId = "wood_log";
  const quantity = 2;
  const currentTick = 240;
  const playerPosition = { x: 462, y: 503 };

  const canonicalIntent = canonicalizeClientIntent<"interact">(
    {
      action: "interact",
      payload: {
        targetId: vendorId,
        interaction: "sell_resource",
        itemId,
        quantity,
        playerPosition,
      },
    },
    {
      actorId: playerId,
      tickId: currentTick,
      logicalIndex: currentTick,
      receivedOrder: 0,
      chunkKey: chunkKeyFromWorldPosition(playerPosition),
    },
  );

  const inventory = new InventoryService(new InventoryStore(), new MemoryInventoryPersistence());
  const wallet = new WalletService(new WalletStore(), new MemoryWalletPersistence());
  const vendorStock = new VendorStockService(new VendorStockStore(), new MemoryVendorStockPersistence());
  const history = new RuntimeHistoryLog();
  const economy = new EconomyService(inventory, wallet, vendorStock, history);

  await inventory.addItem({
    playerId,
    itemId,
    quantity,
    origin: {
      uid: `${canonicalIntent.intentHash}:seed`,
      tick: currentTick,
      source: "system_delta",
      sourceHash: canonicalIntent.intentHash,
    },
  });

  const result = await economy.sellResource({
    playerId: canonicalIntent.actorId,
    itemId,
    quantity,
    playerPosition,
    vendorId,
    currentTick,
  });

  return normalizeForReplay({
    canonicalIntent,
    result,
    inventory: await inventory.getPlayerInventory(playerId),
    wallet: await wallet.getWallet(playerId),
    vendorStock: await vendorStock.getStock(vendorId),
    history: history.listByActor(playerId),
  });
}

describe("Vendor sell replay", () => {
  it("sells gathered resources through server price and deterministic deltas", async () => {
    const first = await runVendorSellReplay();
    const second = await runVendorSellReplay();

    expect(first).toEqual(second);
    expect(first).toEqual(
      expect.objectContaining({
        result: expect.objectContaining({
          ok: true,
          itemId: "wood_log",
          quantitySold: 2,
          reason: "sold",
          stockBefore: 0,
          stockAfter: 2,
        }),
        inventory: expect.objectContaining({
          slots: [],
        }),
        wallet: expect.objectContaining({
          balances: expect.objectContaining({
            coin: expect.any(Number),
          }),
        }),
        vendorStock: expect.objectContaining({
          items: expect.objectContaining({
            wood_log: 2,
          }),
        }),
      }),
    );
  });
});
