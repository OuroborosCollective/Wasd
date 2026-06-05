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
  | "invalid_player"
  | "gathered";

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
}

export interface GatherResourceResult {
  ok: boolean;
  playerId: string;
  nodeId: string;
  reason?: ResourceGatherReason;
  skillId?: ResourceNodeDefinition["skillId"];
  xpReward?: number;
  itemRewardId?: string;
  itemRewardName?: string;
  snapshot?: ResourceNodeSnapshot | null;
}