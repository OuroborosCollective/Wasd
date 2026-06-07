/**
 * RESOURCE SELL PRICES
 *
 * Deterministic sell prices for gathered and processed resources.
 * No Math.random(), no Date.now(), no dynamic market prices.
 * Prices are stable integers in coins.
 * 
 * Premium pricing: Processed items are worth more than raw inputs.
 * This creates the resource processing economy loop:
 * - wood_log x2 (2 coins) → wood_plank (3 coins) = +1 profit
 * - copper_ore x2 (6 coins) → copper_ingot (8 coins) = +2 profit
 * - raw_fish (2 coins) → cooked_fish (4 coins) = +2 profit
 */

import type { InventoryItemId } from "../inventory/InventoryTypes.js";

/**
 * Sell price in coins per unit.
 * Only resource items are sellable; equipment and quest items are not.
 * 
 * Raw materials: wood_log, copper_ore, raw_fish
 * Processed materials (premium): wood_plank, copper_ingot, cooked_fish
 */
export const RESOURCE_SELL_PRICES: Record<string, number> = {
  // Raw gathered resources
  wood_log: 1,
  copper_ore: 3,
  raw_fish: 2,
  // Processed resources (premium values)
  wood_plank: 3,
  copper_ingot: 8,
  cooked_fish: 4,
} as const;

export interface SellPriceResult {
  sellable: true;
  price: number;
}

export interface NotSellableResult {
  sellable: false;
  reason: "not_sellable";
}

export type GetSellPriceResult = SellPriceResult | NotSellableResult;

/**
 * Get the sell price for an item ID.
 * Returns sellable=true and price if the item can be sold.
 * Returns sellable=false if the item is equipment, quest item, or unknown.
 */
export function getSellPrice(itemId: string): GetSellPriceResult {
  const price = RESOURCE_SELL_PRICES[itemId];
  if (price === undefined) {
    return { sellable: false, reason: "not_sellable" };
  }
  return { sellable: true, price: Number(price) };
}

/**
 * Check if an item ID is sellable (has a price in the table).
 */
export function isSellable(itemId: string): boolean {
  return itemId in RESOURCE_SELL_PRICES;
}

/**
 * Get all sellable resource item IDs.
 */
export function getSellableItemIds(): string[] {
  return Object.keys(RESOURCE_SELL_PRICES);
}