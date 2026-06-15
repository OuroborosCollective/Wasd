/**
 * RUNTIME MARKET PRICING
 *
 * Server-authoritative market snapshot derived from real runtime inputs:
 * logical tick, live resource node counters, vendor/camp stock counters,
 * and a deterministic FNV-1a market hash.
 */

import { calculateDynamicPrice } from "./DemandPricing.js";
import { RESOURCE_SELL_PRICES } from "./ResourceSellPrices.js";

export interface RuntimeMarketResourceNode {
  readonly resourceId: string;
  readonly available: boolean;
}

export interface RuntimeMarketStockItem {
  readonly itemId: string;
  readonly quantity: number;
}

export interface RuntimeMarketStockSource {
  readonly items: readonly RuntimeMarketStockItem[];
}

export interface RuntimeMarketVendorEconomySource {
  readonly vendors: readonly { readonly stock: readonly RuntimeMarketStockItem[] }[];
}

export interface RuntimeMarketPrice {
  readonly itemId: string;
  readonly unitPrice: number;
  readonly basePrice: number;
  readonly demandBand: "normal" | "stocked" | "oversupplied";
  readonly availableResourceNodes: number;
  readonly stockQuantity: number;
}

export interface RuntimeMarketSnapshot {
  readonly schemaVersion: "runtime-market.v1";
  readonly tick: number;
  readonly prices: readonly RuntimeMarketPrice[];
  readonly marketHash: string;
}

const RAW_RESOURCE_TO_ITEM: Readonly<Record<string, string>> = Object.freeze({
  wood: "wood_log",
  tree: "wood_log",
  forest: "wood_log",
  copper: "copper_ore",
  ore: "copper_ore",
  mine: "copper_ore",
  fish: "raw_fish",
  fishing: "raw_fish",
  water: "raw_fish",
});

function safeTick(value: number): number {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function safeQuantity(value: number): number {
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function normalizeResourceItemId(resourceId: string): string | null {
  const key = resourceId.trim().toLowerCase();
  if (key in RESOURCE_SELL_PRICES) return key;
  return RAW_RESOURCE_TO_ITEM[key] ?? null;
}

function countAvailableResourceItems(resourceNodes: readonly RuntimeMarketResourceNode[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const node of resourceNodes) {
    if (!node.available) continue;
    const itemId = normalizeResourceItemId(node.resourceId);
    if (!itemId) continue;
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }
  return counts;
}

function countStockItems(
  vendorEconomy: RuntimeMarketVendorEconomySource,
  stockSources: readonly RuntimeMarketStockSource[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();

  for (const vendor of vendorEconomy.vendors) {
    for (const item of vendor.stock) {
      counts.set(item.itemId, (counts.get(item.itemId) ?? 0) + safeQuantity(item.quantity));
    }
  }

  for (const source of stockSources) {
    for (const item of source.items) {
      counts.set(item.itemId, (counts.get(item.itemId) ?? 0) + safeQuantity(item.quantity));
    }
  }

  return counts;
}

function scarcityAdjustment(availableResourceNodes: number, stockQuantity: number): number {
  if (availableResourceNodes <= 0 && stockQuantity <= 3) return 1;
  if (availableResourceNodes >= 4 || stockQuantity >= 25) return -1;
  return 0;
}

export function buildRuntimeMarketSnapshot(
  logicalIndex: number,
  resourceNodes: readonly RuntimeMarketResourceNode[],
  vendorEconomy: RuntimeMarketVendorEconomySource,
  stockSources: readonly RuntimeMarketStockSource[],
): RuntimeMarketSnapshot {
  const tick = safeTick(logicalIndex);
  const resourceCounts = countAvailableResourceItems(resourceNodes);
  const stockCounts = countStockItems(vendorEconomy, stockSources);
  const itemIds = Object.keys(RESOURCE_SELL_PRICES).sort();

  const prices: RuntimeMarketPrice[] = itemIds.map((itemId) => {
    const availableResourceNodes = resourceCounts.get(itemId) ?? 0;
    const stockQuantity = stockCounts.get(itemId) ?? 0;
    const base = calculateDynamicPrice(itemId, stockQuantity);
    const adjustment = scarcityAdjustment(availableResourceNodes, stockQuantity);
    const unitPrice = base.unitPrice > 0 ? Math.max(1, base.unitPrice + adjustment) : 0;

    return Object.freeze({
      itemId,
      unitPrice,
      basePrice: base.basePrice,
      demandBand: base.demandBand,
      availableResourceNodes,
      stockQuantity,
    });
  });

  const hashInput = prices
    .map((price) => [
      price.itemId,
      price.unitPrice,
      price.basePrice,
      price.demandBand,
      price.availableResourceNodes,
      price.stockQuantity,
    ].join(":"))
    .join("|");

  return Object.freeze({
    schemaVersion: "runtime-market.v1" as const,
    tick,
    prices: Object.freeze(prices),
    marketHash: `market:${fnv1a32(`${tick}|${hashInput}`)}`,
  });
}
