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

  getStock(vendorId: string): VendorStockState {
    const existing = this.stocks.get(vendorId);
    if (existing) return existing;

    const created = createDefaultVendorStockState(vendorId);
    this.stocks.set(vendorId, created);
    return created;
  }

  getItemQuantity(vendorId: string, itemId: string): number {
    const state = this.getStock(vendorId);
    const qty = state.items[itemId];
    return typeof qty === "number" ? qty : 0;
  }

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

  removeItems(vendorId: string, itemId: string, quantity: number): VendorStockState | null {
    const state = this.getStock(vendorId);
    const currentQty = this.getItemQuantity(vendorId, itemId);
    const removedQty = normalizeStockQuantity(quantity);

    if (removedQty === 0 || currentQty < removedQty) return null;

    const nextItems: Record<string, number> = { ...state.items };
    const nextQty = currentQty - removedQty;
    if (nextQty > 0) {
      nextItems[itemId] = nextQty;
    } else {
      delete nextItems[itemId];
    }

    const nextState: VendorStockState = {
      ...state,
      items: Object.freeze(Object.fromEntries(Object.entries(nextItems).sort(([a], [b]) => a.localeCompare(b)))),
    };

    this.stocks.set(vendorId, nextState);
    return nextState;
  }

  replaceStock(vendorId: string, state: VendorStockState): void {
    this.stocks.set(vendorId, Object.freeze({
      vendorId: state.vendorId,
      schemaVersion: state.schemaVersion,
      items: Object.freeze(Object.fromEntries(Object.entries(state.items).sort(([a], [b]) => a.localeCompare(b)))),
    }));
  }

  getStockEntries(vendorId: string): Array<{ itemId: string; quantity: number }> {
    const state = this.getStock(vendorId);
    return Object.entries(state.items)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }))
      .sort((a, b) => a.itemId.localeCompare(b.itemId));
  }

  clearForTests(): void {
    this.stocks.clear();
  }
}
