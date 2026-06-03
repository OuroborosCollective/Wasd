import {
  applyEquipmentEvent,
  type EquipmentEvent,
  type EquipmentState
} from "./equipment";
import {
  applyInventoryEvent,
  type InventoryEvent,
  type InventoryState
} from "./inventory";
import { applyQuestEvent, type QuestEvent, type QuestState } from "./quests";

export type AuthoritativeGameplayEvent =
  | InventoryEvent
  | EquipmentEvent
  | QuestEvent;

export interface GameplayStateBundle {
  inventory: InventoryState;
  equipment: EquipmentState;
  quests: QuestState[];
}

export function applyAuthoritativeGameplayEvent(
  state: GameplayStateBundle,
  event: AuthoritativeGameplayEvent
): GameplayStateBundle {
  if (event.type.startsWith("inventory_")) {
    return {
      ...state,
      inventory: applyInventoryEvent(state.inventory, event as InventoryEvent)
    };
  }

  if (event.type.startsWith("equipment_")) {
    return {
      ...state,
      equipment: applyEquipmentEvent(state.equipment, event as EquipmentEvent)
    };
  }

  if (event.type.startsWith("quest_")) {
    return {
      ...state,
      quests: applyQuestEvent(state.quests, event as QuestEvent)
    };
  }

  return state;
}