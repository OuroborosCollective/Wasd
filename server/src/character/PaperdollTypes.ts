/**
 * PAPERDOLL TYPES
 *
 * Paperdoll snapshot types for equipment view.
 * Deterministic: No Date.now(), no Math.random().
 */

import type { CharacterProfileSnapshot } from "./CharacterTypes.js";
import type { PlayerEquipmentState } from "../equipment/EquipmentTypes.js";

export interface PaperdollSlotSnapshot {
  slotId: string;
  itemId: string | null;
  title: string;
}

export interface PaperdollSnapshot {
  character: CharacterProfileSnapshot | null;
  slots: PaperdollSlotSnapshot[];
}

export function createPaperdollSnapshot(input: {
  character: CharacterProfileSnapshot | null;
  equipment: PlayerEquipmentState | null;
}): PaperdollSnapshot {
  const equipped = input.equipment?.slots ?? [];

  const slotIds = [
    "woodcutting_tool",
    "mining_tool",
    "fishing_tool",
  ];

  return {
    character: input.character,
    slots: slotIds.map((slotId) => {
      const found = equipped.find((slot) => slot.slotId === slotId);

      return {
        slotId,
        itemId: found?.itemId ?? null,
        title: found?.title ?? "Empty",
      };
    }).sort((a, b) => a.slotId.localeCompare(b.slotId)),
  };
}