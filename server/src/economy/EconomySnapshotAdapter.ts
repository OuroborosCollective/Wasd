import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { loadLocalMarketsFromGameData } from "./EconomyGameData.js";
import { localPriceResolver, type LocalPriceResolver } from "./LocalPriceResolver.js";
import type { LocalMarketSnapshot, LocalMarketDefinition, LocalMarketPriceResult } from "./LocalMarketTypes.js";
import type { VendorStockService } from "./VendorStockService.js";

function snapshotHash(input: Omit<LocalMarketSnapshot, "snapshotHash">): string {
  return stableHash32([
    "LOCAL_MARKET_SNAPSHOT_V1",
    input.marketId,
    input.vendorId,
    input.regionId,
    input.chunkKey,
    input.prices.map((price) => price.priceHash).join(","),
  ].join("|")).toString(16);
}

export async function createLocalMarketSnapshot(input: {
  readonly vendorStockService: VendorStockService;
  readonly market?: LocalMarketDefinition;
  readonly resolver?: LocalPriceResolver;
}): Promise<LocalMarketSnapshot> {
  const market = input.market ?? loadLocalMarketsFromGameData()[0];
  const resolver = input.resolver ?? localPriceResolver;
  const stock = await input.vendorStockService.getStock(market.vendorId);

  const prices: LocalMarketPriceResult[] = [];
  for (const itemId of resolver.listSellableItemIds()) {
    const route = market.routes.find((candidate) => candidate.toMarketId === market.marketId);
    const price = resolver.resolvePrice({
      market,
      itemId,
      currentVendorStock: stock.items[itemId] ?? 0,
      routeRiskPerMille: route?.routeRiskPerMille,
      taxPressurePerMille: route?.taxPressurePerMille,
    });
    if (price) prices.push(price);
  }

  const base = {
    marketId: market.marketId,
    title: market.title,
    regionId: market.regionId,
    vendorId: market.vendorId,
    chunkKey: market.chunkKey,
    prices: Object.freeze(prices.sort((a, b) => a.itemId.localeCompare(b.itemId))),
  } satisfies Omit<LocalMarketSnapshot, "snapshotHash">;

  return Object.freeze({ ...base, snapshotHash: snapshotHash(base) });
}
