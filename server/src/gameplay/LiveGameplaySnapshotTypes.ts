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

import type { EquipmentStatBlock } from "../equipment/EquipmentStatTypes.js";

/**
 * Quest objective progress for snapshot.
 */
export interface LiveGameplayQuestObjective {
  readonly objectiveId: string;
  readonly title: string;
  readonly current: number;
  readonly required: number;
  readonly completed: boolean;
}

/**
 * Quest progress for snapshot.
 */
export interface LiveGameplayQuestProgress {
  readonly questId: string;
  readonly state: "available" | "active" | "ready_to_complete" | "completed";
  readonly objectives: readonly LiveGameplayQuestObjective[];
}

/**
 * NPC dialogue state types.
 */
export type LiveGameplayNpcDialogueState =
  | "quest_available"
  | "quest_active_missing_wood"
  | "quest_active_ready_to_process"
  | "quest_active_ready_to_sell"
  | "quest_ready_to_complete"
  | "quest_completed";

/**
 * NPC dialogue for snapshot.
 */
export interface LiveGameplayNpcDialogue {
  readonly npcId: string;
  readonly displayName: string;
  readonly dialogueState: LiveGameplayNpcDialogueState;
  readonly line: string;
  readonly availableQuestIds: readonly string[];
  readonly activeQuestIds: readonly string[];
  readonly completedQuestIds: readonly string[];
}

/**
 * NPC reputation for snapshot.
 */
export interface LiveGameplayNpcReputation {
  readonly npcId: string;
  readonly playerId: string;
  readonly reputation: number;
  readonly completedQuestIds: readonly string[];
}

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

/**
 * Processing station snapshot for crafting UI.
 */
export interface LiveGameplayProcessingStation {
  readonly id: string;
  readonly type: "campfire" | "furnace" | "workbench";
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly interactionRadius: number;
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
  /** Aggregated equipment stats from all equipped items */
  readonly equipmentStats: EquipmentStatBlock;
  /** Processing stations for crafting UI */
  readonly processingStations: readonly LiveGameplayProcessingStation[];
  /** Active NPC quests for the player */
  readonly activeQuests: readonly LiveGameplayQuestProgress[];
  /** Available NPC quests for the player */
  readonly availableQuests: readonly LiveGameplayQuestProgress[];
  /** IDs of completed quests */
  readonly completedQuestIds: readonly string[];
  /** NPC dialogues for nearby NPCs */
  readonly npcDialogues: readonly LiveGameplayNpcDialogue[];
  /** NPC reputations for the player */
  readonly npcReputations: readonly LiveGameplayNpcReputation[];
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