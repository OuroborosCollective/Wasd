import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { isInventoryItemId } from "../inventory/InventoryTypes.js";
import { loadEconomyBasePricesFromGameData } from "./EconomyGameData.js";
import type { EconomyBasePriceTable } from "./EconomyGameData.js";
import { MARKET_PERMILLE_NEUTRAL, type LocalMarketPriceInput, type LocalMarketPriceResult } from "./LocalMarketTypes.js";

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const n = Math.floor(value);
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function resolveSupplyPressurePerMille(currentVendorStock: number): number {
  const stock = clampInteger(currentVendorStock, 0, 1_000_000_000);
  if (stock <= 9) return 1000;
  if (stock <= 24) return 900;
  return 800;
}

function resolveDemandPressure(input: LocalMarketPriceInput): number {
  if (input.demandPressurePerMille !== undefined) {
    return clampInteger(input.demandPressurePerMille, 0, 5000);
  }
  const authored = input.market.demand.find((entry) => entry.itemId === input.itemId);
  return authored ? clampInteger(authored.demandPressurePerMille, 0, 5000) : MARKET_PERMILLE_NEUTRAL;
}

function priceHash(input: Omit<LocalMarketPriceResult, "priceHash">): string {
  return stableHash32([
    "LOCAL_PRICE_V1",
    input.marketId,
    input.vendorId,
    input.regionId,
    input.chunkKey,
    input.itemId,
    input.basePrice,
    input.unitPrice,
    input.supplyPressurePerMille,
    input.demandPressurePerMille,
    input.routeRiskPerMille,
    input.taxPressurePerMille,
  ].join("|")).toString(16);
}

export class LocalPriceResolver {
  // Bolt: Optimization - Precompute and freeze sellable item IDs in constructor using fast direct relational comparison
  // to avoid repeated Object.values, filtering, and slow localeCompare sorting on every price snapshot query.
  private readonly cachedSellableItemIds: readonly string[];

  constructor(private readonly basePrices: EconomyBasePriceTable = loadEconomyBasePricesFromGameData()) {
    const ids = Object.values(this.basePrices)
      .filter((entry) => entry.sellable)
      .map((entry) => entry.itemId)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    this.cachedSellableItemIds = Object.freeze(ids);
  }

  isSellable(itemId: string): boolean {
    const entry = this.basePrices[itemId];
    return Boolean(entry?.sellable);
  }

  getBasePrice(itemId: string): number | null {
    const entry = this.basePrices[itemId];
    return entry?.sellable ? entry.basePrice : null;
  }

  listSellableItemIds(): readonly string[] {
    return this.cachedSellableItemIds;
  }

  resolvePrice(input: LocalMarketPriceInput): LocalMarketPriceResult | null {
    if (!isInventoryItemId(input.itemId)) return null;
    const entry = this.basePrices[input.itemId];
    if (!entry?.sellable) return null;

    const basePrice = entry.basePrice;
    const supplyPressurePerMille = resolveSupplyPressurePerMille(input.currentVendorStock);
    const demandPressurePerMille = resolveDemandPressure(input);
    const routeRiskPerMille = clampInteger(input.routeRiskPerMille ?? MARKET_PERMILLE_NEUTRAL, 0, 5000);
    const taxPressurePerMille = clampInteger(input.taxPressurePerMille ?? MARKET_PERMILLE_NEUTRAL, 0, 5000);

    const weighted = Math.floor(
      (basePrice * supplyPressurePerMille * demandPressurePerMille * routeRiskPerMille * taxPressurePerMille) /
        1_000_000_000_000,
    );
    const unitPrice = Math.max(1, weighted);

    const result = {
      marketId: input.market.marketId,
      vendorId: input.market.vendorId,
      regionId: input.market.regionId,
      chunkKey: input.market.chunkKey,
      itemId: input.itemId,
      basePrice,
      unitPrice,
      supplyPressurePerMille,
      demandPressurePerMille,
      routeRiskPerMille,
      taxPressurePerMille,
    } satisfies Omit<LocalMarketPriceResult, "priceHash">;

    return Object.freeze({ ...result, priceHash: priceHash(result) });
  }
}

export const localPriceResolver = new LocalPriceResolver();
