/**
 * PAPERDOLL TYPES
 *
 * Paperdoll snapshot types for equipment view.
 * Deterministic: No Date.now(), no Math.random().
 */

import type { CharacterProfileSnapshot } from "./CharacterTypes.js";
import {
  EQUIPMENT_DEFINITIONS,
  EQUIPMENT_SLOT_DEFINITIONS,
  compareEquipmentSlotIds,
  type EquipmentNumberEntry,
  type EquipmentSlotId,
  type PlayerEquipmentState,
} from "../equipment/EquipmentTypes.js";

export interface PaperdollSlotSnapshot {
  slotId: EquipmentSlotId;
  itemId: string | null;
  title: string;
  displayId?: string;
  iconId?: string;
  stats?: readonly EquipmentNumberEntry[];
  requirements?: readonly EquipmentNumberEntry[];
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

  return {
    character: input.character,
    slots: EQUIPMENT_SLOT_DEFINITIONS.map((slotDefinition) => {
      const found = equipped.find((slot) => slot.slotId === slotDefinition.slotId);
      const itemDefinition = found ? EQUIPMENT_DEFINITIONS[found.itemId] : undefined;

      if (!found) {
        return {
          slotId: slotDefinition.slotId,
          itemId: null,
          title: slotDefinition.emptyTitle,
        };
      }

      return {
        slotId: slotDefinition.slotId,
        itemId: found.itemId,
        title: itemDefinition?.title ?? found.title,
        ...(itemDefinition?.displayId || found.displayId
          ? { displayId: itemDefinition?.displayId ?? found.displayId }
          : {}),
        ...(itemDefinition?.iconId || found.iconId
          ? { iconId: itemDefinition?.iconId ?? found.iconId }
          : {}),
        ...(itemDefinition?.stats || found.stats
          ? { stats: [...(itemDefinition?.stats ?? found.stats ?? [])] }
          : {}),
        ...(itemDefinition?.requirements || found.requirements
          ? { requirements: [...(itemDefinition?.requirements ?? found.requirements ?? [])] }
          : {}),
      };
    }).sort((a, b) => compareEquipmentSlotIds(a.slotId, b.slotId)),
  };
}
