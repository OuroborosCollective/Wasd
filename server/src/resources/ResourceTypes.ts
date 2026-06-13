/**
 * RESOURCE TYPES
 *
 * Server-side deterministic resource node types.
 * No Math.random(), no Date.now() for gameplay state.
 */

import type { SkillId } from "../skills/SkillTypes.js";

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
  /** Equipment slot ID that must be equipped to gather this node. */
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
  /** Equipment slot required to gather this node (undefined = no tool required). */
  requiredTool?: RequiredToolSlot;
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
  /** Explicit data-channel signal that this rule is eligible to become runtime truth. */
  canBecomeTruth: boolean;
  /** Human-readable content-to-runtime truth path, kept in game-data and validated. */
  truthPath: string;
  /** Promotion gate text for editors/agents; not used as gameplay input. */
  truthPromotion: string;
  appliesToSkillIds: ResourceNodeDefinition["skillId"][];
  /** Tick window for continuing the same-skill chain. */
  windowTicks: number;
  /** Added per streak step after the first gather. 50 = +5%. */
  streakBonusPermille: number;
  /** Maximum streak count. Streak 1 has no bonus. */
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
  /** Which tool slot is required (only set when reason is missing_tool) */
  requiredTool?: RequiredToolSlot;
  skillId?: ResourceNodeDefinition["skillId"];
  xpReward?: number;
  itemRewardId?: string;
  itemRewardName?: string;
  /** Deterministic same-skill XP momentum emitted only after successful gathers. */
  momentum?: GatheringMomentumResult;
  /** Bonus yield from Tier 2 tool (+1 quantity when applicable) */
  bonusYield?: number;
  /** Tier of the equipped tool that provided the bonus (2 if bonusYield > 0) */
  toolTier?: number;
  /** Whether the item was successfully added to player inventory */
  inventoryAdded?: boolean;
  /** Quantity added to inventory (0 if failed) */
  inventoryQuantity?: number;
  snapshot?: ResourceNodeSnapshot | null;
}
