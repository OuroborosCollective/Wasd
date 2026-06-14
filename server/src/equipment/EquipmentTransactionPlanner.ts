import {
  INVENTORY_CAPACITY,
  ITEM_DEFINITIONS,
  normalizePlayerInventoryState,
  type InventoryItemId,
  type PlayerInventoryState,
} from "../inventory/InventoryTypes.js";
import {
  EQUIPMENT_DEFINITIONS,
  compareEquipmentSlotIds,
  createEquippedSlotFromDefinition,
  normalizeEquipmentState,
  type EquipmentSlotId,
  type PlayerEquipmentState,
} from "./EquipmentTypes.js";

export interface StagedEquipTransaction {
  readonly nextInventory: PlayerInventoryState;
  readonly nextEquipment: PlayerEquipmentState;
  readonly replacedItemId?: InventoryItemId;
}

export interface StagedUnequipTransaction {
  readonly nextInventory: PlayerInventoryState;
  readonly nextEquipment: PlayerEquipmentState;
  readonly removedItemId: InventoryItemId;
}

function removeOneInventoryItem(
  state: PlayerInventoryState,
  itemId: InventoryItemId,
): PlayerInventoryState | null {
  const existing = state.slots.find((slot) => slot.itemId === itemId);
  if (!existing || existing.quantity <= 0) return null;

  const nextSlots = existing.quantity === 1
    ? state.slots.filter((slot) => slot.itemId !== itemId)
    : state.slots.map((slot) =>
        slot.itemId === itemId
          ? { ...slot, quantity: slot.quantity - 1 }
          : slot,
      );

  return normalizePlayerInventoryState({ ...state, slots: nextSlots }, state.playerId);
}

function addOneInventoryItem(
  state: PlayerInventoryState,
  itemId: InventoryItemId,
): PlayerInventoryState | null {
  const definition = ITEM_DEFINITIONS[itemId];
  const existing = state.slots.find((slot) => slot.itemId === itemId);

  if (existing && definition.stackable) {
    return normalizePlayerInventoryState(
      {
        ...state,
        slots: state.slots.map((slot) =>
          slot.itemId === itemId
            ? { ...slot, quantity: Math.min(slot.quantity + 1, definition.maxStack) }
            : slot,
        ),
      },
      state.playerId,
    );
  }

  if (state.slots.length >= (state.capacity || INVENTORY_CAPACITY)) return null;

  return normalizePlayerInventoryState(
    {
      ...state,
      slots: [
        ...state.slots,
        {
          slotId: definition.stackable
            ? `slot_${definition.id}`
            : `slot_${definition.id}_${String(state.slots.filter((slot) => slot.itemId === definition.id).length + 1).padStart(3, "0")}`,
          itemId: definition.id,
          name: definition.name,
          quantity: 1,
          category: definition.category,
          stackable: definition.stackable,
          maxStack: definition.maxStack,
        },
      ],
    },
    state.playerId,
  );
}

export function planEquipTransaction(input: {
  readonly playerId: string;
  readonly itemId: InventoryItemId;
  readonly inventory: PlayerInventoryState;
  readonly equipment: PlayerEquipmentState;
}): StagedEquipTransaction | null {
  const definition = EQUIPMENT_DEFINITIONS[input.itemId];
  const inventoryAfterConsume = removeOneInventoryItem(input.inventory, input.itemId);
  if (!inventoryAfterConsume) return null;

  const existingSlot = input.equipment.slots.find((slot) => slot.slotId === definition.slotId);
  const nextInventory = existingSlot
    ? addOneInventoryItem(inventoryAfterConsume, existingSlot.itemId)
    : inventoryAfterConsume;

  if (!nextInventory) return null;

  const nextEquipment = normalizeEquipmentState(
    {
      ...input.equipment,
      slots: [
        ...input.equipment.slots.filter((slot) => slot.slotId !== definition.slotId),
        createEquippedSlotFromDefinition(definition),
      ].sort((a, b) => compareEquipmentSlotIds(a.slotId, b.slotId)),
    },
    input.playerId,
  );

  return {
    nextInventory,
    nextEquipment,
    ...(existingSlot ? { replacedItemId: existingSlot.itemId } : {}),
  };
}

export function planUnequipTransaction(input: {
  readonly playerId: string;
  readonly slotId: EquipmentSlotId;
  readonly inventory: PlayerInventoryState;
  readonly equipment: PlayerEquipmentState;
}): StagedUnequipTransaction | null {
  const existingSlot = input.equipment.slots.find((slot) => slot.slotId === input.slotId);
  if (!existingSlot) return null;

  const nextInventory = addOneInventoryItem(input.inventory, existingSlot.itemId);
  if (!nextInventory) return null;

  const nextEquipment = normalizeEquipmentState(
    {
      ...input.equipment,
      slots: input.equipment.slots.filter((slot) => slot.slotId !== input.slotId),
    },
    input.playerId,
  );

  return {
    nextInventory,
    nextEquipment,
    removedItemId: existingSlot.itemId,
  };
}
