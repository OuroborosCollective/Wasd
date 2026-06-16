import type { InventoryItemId } from "../inventory/InventoryTypes.js";
import type { SkillId } from "../skills/SkillTypes.js";

export interface RegionalBuildingDefinition {
  readonly buildingId: string;
  readonly type: string;
  readonly needMultiplierPermille: number;
}

export interface RegionalWorkOrderDefinition {
  readonly id: string;
  readonly title: string;
  readonly regionId: string;
  readonly npcId: string;
  readonly itemId: InventoryItemId;
  readonly requiredCount: number;
  readonly rewardGold: number;
  readonly rewardXp: number;
  readonly rewardSkillId: SkillId;
  readonly unlocks: readonly string[];
}

export interface RegionalNeedSnapshot {
  readonly regionId: string;
  readonly itemId: InventoryItemId;
  readonly needKappa: number;
  readonly population: number;
  readonly buildingPressurePermille: number;
}

export interface RegionalWorkOrderRegion {
  readonly regionId: string;
  readonly title: string;
  readonly population: number;
  readonly buildings: readonly RegionalBuildingDefinition[];
  readonly workOrders: readonly RegionalWorkOrderDefinition[];
  readonly needs: readonly RegionalNeedSnapshot[];
}

export interface RegionalWorkOrderGameData {
  readonly schemaVersion: 1;
  readonly regions: readonly RegionalWorkOrderRegion[];
  readonly workOrders: readonly RegionalWorkOrderDefinition[];
}

export interface WorkOrderProgressState {
  readonly workOrderId: string;
  readonly deliveredCount: number;
  readonly completedTick?: number;
  readonly completionHash?: string;
}

export interface WorkOrderSnapshot extends WorkOrderProgressState {
  readonly title: string;
  readonly regionId: string;
  readonly npcId: string;
  readonly itemId: InventoryItemId;
  readonly requiredCount: number;
  readonly remainingCount: number;
  readonly rewardGold: number;
  readonly rewardXp: number;
  readonly rewardSkillId: SkillId;
  readonly completed: boolean;
  readonly progressPermille: number;
  readonly unlocks: readonly string[];
  readonly snapshotHash: string;
}

export type WorkOrderContributionReason =
  | "delivered"
  | "completed"
  | "invalid_player"
  | "invalid_order"
  | "invalid_quantity"
  | "already_completed"
  | "wrong_item"
  | "missing_items";

export interface WorkOrderContributionResult {
  readonly ok: boolean;
  readonly playerId: string;
  readonly workOrderId: string;
  readonly itemId?: InventoryItemId;
  readonly deliveredCount: number;
  readonly totalDeliveredCount: number;
  readonly remainingCount: number;
  readonly completed: boolean;
  readonly rewardGold: number;
  readonly rewardXp: number;
  readonly rewardApplied: boolean;
  readonly currentTick: number;
  readonly contributionHash?: string;
  readonly reason: WorkOrderContributionReason;
}
