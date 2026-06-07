/**
 * VENDOR STOCK TYPES
 *
 * Server-authoritative vendor stock state for the economy system.
 * Tracks how many of each item a vendor has purchased from players.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now()
 * - Deterministic IDs and positions
 * - Integer quantities only
 */

/**
 * Vendor stock entry - tracks quantity of a specific item in vendor stock.
 */
export interface VendorStockEntry {
  readonly itemId: string;
  readonly quantity: number;
}

/**
 * Complete vendor stock state.
 * Maps itemId to quantity purchased from players.
 */
export interface VendorStockState {
  readonly vendorId: string;
  readonly schemaVersion: 1;
  readonly items: Readonly<Record<string, number>>;
}

/**
 * Snapshot representation of vendor stock for client display.
 */
export interface VendorStockSnapshot {
  readonly itemId: string;
  readonly quantity: number;
}

/**
 * Vendor price information for client display.
 */
export interface VendorPriceInfo {
  readonly itemId: string;
  readonly unitPrice: number;
  readonly basePrice: number;
  readonly demandBand: DemandBand;
}

/**
 * Demand bands for pricing.
 * - normal: Vendor needs stock (base price)
 * - stocked: Vendor has some stock (price - 1)
 * - oversupplied: Vendor has plenty (price - 2, floor 1)
 */
export type DemandBand = "normal" | "stocked" | "oversupplied";

/**
 * Create an empty vendor stock state.
 */
export function createDefaultVendorStockState(vendorId: string): VendorStockState {
  return Object.freeze({
    vendorId,
    schemaVersion: 1,
    items: Object.freeze({}),
  });
}

/**
 * Normalize a quantity to a safe non-negative integer.
 */
export function normalizeStockQuantity(qty: unknown): number {
  const n = Math.floor(Number(qty));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}