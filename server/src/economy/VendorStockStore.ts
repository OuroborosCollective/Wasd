/**
 * VENDOR STOCK STORE
 *
 * Server-authoritative in-memory vendor stock store.
 * Deterministic: No Math.random(), stable ordering, no Date.now().
 */

import {
  createDefaultVendorStockState,
  normalizeStockQuantity,
  type VendorStockState,
} from "./VendorStockTypes.js";

export class VendorStockStore {
  private readonly stocks = new Map<string, VendorStockState>();

  /**
   * Get the stock state for a vendor.
   * Creates a default empty state if not yet tracked.
   */
  getStock(vendorId: string): VendorStockState {
    const existing = this.stocks.get(vendorId);
    if (existing) return existing;

    const created = createDefaultVendorStockState(vendorId);
    this.stocks.set(vendorId, created);
    return created;
  }

  /**
   * Get the quantity of a specific item in vendor stock.
   * Returns 0 if vendor or item not found.
   */
  getItemQuantity(vendorId: string, itemId: string): number {
    const state = this.getStock(vendorId);
    const qty = state.items[itemId];
    return typeof qty === "number" ? qty : 0;
  }

  /**
   * Add items to vendor stock.
   * Returns the new stock state.
   */
  addItems(vendorId: string, itemId: string, quantity: number): VendorStockState {
    const state = this.getStock(vendorId);
    const currentQty = this.getItemQuantity(vendorId, itemId);
    const addedQty = normalizeStockQuantity(quantity);

    if (addedQty === 0) return state;

    const nextItems: Record<string, number> = { ...state.items };
    nextItems[itemId] = currentQty + addedQty;

    const nextState: VendorStockState = {
      ...state,
      items: Object.freeze(nextItems),
    };

    this.stocks.set(vendorId, nextState);
    return nextState;
  }

  /**
   * Replace a vendor's stock state entirely.
   * Used for hydration from persistence.
   */
  replaceStock(vendorId: string, state: VendorStockState): void {
    this.stocks.set(vendorId, Object.freeze({
      vendorId: state.vendorId,
      schemaVersion: state.schemaVersion,
      items: Object.freeze({ ...state.items }),
    }));
  }

  /**
   * Get all stock entries as an array for a vendor.
   * Filters out zero-quantity items.
   */
  getStockEntries(vendorId: string): Array<{ itemId: string; quantity: number }> {
    const state = this.getStock(vendorId);
    return Object.entries(state.items)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }))
      .sort((a, b) => a.itemId.localeCompare(b.itemId));
  }

  /**
   * Clear all stock for testing.
   */
  clearForTests(): void {
    this.stocks.clear();
  }
}