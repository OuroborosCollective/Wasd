/**
 * EQUIPMENT BONUS
 *
 * Deterministic gathering tool bonus calculations.
 * No Date.now(), no Math.random().
 */

import {
  EQUIPMENT_DEFINITIONS,
  type PlayerEquipmentState,
} from "./EquipmentTypes.js";
import type { EquipmentStatBlock } from "./EquipmentStatTypes.js";

export interface GatheringToolBonus {
  xpMultiplierPermille: number;
  gatherRespawnReductionTicks: number;
  tier: number;
  /** Equipment gathering yield bonus (from procedural loot items) */
  equipmentGatheringYield?: number;
  /** Equipment gathering XP multiplier permille bonus */
  equipmentGatheringXp?: number;
}

export function getGatheringToolBonus(input: {
  equipment: PlayerEquipmentState;
  skillId: "woodcutting" | "mining" | "fishing";
}): GatheringToolBonus {
  const equippedDefinitions = input.equipment.slots
    .map((slot) => EQUIPMENT_DEFINITIONS[slot.itemId])
    .filter((definition) => Boolean(definition?.skillBonus));

  const matching = equippedDefinitions.find(
    (definition) => definition.skillBonus?.skillId === input.skillId,
  );

  return {
    xpMultiplierPermille: matching?.skillBonus?.xpMultiplierPermille ?? 1000,
    gatherRespawnReductionTicks: matching?.skillBonus?.gatherRespawnReductionTicks ?? 0,
    tier: matching?.tier ?? 1,
    equipmentGatheringYield: 0,
    equipmentGatheringXp: 0,
  };
}

/**
 * Extended gathering tool bonus calculation that includes equipment stats.
 * Use this when you have equipment stats from EquipmentStatService.
 */
export function getGatheringToolBonusWithEquipmentStats(
  equipment: PlayerEquipmentState,
  skillId: "woodcutting" | "mining" | "fishing",
  equipmentStats?: EquipmentStatBlock,
): GatheringToolBonus {
  const baseBonus = getGatheringToolBonus({ equipment, skillId });

  if (!equipmentStats) {
    return baseBonus;
  }

  return {
    ...baseBonus,
    equipmentGatheringYield: equipmentStats.gatheringYield,
    equipmentGatheringXp: equipmentStats.gatheringXp,
  };
}

export function applyPermille(value: number, permille: number): number {
  return Math.max(0, Math.floor((value * permille) / 1000));
}
