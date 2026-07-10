import type { SkillId } from "../skills/SkillTypes.js";
import type { ResourceNodeEcologySnapshot } from "./ResourceEcologyTypes.js";

export type ResourceKind = "tree" | "ore" | "fish_spot";

export type ResourceNodeStatus =
  | "available"
  | "depleted"
  | "locked";

export type ResourceGatherReason =
  | "node_not_found"
  | "node_depleted"
  | "too_far"
  | "level_too_low"
  | "missing_tool"
  | "invalid_player"
  | "inventory_write_failed"
  | "transaction_failed"
  | "gathered";

export type RequiredToolSlot = "woodcutting_tool" | "mining_tool" | "fishing_tool";

export interface ResourceNodeDefinition {
  id: string;
  kind: ResourceKind;
  title: string;
  skillId: Extract<SkillId, "woodcutting" | "mining" | "fishing">;
  requiredLevel: number;
  xpReward: number;
  itemRewardId: string;
  itemRewardName: string;
  respawnTicks: number;
  position: {
    x: number;
    y: number;
  };
  radius: number;
  requiredTool?: RequiredToolSlot;
}

export interface ResourceNodeRuntimeState {
  nodeId: string;
  status: ResourceNodeStatus;
  depletedUntilTick: number | null;
  lastGatheredBy: string | null;
}

export interface ResourceNodeSnapshot {
  id: string;
  kind: ResourceKind;
  title: string;
  skillId: ResourceNodeDefinition["skillId"];
  requiredLevel: number;
  xpReward: number;
  itemRewardId: string;
  itemRewardName: string;
  position: {
    x: number;
    y: number;
  };
  radius: number;
  status: ResourceNodeStatus;
  depletedUntilTick: number | null;
  remainingTicks: number;
  requiredTool?: RequiredToolSlot;
  ecology?: ResourceNodeEcologySnapshot;
}

export type GatheringMomentumTruthStatus =
  | "runtime_truth"
  | "runtime_truth_candidate"
  | "disabled_fallback";

export interface GatheringMomentumRule {
  schemaVersion: 1;
  id: string;
  enabled: boolean;
  truthStatus: GatheringMomentumTruthStatus;
  canBecomeTruth: boolean;
  truthPath: string;
  truthPromotion: string;
  appliesToSkillIds: ResourceNodeDefinition["skillId"][];
  windowTicks: number;
  streakBonusPermille: number;
  maxStreak: number;
  resetOnSkillChange: boolean;
}

export interface GatheringMomentumState {
  playerId: string;
  lastSkillId: ResourceNodeDefinition["skillId"];
  lastGatherTick: number;
  streak: number;
}

export interface GatheringMomentumResult {
  ruleId: string;
  truthStatus: GatheringMomentumTruthStatus;
  skillId: ResourceNodeDefinition["skillId"];
  streak: number;
  bonusPermille: number;
  maxBonusPermille: number;
  windowTicks: number;
  xpBeforeMomentum: number;
  xpReward: number;
  expiresAtTick: number;
}

export interface GatherResourceResult {
  ok: boolean;
  playerId: string;
  nodeId: string;
  reason?: ResourceGatherReason;
  requiredTool?: RequiredToolSlot;
  skillId?: ResourceNodeDefinition["skillId"];
  xpReward?: number;
  itemRewardId?: string;
  itemRewardName?: string;
  momentum?: GatheringMomentumResult;
  bonusYield?: number;
  toolTier?: number;
  inventoryAdded?: boolean;
  inventoryQuantity?: number;
  snapshot?: ResourceNodeSnapshot | null;
}
