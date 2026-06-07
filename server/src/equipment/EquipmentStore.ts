/**
 * EQUIPMENT STORE
 *
 * Server-authoritative in-memory equipment store.
 * Deterministic: No Math.random(), stable ordering, no Date.now().
 */

import {
  EQUIPMENT_DEFINITIONS,
  createDefaultEquipmentState,
  isEquipmentItemId,
  normalizeEquipmentState,
  type EquipItemResult,
  type UnequipItemResult,
  type PlayerEquipmentState,
} from "./EquipmentTypes.js";

export class EquipmentStore {
  private readonly equipmentByPlayer = new Map<string, PlayerEquipmentState>();

  getPlayerEquipment(playerId: string): PlayerEquipmentState {
    const existing = this.equipmentByPlayer.get(playerId);
    if (existing) return normalizeEquipmentState(existing, playerId);

    const created = createDefaultEquipmentState(playerId);
    this.equipmentByPlayer.set(playerId, created);
    return created;
  }

  equipItem(input: {
    playerId: string;
    itemId: string;
    ownsItem: boolean;
  }): EquipItemResult {
    if (!input.playerId || input.playerId === "anonymous") {
      return {
        ok: false,
        playerId: input.playerId,
        itemId: input.itemId,
        reason: "invalid_player",
      };
    }

    if (!isEquipmentItemId(input.itemId)) {
      return {
        ok: false,
        playerId: input.playerId,
        itemId: input.itemId,
        reason: "invalid_item",
      };
    }

    if (!input.ownsItem) {
      return {
        ok: false,
        playerId: input.playerId,
        itemId: input.itemId,
        reason: "item_not_owned",
      };
    }

    const definition = EQUIPMENT_DEFINITIONS[input.itemId];
    const state = this.getPlayerEquipment(input.playerId);

    const nextState = normalizeEquipmentState(
      {
        ...state,
        slots: [
          ...state.slots.filter((slot) => slot.slotId !== definition.slotId),
          {
            slotId: definition.slotId,
            itemId: definition.itemId,
            title: definition.title,
            tier: definition.tier,
          },
        ],
      },
      input.playerId,
    );

    this.equipmentByPlayer.set(input.playerId, nextState);

    return {
      ok: true,
      playerId: input.playerId,
      itemId: input.itemId,
      reason: "equipped",
      equipment: nextState,
    };
  }

  unequipItem(input: {
    playerId: string;
    slotId: string;
  }): UnequipItemResult {
    if (!input.playerId || input.playerId === "anonymous") {
      return {
        ok: false,
        playerId: input.playerId,
        slotId: input.slotId as any,
        reason: "invalid_player",
      };
    }

    const state = this.getPlayerEquipment(input.playerId);
    const slotExists = state.slots.some((s) => s.slotId === input.slotId);

    if (!slotExists) {
      return {
        ok: false,
        playerId: input.playerId,
        slotId: input.slotId as any,
        reason: "slot_empty",
      };
    }

    // Remove the slot
    const nextState = normalizeEquipmentState(
      {
        ...state,
        slots: state.slots.filter((s) => s.slotId !== input.slotId),
      },
      input.playerId,
    );

    this.equipmentByPlayer.set(input.playerId, nextState);

    return {
      ok: true,
      playerId: input.playerId,
      slotId: input.slotId as any,
      reason: "unequipped",
      equipment: nextState,
    };
  }

  replacePlayerEquipment(playerId: string, state: PlayerEquipmentState): void {
    this.equipmentByPlayer.set(playerId, normalizeEquipmentState(state, playerId));
  }

  clearForTests(): void {
    this.equipmentByPlayer.clear();
  }
}