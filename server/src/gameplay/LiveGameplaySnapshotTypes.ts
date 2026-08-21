/**
 * LIVE GAMEPLAY SNAPSHOT TYPES
 *
 * Deterministic, server-authoritative snapshot types for ARELogic integration.
 * These types provide a stable contract for the 2D client.
 *
 * Rules:
 * - No unseeded randomness for gameplay values
 * - No wall-clock reads for gameplay state
 * - Empty arrays instead of undefined
 * - All arrays sorted deterministically by id
 * - Exact endless skill progression is carried as decimal strings; Number fields are projections
 */

import type { EquipmentStatBlock } from "../equipment/EquipmentStatTypes.js";

export interface LiveGameplayQuestObjective {
  readonly objectiveId: string;
  readonly title: string;
  readonly current: number;
  readonly required: number;
  readonly completed: boolean;
}

export interface LiveGameplayQuestReward {
  readonly coins: number;
  readonly gatheringXp: number;
  readonly craftingXp: number;
  readonly reputation: number;
}

export interface LiveGameplayQuestProgress {
  readonly questId: string;
  readonly title?: string;
  readonly description?: string;
  readonly npcId?: string;
  readonly reward?: LiveGameplayQuestReward;
  readonly state: "available" | "active" | "ready_to_complete" | "completed";
  readonly objectives: readonly LiveGameplayQuestObjective[];
}

export type LiveGameplayNpcDialogueState =
  | "quest_available"
  | "quest_active_missing_wood"
  | "quest_active_ready_to_process"
  | "quest_active_ready_to_sell"
  | "quest_ready_to_complete"
  | "quest_completed";

export interface LiveGameplayNpcDialogue {
  readonly npcId: string;
  readonly displayName: string;
  readonly dialogueState: LiveGameplayNpcDialogueState;
  readonly line: string;
  readonly availableQuestIds: readonly string[];
  readonly activeQuestIds: readonly string[];
  readonly completedQuestIds: readonly string[];
}

export interface LiveGameplayNpcReputation {
  readonly npcId: string;
  readonly playerId: string;
  readonly reputation: number;
  readonly completedQuestIds: readonly string[];
}

export type LiveGameplayTrustTier = "hostile" | "cold" | "neutral" | "trusted" | "honored";

export type LiveGameplayNpcRumorKind =
  | "helped_village"
  | "reliable_supplier"
  | "troublemaker"
  | "hostile_actor"
  | "trusted_worker";

export interface LiveGameplayNpcMemory {
  readonly npcId: string;
  readonly playerId: string;
  readonly reputation: number;
  readonly trustTier: LiveGameplayTrustTier;
  readonly memoryEventCount: number;
  readonly recentMemoryNotes: readonly string[];
  readonly knownRumorCount: number;
}

export interface LiveGameplayNpcRumor {
  readonly rumorId: string;
  readonly npcId: string;
  readonly playerId: string;
  readonly kind: LiveGameplayNpcRumorKind;
  readonly weight: number;
  readonly note: string;
  readonly sourceNpcId: string;
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
  /** Compatibility projections. */
  readonly xp: number;
  readonly level: number;
  /** Exact cap-free progression truth when available from schema-2 skills. */
  readonly xpExact?: string;
  readonly levelExact?: string;
  readonly xpIntoLevelExact?: string;
  readonly xpForNextLevelExact?: string;
  readonly numberProjectionExact?: boolean;
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
  readonly discovered?: boolean;
}

export interface DiscoveryStats {
  readonly discoveredPoiCount: number;
  readonly discoveredChunkCount: number;
  readonly visiblePoiCount: number;
}

export interface RecentDiscovery {
  readonly poiId: string;
  readonly title: string;
  readonly type: string;
}

export interface LiveGameplayVendorStockItem {
  readonly itemId: string;
  readonly quantity: number;
  readonly buyPrice?: number | null;
}

export interface LiveGameplayVendorPriceItem {
  readonly itemId: string;
  readonly unitPrice: number;
  readonly basePrice: number;
  readonly demandBand: "normal" | "stocked" | "oversupplied";
}

export interface LiveGameplayVendorEconomy {
  readonly id: string;
  readonly name: string;
  readonly stock: readonly LiveGameplayVendorStockItem[];
  readonly prices: readonly LiveGameplayVendorPriceItem[];
}

export interface LiveGameplayVendorEconomySnapshot {
  readonly vendors: readonly LiveGameplayVendorEconomy[];
}

export interface LiveGameplayMarketPrice {
  readonly itemId: string;
  readonly availableQuantity: number;
  readonly unitPrice: number;
  readonly basePrice: number;
  readonly demandBand: "normal" | "stocked" | "oversupplied";
  readonly resourceNodeCount: number;
}

export interface LiveGameplayMarketState {
  readonly schemaVersion: "market-state.v1";
  readonly tick: number;
  readonly prices: readonly LiveGameplayMarketPrice[];
  readonly marketHash: string;
}

export const EMPTY_LIVE_GAMEPLAY_MARKET_STATE: LiveGameplayMarketState = Object.freeze({
  schemaVersion: "market-state.v1",
  tick: 0,
  prices: Object.freeze([]),
  marketHash: "market:00000000",
});

export type CampNpcActivity = "gathering" | "returning" | "depositing";
export type CampNpcState = "idle" | "working" | "resting";

export interface CampNpcPosition {
  readonly x: number;
  readonly y: number;
}

export interface LiveGameplayCampNpc {
  readonly npcId: string;
  readonly poiId: string;
  readonly role: string;
  readonly activity: CampNpcActivity;
  readonly state: CampNpcState;
  readonly position: CampNpcPosition;
}

export interface LiveGameplayCampStock {
  readonly poiId: string;
  readonly resourceId: string;
  readonly quantity: number;
  readonly capacity: number;
}

export interface LiveGameplaySnapshot {
  readonly schemaVersion: "live-gameplay-snapshot.v1";
  readonly playerId: string;
  readonly logicalIndex: number;
  readonly inventory: readonly LiveGameplayInventoryItem[];
  readonly equipment: readonly LiveGameplayEquipmentSlot[];
  readonly skills: readonly LiveGameplaySkillState[];
  readonly resourceNodes: readonly LiveGameplayResourceNode[];
  readonly wallet: LiveGameplayWallet;
  readonly vendorEconomy: LiveGameplayVendorEconomySnapshot;
  readonly marketState: LiveGameplayMarketState;
  readonly worldPois: readonly LiveGameplayWorldPoi[];
  readonly worldSurface: unknown;
  readonly discoveryStats: DiscoveryStats;
  readonly recentDiscoveries: readonly RecentDiscovery[];
  readonly equipmentStats: EquipmentStatBlock;
  readonly processingStations: readonly unknown[];
  readonly activeQuests: readonly LiveGameplayQuestProgress[];
  readonly availableQuests: readonly LiveGameplayQuestProgress[];
  readonly completedQuestIds: readonly string[];
  readonly npcDialogues: readonly LiveGameplayNpcDialogue[];
  readonly npcReputations: readonly LiveGameplayNpcReputation[];
  readonly npcMemories: readonly LiveGameplayNpcMemory[];
  readonly npcRumors: readonly LiveGameplayNpcRumor[];
  readonly campNpcs?: readonly LiveGameplayCampNpc[];
  readonly campStocks?: readonly LiveGameplayCampStock[];
}
