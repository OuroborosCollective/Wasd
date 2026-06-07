/**
 * EQUIPMENT SNAPSHOT ADAPTER
 *
 * Converts various equipment source formats to LiveGameplayEquipmentSlot[].
 *
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - Deterministic sort by slot
 */

import type { LiveGameplayEquipmentSlot } from "../LiveGameplaySnapshotTypes.js";

export interface EquipmentSnapshotSourceSlot {
  readonly slot: string;
  readonly itemId?: string | null;
}

export function toLiveEquipmentSlots(slots: readonly EquipmentSnapshotSourceSlot[]): readonly LiveGameplayEquipmentSlot[] {
  return Object.freeze(
    slots
      .map((slot) =>
        Object.freeze({
          slot: String(slot.slot).trim(),
          itemId: slot.itemId ? String(slot.itemId).trim() : null,
        })
      )
      .filter((slot) => slot.slot.length > 0)
      .sort((a, b) => a.slot.localeCompare(b.slot))
  );
}