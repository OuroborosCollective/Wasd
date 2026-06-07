/**
 * VENDOR STOCK SERVICE
 *
 * Server-authoritative vendor stock service with persistence hydration.
 * Deterministic: No Math.random(), no Date.now(), stable ordering.
 */

import { VendorStockStore } from "./VendorStockStore.js";
import type {
  VendorStockPersistenceAdapter,
  PersistedVendorStockState,
} from "./VendorStockPersistence.js";
import type { VendorStockState } from "./VendorStockTypes.js";

export class VendorStockService {
  private readonly hydratedVendors = new Set<string>();

  constructor(
    private readonly store: VendorStockStore,
    private readonly persistence: VendorStockPersistenceAdapter,
  ) {}

  /**
   * Get the stock state for a vendor.
   */
  async getStock(vendorId: string): Promise<VendorStockState> {
    await this.hydrateVendor(vendorId);
    return this.store.getStock(vendorId);
  }

  /**
   * Get the quantity of a specific item in vendor stock.
   */
  async getItemQuantity(vendorId: string, itemId: string): Promise<number> {
    await this.hydrateVendor(vendorId);
    return this.store.getItemQuantity(vendorId, itemId);
  }

  /**
   * Add items to vendor stock after a player sells them.
   * Persists the updated state.
   */
  async addItems(vendorId: string, itemId: string, quantity: number): Promise<VendorStockState> {
    await this.hydrateVendor(vendorId);
    const result = this.store.addItems(vendorId, itemId, quantity);

    if (result.items[itemId] !== undefined) {
      await this.persistence.saveStock(
        createPersistedVendorStockState(vendorId, result),
      );
    }

    return result;
  }

  /**
   * Get all stock entries as an array for a vendor.
   */
  async getStockEntries(vendorId: string): Promise<Array<{ itemId: string; quantity: number }>> {
    await this.hydrateVendor(vendorId);
    return this.store.getStockEntries(vendorId);
  }

  /**
   * Hydrate a vendor's stock from persistence.
   */
  private async hydrateVendor(vendorId: string): Promise<void> {
    if (this.hydratedVendors.has(vendorId)) return;

    const persisted = await this.persistence.loadStock(vendorId);
    if (persisted) {
      this.store.replaceStock(vendorId, persisted);
    }

    this.hydratedVendors.add(vendorId);
  }

  /**
   * Clear hydration state for testing.
   */
  clearForTests(): void {
    this.hydratedVendors.clear();
  }
}

/**
 * Create a persisted vendor stock state from a runtime state.
 */
function createPersistedVendorStockState(
  vendorId: string,
  state: VendorStockState,
): PersistedVendorStockState {
  return {
    vendorId,
    schemaVersion: state.schemaVersion,
    items: { ...state.items },
  };
}