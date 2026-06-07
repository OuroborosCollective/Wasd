/**
 * CAMP STOCK PRICES
 *
 * Fixed buy prices for camp stock items.
 * These prices are set HIGHER than Mira's sell prices to prevent arbitrage:
 * - Buying camp stock and immediately selling to Mira should NOT be profitable.
 * - Camp stock is a convenience, not a money-printing machine.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now()
 * - Integer only prices
 * - Deterministic, fixed values
 * - buyPrice >= Mira sell price (to prevent arbitrage)
 *
 * Price table:
 * - wood_log: 2 coins (Mira sell: 1 coin → profit if bought < 1, but we buy at 2)
 * - copper_ore: 5 coins (Mira sell: 3 coins → profit if bought < 3, but we buy at 5)
 * - raw_fish: 4 coins (Mira sell: 2 coins → profit if bought < 2, but we buy at 4)
 */

import type { InventoryItemId } from "../inventory/InventoryTypes.js";

/**
 * Camp stock item buy prices in coins.
 * Keyed by item ID.
 */
export const CAMP_STOCK_BUY_PRICES: Record<string, number> = {
  wood_log: 2,
  copper_ore: 5,
  raw_fish: 4,
} as const;

/**
 * Get the buy price for a camp stock item.
 * Returns null if the item is not available for purchase from camps.
 */
export function getCampStockBuyPrice(itemId: string): number | null {
  const price = CAMP_STOCK_BUY_PRICES[itemId];
  return price !== undefined ? price : null;
}

/**
 * Check if an item is available for purchase from camp stock.
 */
export function isCampStockBuyable(itemId: string): boolean {
  return itemId in CAMP_STOCK_BUY_PRICES;
}

/**
 * Get all buyable camp stock item IDs.
 */
export function getBuyableCampStockItemIds(): string[] {
  return Object.keys(CAMP_STOCK_BUY_PRICES);
}

/**
 * Validation: Ensure camp buy prices are >= Mira sell prices.
 * This prevents arbitrage where a player buys from camp and sells to Mira for profit.
 */
export function validateCampStockPriceAgainstMira(): boolean {
  const { RESOURCE_SELL_PRICES } = require("./ResourceSellPrices.js");

  for (const [itemId, buyPrice] of Object.entries(CAMP_STOCK_BUY_PRICES)) {
    const miraSellPrice = RESOURCE_SELL_PRICES[itemId];
    if (miraSellPrice !== undefined && buyPrice < miraSellPrice) {
      return false; // Arbitrage possible!
    }
  }
  return true;
}