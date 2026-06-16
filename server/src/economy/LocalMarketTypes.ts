import type { InventoryItemId } from "../inventory/InventoryTypes.js";

export const MARKET_PERMILLE_NEUTRAL = 1000 as const;

export interface LocalMarketDemandRule {
  readonly itemId: InventoryItemId;
  readonly demandPressurePerMille: number;
}

export interface LocalMarketRoute {
  readonly routeId: string;
  readonly toMarketId: string;
  readonly distanceKappa: number;
  readonly routeRiskPerMille: number;
  readonly taxPressurePerMille: number;
}

export interface LocalMarketDefinition {
  readonly marketId: string;
  readonly title: string;
  readonly regionId: string;
  readonly vendorId: string;
  readonly chunkKey: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly demand: readonly LocalMarketDemandRule[];
  readonly routes: readonly LocalMarketRoute[];
}

export interface LocalMarketPriceInput {
  readonly market: LocalMarketDefinition;
  readonly itemId: InventoryItemId | string;
  readonly currentVendorStock: number;
  readonly demandPressurePerMille?: number;
  readonly routeRiskPerMille?: number;
  readonly taxPressurePerMille?: number;
}

export interface LocalMarketPriceResult {
  readonly marketId: string;
  readonly vendorId: string;
  readonly regionId: string;
  readonly chunkKey: string;
  readonly itemId: InventoryItemId;
  readonly basePrice: number;
  readonly unitPrice: number;
  readonly supplyPressurePerMille: number;
  readonly demandPressurePerMille: number;
  readonly routeRiskPerMille: number;
  readonly taxPressurePerMille: number;
  readonly priceHash: string;
}

export interface LocalMarketSnapshot {
  readonly marketId: string;
  readonly title: string;
  readonly regionId: string;
  readonly vendorId: string;
  readonly chunkKey: string;
  readonly prices: readonly LocalMarketPriceResult[];
  readonly snapshotHash: string;
}
