/**
 * GATHERING SERVICE
 *
 * Server-authoritative gathering logic.
 * Connects resource nodes to skill XP and item rewards.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - Server-authoritative: playerId, skill level, XP, items
 * - Deterministic respawn by serverTick
 */

import { getSkillProgressionService } from "../skills/skillRuntime.js";
import type { PlayerSkillState, SkillSnapshot } from "../skills/SkillTypes.js";
import type { ResourceNodeStore } from "./ResourceNodeStore.js";
import { resourceNodeStore } from "./ResourceNodeStore.js";
import type { GatherResourceResult } from "./ResourceTypes.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { equipmentService } from "../equipment/equipmentRuntime.js";
import { applyPermille, getGatheringToolBonus } from "../equipment/EquipmentBonus.js";

/**
 * Get player skill level for a specific skill.
 * Returns 1 as default if skill not found.
 */
function getSkillLevel(skills: SkillSnapshot[], skillId: string): number {
  return skills.find((s) => s.id === skillId)?.level ?? 1;
}

export interface GatherInput {
  playerId: string;
  nodeId: string;
  playerPosition: { x: number; y: number };
  currentTick: number;
  /** Optional callback for item reward (inventory system integration point) */
  onItemReward?: (item: { id: string; name: string; quantity: number }) => void;
}

export class GatheringService {
  constructor(private readonly nodes: ResourceNodeStore = resourceNodeStore) {}

  /**
   * Attempt to gather from a resource node.
   * Server-authoritative: resolves skill level, applies XP, triggers rewards.
   * Persists gathered items to player inventory.
   */
  async gather(input: GatherInput): Promise<GatherResourceResult> {
    const { playerId, nodeId, playerPosition, currentTick, onItemReward } = input;

    // Get player skill state from persistence
    const skillService = await getSkillProgressionService();
    const skillState: PlayerSkillState = await skillService.getPlayerSkillState(playerId);

    // Determine skill level for the node's required skill
    const nodeSnapshot = this.nodes.getSnapshot(nodeId, currentTick);
    const playerSkillLevel = nodeSnapshot
      ? getSkillLevel(skillState.skills, nodeSnapshot.skillId)
      : 1;

    // Attempt gather in the node store
    const result = this.nodes.gather({
      playerId,
      nodeId,
      playerPosition,
      currentTick,
      playerSkillLevel,
    });

    // If gather failed, return result immediately
    if (!result.ok || !result.skillId || !result.xpReward) {
      return result;
    }

    // Get equipped tool bonus for the skill
    const equipment = await equipmentService.getPlayerEquipment(playerId);
    const bonus = getGatheringToolBonus({
      equipment,
      skillId: result.skillId,
    });

    // Apply XP multiplier from equipped tool
    const xpReward = applyPermille(result.xpReward, bonus.xpMultiplierPermille);

    // Apply skill XP reward
    await skillService.applyEvent({
      type: "skill_xp_gain",
      playerId,
      skillId: result.skillId,
      amount: xpReward,
      source: "resource_gather",
    });

    // Persist item reward to player inventory
    if (result.itemRewardId) {
      const inventoryService = await getInventoryService();
      const inventoryResult = await inventoryService.addItem({
        playerId,
        itemId: result.itemRewardId,
        quantity: 1,
      });

      // Extend result with inventory status
      (result as any).inventoryAdded = inventoryResult.ok;
      (result as any).inventoryQuantity = inventoryResult.ok ? inventoryResult.quantity : 0;

      // If inventory failed (full), log but still grant XP and deplete node
      // MVP: For stackable resources with 999 maxStack, inventory_full is rare
      if (!inventoryResult.ok) {
        console.warn(
          `[gathering] inventory add failed for ${playerId}: ${inventoryResult.reason}`,
        );
      }
    }

    // Trigger item reward callback (backward compatibility)
    if (result.itemRewardId && result.itemRewardName && onItemReward) {
      onItemReward({
        id: result.itemRewardId,
        name: result.itemRewardName,
        quantity: 1,
      });
    }

    return result;
  }

  /**
   * Get all resource node snapshots for the current tick.
   * Used for LiveGameplaySnapshot.
   */
  listResourceSnapshots(currentTick: number) {
    return this.nodes.listSnapshots(currentTick);
  }
}

/**
 * Global singleton instance for production use.
 */
export const gatheringService = new GatheringService();