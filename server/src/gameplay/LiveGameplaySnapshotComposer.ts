/**
 * LIVE GAMEPLAY SNAPSHOT COMPOSER
 *
 * Deterministic, server-authoritative composition of gameplay snapshots.
 * Collects data from stores/services and produces stable snapshot output.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - All arrays sorted deterministically
 * - No mutation of source data
 */

import type {
  LiveGameplaySnapshot,
  LiveGameplayInventoryItem,
  LiveGameplayEquipmentSlot,
  LiveGameplaySkillState,
  LiveGameplayResourceNode,
  LiveGameplayWorldPoi,
  LiveGameplayVendorEconomySnapshot,
  LiveGameplayProcessingStation,
  DiscoveryStats,
  RecentDiscovery,
  LiveGameplayCampNpc,
  LiveGameplayCampStock,
} from "./LiveGameplaySnapshotTypes.js";
import { RESOURCE_SELL_PRICES } from "../economy/ResourceSellPrices.js";
import { calculateDynamicPrice } from "../economy/DemandPricing.js";
import { createDefaultStatBlock } from "../equipment/EquipmentStatTypes.js";

export interface LiveGameplaySnapshotComposerDeps {
  readonly getInventoryItems: (playerId: string) => readonly LiveGameplayInventoryItem[] | Promise<readonly LiveGameplayInventoryItem[]>;
  readonly getEquipmentSlots: (playerId: string) => readonly LiveGameplayEquipmentSlot[] | Promise<readonly LiveGameplayEquipmentSlot[]>;
  readonly getSkillStates: (playerId: string) => readonly LiveGameplaySkillState[] | Promise<readonly LiveGameplaySkillState[]>;
  readonly getResourceNodes: (playerId: string) => readonly LiveGameplayResourceNode[] | Promise<readonly LiveGameplayResourceNode[]>;
  readonly getWallet: (playerId: string) => { readonly coin: number } | Promise<{ readonly coin: number }>;
  readonly getWorldPois?: (playerId: string) => readonly LiveGameplayWorldPoi[] | Promise<readonly LiveGameplayWorldPoi[]>;
  readonly getVendorEconomy?: (playerId: string) => LiveGameplayVendorEconomySnapshot | Promise<LiveGameplayVendorEconomySnapshot>;
  readonly getDiscoveryStats?: (playerId: string) => DiscoveryStats | Promise<DiscoveryStats>;
  readonly getRecentDiscoveries?: (playerId: string) => readonly RecentDiscovery[] | Promise<readonly RecentDiscovery[]>;
  readonly getCampNpcs?: () => readonly LiveGameplayCampNpc[] | Promise<readonly LiveGameplayCampNpc[]>;
  readonly getCampStocks?: () => readonly LiveGameplayCampStock[] | Promise<readonly LiveGameplayCampStock[]>;
  readonly getEquipmentStats?: (playerId: string) => import("../equipment/EquipmentStatTypes.js").EquipmentStatBlock | Promise<import("../equipment/EquipmentStatTypes.js").EquipmentStatBlock>;
  readonly getProcessingStations?: () => readonly LiveGameplayProcessingStation[] | Promise<readonly LiveGameplayProcessingStation[]>;
}

export class LiveGameplaySnapshotComposer {
  public constructor(private readonly deps: LiveGameplaySnapshotComposerDeps) {}

