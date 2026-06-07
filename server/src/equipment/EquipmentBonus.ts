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

export function getGatheringToolBonus(input: {
  equipment: PlayerEquipmentState;
  skillId: "woodcutting" | "mining" | "fishing";
}): {
  xpMultiplierPermille: number;
  gatherRespawnReductionTicks: number;
  tier: number;
} {
  const equippedDefinitions = input.equipment.slots
    .map((slot) => EQUIPMENT_DEFINITIONS[slot.itemId])
    .filter(Boolean);

  const matching = equippedDefinitions.find(
    (definition) => definition.skillBonus.skillId === input.skillId,
  );

  return {
    xpMultiplierPermille: matching?.skillBonus.xpMultiplierPermille ?? 1000,
    gatherRespawnReductionTicks: matching?.skillBonus.gatherRespawnReductionTicks ?? 0,
    tier: matching?.tier ?? 1,
  };
}

export function applyPermille(value: number, permille: number): number {
  return Math.max(0, Math.floor((value * permille) / 1000));
}