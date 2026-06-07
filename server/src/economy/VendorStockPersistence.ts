/**
 * VENDOR STOCK PERSISTENCE
 *
 * Interface for vendor stock persistence adapters.
 * Follows the same pattern as WalletPersistence.
 */

import type { VendorStockState } from "./VendorStockTypes.js";

/**
 * Persisted vendor stock state shape for storage.
 */
export interface PersistedVendorStockState {
  readonly vendorId: string;
  readonly schemaVersion: 1;
  readonly items: Readonly<Record<string, number>>;
}

/**
 * Normalize a persisted state to ensure valid shape.
 */
export function createPersistedVendorStockState(
  vendorId: string,
  state: VendorStockState | PersistedVendorStockState,
): PersistedVendorStockState {
  const items: Record<string, number> = {};
  const sourceItems = "items" in state ? state.items : {};

  for (const [key, val] of Object.entries(sourceItems)) {
    const qty = Math.floor(Number(val));
    if (qty > 0) {
      items[key] = qty;
    }
  }

  return Object.freeze({
    vendorId: String(vendorId),
    schemaVersion: 1,
    items: Object.freeze(items),
  });
}

/**
 * Persistence adapter interface for vendor stock.
 */
export interface VendorStockPersistenceAdapter {
  /**
   * Load persisted stock state for a vendor.
   * Returns null if no persisted state exists.
   */
  loadStock(vendorId: string): Promise<PersistedVendorStockState | null>;

  /**
   * Save stock state for a vendor.
   */
  saveStock(state: PersistedVendorStockState): Promise<void>;

  /**
   * Health check for the persistence adapter.
   */
  health(): Promise<{ ok: boolean; driver: string; error?: string }>;
}