  public async compose(playerId: string, logicalIndex: number): Promise<LiveGameplaySnapshot> {
    const [inventory, equipment, skills, resourceNodes] = await Promise.all([
      this.deps.getInventoryItems(playerId),
      this.deps.getEquipmentSlots(playerId),
      this.deps.getSkillStates(playerId),
      this.deps.getResourceNodes(playerId),
    ]);

    const wallet = await this.deps.getWallet(playerId);
    
    // Get world POIs if available, default to empty array
    const worldPois = this.deps.getWorldPois
      ? await this.deps.getWorldPois(playerId)
      : [];

    // Get vendor economy if available, default to empty vendors
    const vendorEconomy = this.deps.getVendorEconomy
      ? await this.deps.getVendorEconomy(playerId)
      : { vendors: [] };

    // Get discovery stats if available
    const discoveryStats = this.deps.getDiscoveryStats
      ? await this.deps.getDiscoveryStats(playerId)
      : { discoveredPoiCount: 0, discoveredChunkCount: 0, visiblePoiCount: 0 };

    // Get recent discoveries if available
    const recentDiscoveries = this.deps.getRecentDiscoveries
      ? await this.deps.getRecentDiscoveries(playerId)
      : [];

    // Get camp NPCs and stocks if available
    const campNpcs = this.deps.getCampNpcs
      ? await this.deps.getCampNpcs()
      : [];
    const campStocks = this.deps.getCampStocks
      ? await this.deps.getCampStocks()
      : [];

    // Get equipment stats if available, default to zero block
    const equipmentStats = this.deps.getEquipmentStats
      ? await this.deps.getEquipmentStats(playerId)
      : createDefaultStatBlock();

    // Get processing stations if available
    const processingStations = this.deps.getProcessingStations
      ? await this.deps.getProcessingStations()
      : [];

    return Object.freeze({
      schemaVersion: "live-gameplay-snapshot.v1" as const,
      playerId,
      logicalIndex: this.safeIndex(logicalIndex),
      tickRateHz: 10 as const,
      tickMs: 100 as const,
      inventory: Object.freeze([...inventory].sort((a, b) => a.itemId.localeCompare(b.itemId))),
      equipment: Object.freeze([...equipment].sort((a, b) => a.slot.localeCompare(b.slot))),
      skills: Object.freeze([...skills].sort((a, b) => a.skillId.localeCompare(b.skillId))),
      resourceNodes: Object.freeze([...resourceNodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId))),
      wallet: Object.freeze(wallet),
      worldPois: Object.freeze([...worldPois].sort((a, b) => a.poiId.localeCompare(b.poiId))),
      vendorEconomy: Object.freeze(vendorEconomy),
      discoveryStats: Object.freeze(discoveryStats),
      recentDiscoveries: Object.freeze([...recentDiscoveries]),
      campNpcs: Object.freeze([...campNpcs].sort((a, b) => a.id.localeCompare(b.id))),
      campStocks: Object.freeze([...campStocks].sort((a, b) => a.poiId.localeCompare(b.poiId))),
      equipmentStats,
      processingStations: Object.freeze([...processingStations].sort((a, b) => a.id.localeCompare(b.id))),
    });
  }

  private safeIndex(value: number): number {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }
}

/**
 * Create a default empty vendor economy snapshot.
 */
export function createEmptyVendorEconomySnapshot(): LiveGameplayVendorEconomySnapshot {
  return Object.freeze({
    vendors: Object.freeze([]),
  });
}

/**
 * Build vendor economy snapshot from stock entries and sellable item IDs.
 * Used by the snapshot composition.
 */
export function buildVendorEconomySnapshot(
  vendorId: string,
  vendorName: string,
  stockEntries: ReadonlyArray<{ itemId: string; quantity: number }>,
): LiveGameplayVendorEconomySnapshot {
  // Get all sellable items
  const sellableItemIds = Object.keys(RESOURCE_SELL_PRICES);

  // Build stock array (only items with quantity > 0)
  const stock = stockEntries
    .filter((entry) => entry.quantity > 0)
    .map((entry) => ({
      itemId: entry.itemId,
      quantity: entry.quantity,
    }))
    .sort((a, b) => a.itemId.localeCompare(b.itemId));

  // Build prices for all sellable items based on current stock
  const prices = sellableItemIds
    .map((itemId) => {
      const currentStock = stockEntries.find((e) => e.itemId === itemId)?.quantity ?? 0;
      const priceInfo = calculateDynamicPrice(itemId, currentStock);
      return {
        itemId,
        unitPrice: priceInfo.unitPrice,
        basePrice: priceInfo.basePrice,
        demandBand: priceInfo.demandBand,
      };
    })
    .sort((a, b) => a.itemId.localeCompare(b.itemId));

  return Object.freeze({
    vendors: Object.freeze([
      Object.freeze({
        id: vendorId,
        name: vendorName,
        stock: Object.freeze(stock),
        prices: Object.freeze(prices),
      }),
    ]),
  });
}