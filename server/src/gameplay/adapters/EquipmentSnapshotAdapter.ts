/**
 * EQUIPMENT SNAPSHOT ADAPTER
 *
 * Converts various equipment source formats to LiveGameplayEquipmentSlot[].
 *
 * Rules:
 * - No unseeded randomness
 * - No wall-clock time for gameplay state
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
      // ⚡ Bolt Optimization: Replace slow localeCompare with direct string comparison for equipment slots
      .sort((a, b) => (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0))
  );
}