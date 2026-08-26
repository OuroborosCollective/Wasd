/**
 * VENDOR STOCK SERVICE
 *
 * Server-authoritative vendor stock service with persistence hydration.
 * Deterministic: seeded/tick-safe runtime and stable ordering.
 */

import { VendorStockStore } from "./VendorStockStore.js";
import {
  createPersistedVendorStockState,
  type VendorStockPersistenceAdapter,
} from "./VendorStockPersistence.js";
import type { VendorStockState } from "./VendorStockTypes.js";

export class VendorStockService {
  private readonly hydratedVendors = new Set<string>();

  constructor(
    private readonly store: VendorStockStore,
    private readonly persistence: VendorStockPersistenceAdapter,
  ) {}

  async getStock(vendorId: string): Promise<VendorStockState> {
    await this.hydrateVendor(vendorId);
    return this.store.getStock(vendorId);
  }

  async getItemQuantity(vendorId: string, itemId: string): Promise<number> {
    await this.hydrateVendor(vendorId);
    return this.store.getItemQuantity(vendorId, itemId);
  }

  async addItems(vendorId: string, itemId: string, quantity: number): Promise<VendorStockState> {
    await this.hydrateVendor(vendorId);
    const result = this.store.addItems(vendorId, itemId, quantity);

    if (result.items[itemId] !== undefined) {
      await this.persistStock(vendorId, result);
    }

    return result;
  }

  async removeItems(vendorId: string, itemId: string, quantity: number): Promise<VendorStockState | null> {
    await this.hydrateVendor(vendorId);
    const result = this.store.removeItems(vendorId, itemId, quantity);
    if (!result) return null;
    await this.persistStock(vendorId, result);
    return result;
  }

  async getStockEntries(vendorId: string): Promise<Array<{ itemId: string; quantity: number }>> {
    await this.hydrateVendor(vendorId);
    return this.store.getStockEntries(vendorId);
  }

  async persistStock(vendorId: string, state: VendorStockState): Promise<void> {
    await this.persistence.saveStock(createPersistedVendorStockState(vendorId, state));
  }

  async restoreStock(vendorId: string, state: VendorStockState): Promise<void> {
    const restored: VendorStockState = Object.freeze({
      vendorId,
      schemaVersion: 1,
      items: Object.freeze({ ...state.items }),
    });
    this.store.replaceStock(vendorId, restored);
    this.hydratedVendors.add(vendorId);
    await this.persistStock(vendorId, restored);
  }

  private async hydrateVendor(vendorId: string): Promise<void> {
    if (this.hydratedVendors.has(vendorId)) return;

    const persisted = await this.persistence.loadStock(vendorId);
    if (persisted) {
      this.store.replaceStock(vendorId, persisted);
    }

    this.hydratedVendors.add(vendorId);
  }

  clearForTests(): void {
    this.hydratedVendors.clear();
  }
}
