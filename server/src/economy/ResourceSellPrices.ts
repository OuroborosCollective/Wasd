import { loadEconomyBasePricesFromGameData } from "./EconomyGameData.js";

const economyBasePrices = loadEconomyBasePricesFromGameData();

export const RESOURCE_SELL_PRICES: Readonly<Record<string, number>> = Object.freeze(
  Object.fromEntries(
    Object.values(economyBasePrices)
      .filter((entry) => entry.sellable)
      .map((entry) => [entry.itemId, entry.basePrice] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
  ),
);

export interface SellPriceResult {
  sellable: true;
  price: number;
}

export interface NotSellableResult {
  sellable: false;
  reason: "not_sellable";
}

export type GetSellPriceResult = SellPriceResult | NotSellableResult;

export function getSellPrice(itemId: string): GetSellPriceResult {
  const price = RESOURCE_SELL_PRICES[itemId];
  if (price === undefined) {
    return { sellable: false, reason: "not_sellable" };
  }
  return { sellable: true, price: Number(price) };
}

export function isSellable(itemId: string): boolean {
  return itemId in RESOURCE_SELL_PRICES;
}

export function getSellableItemIds(): string[] {
  return Object.keys(RESOURCE_SELL_PRICES).sort((a, b) => a.localeCompare(b));
}
