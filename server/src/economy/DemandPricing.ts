/**
 * DEMAND PRICING
 *
 * Deterministic demand-based pricing for vendor purchases.
 * Prices decrease as vendor stock increases to simulate supply/demand.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now()
 * - Integer prices only
 * - No negative prices (floor of 1 coin)
 */

import { RESOURCE_SELL_PRICES, getSellPrice } from "./ResourceSellPrices.js";
import type { DemandBand } from "./VendorStockTypes.js";

/**
 * Demand pricing thresholds.
 * These define when prices decrease based on vendor stock level.
 */
export const DEMAND_THRESHOLDS = {
  /** Stock 0-9: Normal demand, base price */
  NORMAL_MAX: 9,
  /** Stock 10-24: Stocked, price - 1 */
  STOCKED_MAX: 24,
  /** Stock 25+: Oversupplied, price - 2 (floor 1) */
  // No upper limit for oversupplied
} as const;

/**
 * Price adjustment per demand band.
 */
export const DEMAND_PRICE_ADJUSTMENT: Record<DemandBand, number> = {
  normal: 0,
  stocked: -1,
  oversupplied: -2,
};

/**
 * Calculate the demand band based on current vendor stock.
 */
export function getDemandBand(stockQuantity: number): DemandBand {
  if (stockQuantity <= DEMAND_THRESHOLDS.NORMAL_MAX) {
    return "normal";
  }
  if (stockQuantity <= DEMAND_THRESHOLDS.STOCKED_MAX) {
    return "stocked";
  }
  return "oversupplied";
}

/**
 * Calculate the dynamic sell price based on:
 * - Base price from RESOURCE_SELL_PRICES
 * - Current vendor stock for that item
 * - Demand band adjustment
 *
 * Returns the actual unit price the player will receive.
 * Minimum price is 1 coin (floor).
 */
export function calculateDynamicPrice(
  itemId: string,
  currentVendorStock: number,
): {
  unitPrice: number;
  basePrice: number;
  demandBand: DemandBand;
} {
  const priceResult = getSellPrice(itemId);

  // If item is not sellable, return zeros
  if (!priceResult.sellable) {
    return {
      unitPrice: 0,
      basePrice: 0,
      demandBand: "normal",
    };
  }

  const basePrice = priceResult.price;
  const demandBand = getDemandBand(currentVendorStock);
  const adjustment = DEMAND_PRICE_ADJUSTMENT[demandBand];

  // Apply adjustment with floor of 1
  const unitPrice = Math.max(1, basePrice + adjustment);

  return {
    unitPrice,
    basePrice,
    demandBand,
  };
}

/**
 * Get the current demand hint for a vendor based on their stock.
 * Returns a dialogue-appropriate message about what the vendor needs.
 */
export function getDemandHint(
  stockEntries: Array<{ itemId: string; quantity: number }>,
): {
  needsStock: boolean;
  overstockedItems: string[];
  message: string;
} {
  const overstockedItems: string[] = [];
  let totalStock = 0;

  for (const entry of stockEntries) {
    totalStock += entry.quantity;
    const band = getDemandBand(entry.quantity);
    if (band === "oversupplied") {
      overstockedItems.push(entry.itemId);
    }
  }

  const needsStock = totalStock < 10;

  let message: string;
  if (needsStock) {
    message = "I need more supplies. Processed goods pay best.";
  } else if (overstockedItems.includes("wood_log")) {
    message = "I have plenty of logs. Ingots and cooked fish pay better.";
  } else if (overstockedItems.length > 0) {
    message = "I have plenty of that. Try selling something else.";
  } else {
    message = "I buy wood, ore, and fish. Bring me what you gather. Processed goods pay best.";
  }

  return {
    needsStock,
    overstockedItems,
    message,
  };
}

/**
 * Check if an item's price is affected by current stock.
 * Useful for UI to show "price down" indicators.
 */
export function isPriceAffected(itemId: string, currentVendorStock: number): boolean {
  const priceResult = getSellPrice(itemId);
  if (!priceResult.sellable) return false;

  return currentVendorStock >= DEMAND_THRESHOLDS.NORMAL_MAX + 1;
}