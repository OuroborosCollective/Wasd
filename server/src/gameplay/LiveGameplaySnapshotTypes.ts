/**
 * LIVE GAMEPLAY SNAPSHOT TYPES
 *
 * Deterministic, server-authoritative snapshot types for ARELogic integration.
 * These types provide a stable contract for the 2D client.
 *
 * Rules:
 * - No Math.random() for gameplay values
 * - No Date.now() for gameplay state
 * - Empty arrays instead of undefined
 * - All arrays sorted deterministically by id
 */

export interface LiveGameplayInventoryItem {
  readonly itemId: string;
  readonly quantity: number;
}

export interface LiveGameplayEquipmentSlot {
  readonly slot: string;
  readonly itemId: string | null;
}

export interface LiveGameplaySkillState {
  readonly skillId: string;
  readonly xp: number;
  readonly level: number;
}

export interface LiveGameplayResourceNode {
  readonly nodeId: string;
  readonly resourceId: string;
  readonly skillId: string;
  readonly x: number;
  readonly y: number;
  readonly available: boolean;
}

export interface LiveGameplayWallet {
  readonly coin: number;
}

export interface LiveGameplayWorldPoi {
  readonly poiId: string;
  readonly type: string;
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly chunkX: number;
  readonly chunkZ: number;
  /** Whether this POI has been discovered by the player (defaults to true for backward compat) */
  readonly discovered?: boolean;
}

/**
 * Discovery stats for map display.
 */
export interface DiscoveryStats {
  readonly discoveredPoiCount: number;
  readonly discoveredChunkCount: number;
  readonly visiblePoiCount: number;
}

/**
 * Recently discovered POI for client feedback.
 */
export interface RecentDiscovery {
  readonly poiId: string;
  readonly title: string;
  readonly type: string;
}

/**
 * Vendor stock entry for snapshot.
 */
export interface LiveGameplayVendorStockItem {
  readonly itemId: string;
  readonly quantity: number;
}

/**
 * Vendor price info for snapshot.
 */
export interface LiveGameplayVendorPriceItem {
  readonly itemId: string;
  readonly unitPrice: number;
  readonly basePrice: number;
  readonly demandBand: "normal" | "stocked" | "oversupplied";
}

/**
 * Individual vendor economy info for snapshot.
 */
export interface LiveGameplayVendorEconomy {
  readonly id: string;
  readonly name: string;
  readonly stock: readonly LiveGameplayVendorStockItem[];
  readonly prices: readonly LiveGameplayVendorPriceItem[];
}

/**
 * Vendor economy snapshot containing all vendor stock and pricing info.
 */
export interface LiveGameplayVendorEconomySnapshot {
  readonly vendors: readonly LiveGameplayVendorEconomy[];
}

/**
 * Camp NPC activity state.
 */
export type CampNpcActivity = "gathering" | "returning" | "depositing";

/**
 * Camp NPC state.
 */
export type CampNpcState = "idle" | "working" | "resting";

/**
 * Camp NPC position.
 */
export interface CampNpcPosition {
  readonly x: number;
  readonly y: number;
}

/**
 * Camp NPC type.
 */
export type CampNpcType = "camp_woodcutter" | "camp_miner" | "camp_fisher";

/**
 * Camp NPC snapshot for server-authoritative display.
 */
export interface LiveGameplayCampNpc {
  readonly id: string;
  readonly type: CampNpcType;
  readonly name: string;
  readonly role: string;
  readonly poiId: string;
  readonly position: CampNpcPosition;
  readonly state: CampNpcState;
  readonly activity: CampNpcActivity;
  readonly activityMessage: string;
}

/**
 * Camp stock item entry.
 */
export interface LiveGameplayCampStockItem {
  readonly itemId: string;
  readonly quantity: number;
  /** Buy price in coins, null if not buyable from camp */
  readonly buyPrice?: number | null;
}

/**
 * Camp stock snapshot for display.
 */
export interface LiveGameplayCampStock {
  readonly poiId: string;
  readonly items: readonly LiveGameplayCampStockItem[];
  readonly lastUpdatedTick: number;
}

export interface LiveGameplaySnapshot {
  readonly schemaVersion: "live-gameplay-snapshot.v1";
  readonly playerId: string;
  readonly logicalIndex: number;
  readonly tickRateHz: 10;
  readonly tickMs: 100;
  readonly inventory: readonly LiveGameplayInventoryItem[];
  readonly equipment: readonly LiveGameplayEquipmentSlot[];
  readonly skills: readonly LiveGameplaySkillState[];
  readonly resourceNodes: readonly LiveGameplayResourceNode[];
  readonly wallet: LiveGameplayWallet;
  readonly worldPois: readonly LiveGameplayWorldPoi[];
  readonly vendorEconomy: LiveGameplayVendorEconomySnapshot;
  /** Discovery stats for map display */
  readonly discoveryStats: DiscoveryStats;
  /** Recently discovered POIs for client feedback */
  readonly recentDiscoveries: readonly RecentDiscovery[];
  /** Camp NPCs at discovered gathering camp POIs */
  readonly campNpcs: readonly LiveGameplayCampNpc[];
  /** Camp stock at discovered gathering camp POIs */
  readonly campStocks: readonly LiveGameplayCampStock[];
}

export interface GatherResult {
  readonly ok: boolean;
  readonly playerId: string;
  readonly nodeId: string;
  readonly resourceId: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly skillId: string;
  readonly xpGranted: number;
  readonly reason?: string;
}