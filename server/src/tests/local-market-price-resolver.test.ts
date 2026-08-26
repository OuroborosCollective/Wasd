import { describe, expect, it } from "vitest";
import { loadEconomyBasePricesFromGameData, loadLocalMarketsFromGameData } from "../economy/EconomyGameData.js";
import { LocalPriceResolver, resolveSupplyPressurePerMille } from "../economy/LocalPriceResolver.js";
import { MarketOrderBookService } from "../economy/MarketOrderBookService.js";
import { TradeRouteGraph } from "../economy/TradeRouteGraph.js";

describe("A5 local market price resolver", () => {
  it("loads base prices from game-data and keeps sellable ordering stable", () => {
    const prices = loadEconomyBasePricesFromGameData();
    const resolver = new LocalPriceResolver(prices);

    expect(resolver.getBasePrice("wood_log")).toBe(1);
    expect(resolver.getBasePrice("copper_ingot")).toBe(8);
    expect(resolver.listSellableItemIds()).toEqual([
      "cooked_fish",
      "copper_ingot",
      "copper_ore",
      "raw_fish",
      "wood_log",
      "wood_plank",
    ]);
  });

  it("derives deterministic prices from supply, demand and neutral route/tax pressure", () => {
    const market = loadLocalMarketsFromGameData()[0];
    const resolver = new LocalPriceResolver(loadEconomyBasePricesFromGameData());

    const first = resolver.resolvePrice({ market, itemId: "copper_ingot", currentVendorStock: 0 });
    const second = resolver.resolvePrice({ market, itemId: "copper_ingot", currentVendorStock: 0 });
    const stocked = resolver.resolvePrice({ market, itemId: "copper_ingot", currentVendorStock: 25 });

    expect(first).toEqual(second);
    expect(first?.basePrice).toBe(8);
    expect(first?.demandPressurePerMille).toBe(1250);
    expect(first?.routeRiskPerMille).toBe(1000);
    expect(first?.taxPressurePerMille).toBe(1000);
    expect(stocked?.supplyPressurePerMille).toBe(800);
    expect(stocked?.unitPrice).toBeLessThan(first?.unitPrice ?? 0);
  });

  it("sorts market pressure model output and resolves trade routes deterministically", () => {
    const [market] = loadLocalMarketsFromGameData();
    const orderBook = new MarketOrderBookService(new LocalPriceResolver(loadEconomyBasePricesFromGameData()));
    const graph = new TradeRouteGraph([market]);

    const snapshot = orderBook.createSnapshot({
      market,
      supply: [
        { itemId: "wood_log", quantity: 25 },
        { itemId: "copper_ore", quantity: 0 },
      ],
    });

    expect(snapshot.prices.map((price) => price.itemId)).toEqual([
      "cooked_fish",
      "copper_ingot",
      "copper_ore",
      "raw_fish",
      "wood_log",
      "wood_plank",
    ]);
    expect(graph.resolveRoute(market.marketId, market.marketId)?.routeRiskPerMille).toBe(1000);
    expect(resolveSupplyPressurePerMille(25)).toBe(800);
  });

  it("benchmarks precomputed listSellableItemIds vs dynamic object filtering & localeCompare sort", () => {
    const prices = loadEconomyBasePricesFromGameData();
    const resolver = new LocalPriceResolver(prices);
    const iterations = 50_000;

    // Benchmark precomputed cached call
    const startCached = performance.now();
    for (let i = 0; i < iterations; i++) {
      resolver.listSellableItemIds();
    }
    const durationCached = performance.now() - startCached;

    // Benchmark dynamic filtering and sorting
    const startUncached = performance.now();
    for (let i = 0; i < iterations; i++) {
      Object.values(prices)
        .filter((entry) => entry.sellable)
        .map((entry) => entry.itemId)
        .sort((a, b) => a.localeCompare(b));
    }
    const durationUncached = performance.now() - startUncached;

    console.log(`[LocalPriceResolver Benchmark - ${iterations} calls]:`);
    console.log(`  - Cached precomputed listSellableItemIds: ${durationCached.toFixed(4)}ms`);
    console.log(`  - Uncached Object.values + localeCompare: ${durationUncached.toFixed(4)}ms`);
    console.log(`  - Speedup: ${(durationUncached / durationCached).toFixed(2)}x faster`);

    expect(durationCached).toBeLessThan(durationUncached);
  });
});
