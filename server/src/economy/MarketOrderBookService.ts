import type { InventoryItemId } from "../inventory/InventoryTypes.js";
import type { LocalMarketDefinition, LocalMarketPriceResult } from "./LocalMarketTypes.js";
import { LocalPriceResolver, localPriceResolver } from "./LocalPriceResolver.js";

export interface MarketSupplyEntry {
  readonly itemId: InventoryItemId;
  readonly quantity: number;
}

export interface MarketOrderBookSnapshot {
  readonly marketId: string;
  readonly vendorId: string;
  readonly prices: readonly LocalMarketPriceResult[];
}

export class MarketOrderBookService {
  constructor(private readonly resolver: LocalPriceResolver = localPriceResolver) {}

  createSnapshot(input: {
    readonly market: LocalMarketDefinition;
    readonly supply: readonly MarketSupplyEntry[];
  }): MarketOrderBookSnapshot {
    const supplyByItem = new Map(input.supply.map((entry) => [entry.itemId, Math.max(0, Math.floor(entry.quantity))] as const));
    // Bolt: Optimization - listSellableItemIds() returns pre-sorted items by itemId,
    // so resolving prices sequentially maintains sorted order without requiring an extra .sort call.
    const prices = this.resolver
      .listSellableItemIds()
      .map((itemId) => this.resolver.resolvePrice({
        market: input.market,
        itemId,
        currentVendorStock: supplyByItem.get(itemId as InventoryItemId) ?? 0,
      }))
      .filter((price): price is LocalMarketPriceResult => Boolean(price));

    return Object.freeze({
      marketId: input.market.marketId,
      vendorId: input.market.vendorId,
      prices: Object.freeze(prices),
    });
  }
}
