/**
 * INVENTORY SNAPSHOT ADAPTER
 *
 * Converts various inventory source formats to LiveGameplayInventoryItem[].
 * Merges duplicate item IDs deterministically.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - Deterministic sort by itemId
 */

import type { LiveGameplayInventoryItem } from "../LiveGameplaySnapshotTypes.js";

export interface InventorySnapshotSourceItem {
  readonly itemId?: string;
  readonly id?: string;
  readonly quantity?: number;
  readonly count?: number;
}

export function toLiveInventoryItems(items: readonly InventorySnapshotSourceItem[]): readonly LiveGameplayInventoryItem[] {
  const merged = new Map<string, number>();

  for (const item of items) {
    const itemId = String(item.itemId ?? item.id ?? "").trim();
    if (!itemId) continue;

    const quantity = Number(item.quantity ?? item.count ?? 0);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) continue;

    merged.set(itemId, (merged.get(itemId) ?? 0) + quantity);
  }

  return Object.freeze(
    [...merged.entries()]
      .map(([itemId, quantity]) => Object.freeze({ itemId, quantity }))
      .sort((a, b) => a.itemId.localeCompare(b.itemId))
  );
}