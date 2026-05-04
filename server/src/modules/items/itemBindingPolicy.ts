// @ts-nocheck
import { ItemRegistry } from "../inventory/ItemRegistry.js";

type BoundContext = {
  itemId?: unknown;
  baseId?: unknown;
  id?: unknown;
  uid?: unknown;
  boundOnAcquire?: unknown;
  nonTransferable?: unknown;
  tradeable?: unknown;
  droppable?: unknown;
  bound?: unknown;
  meta?: unknown;
};

function asItemId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function hasTrueFlag(value: unknown): boolean {
  return value === true;
}

function hasFalseFlag(value: unknown): boolean {
  return value === false;
}

export function resolveItemDefinitionForTransfer(itemLike: BoundContext): any | null {
  const byId = asItemId(itemLike.itemId) || asItemId(itemLike.baseId) || asItemId(itemLike.id);
  if (!byId) return null;
  return ItemRegistry.getItem(byId) ?? null;
}

export function isItemBoundOrNonTransferable(itemLike: BoundContext): boolean {
  const def = resolveItemDefinitionForTransfer(itemLike);
  if (def) {
    if (hasTrueFlag(def.boundOnAcquire)) return true;
    if (hasTrueFlag(def.nonTransferable)) return true;
    if (hasFalseFlag(def.tradeable)) return true;
  }
  if (hasTrueFlag(itemLike.boundOnAcquire)) return true;
  if (hasTrueFlag(itemLike.nonTransferable)) return true;
  if (hasFalseFlag(itemLike.tradeable)) return true;
  if (hasFalseFlag(itemLike.droppable)) return true;
  if (hasTrueFlag(itemLike.bound)) return true;
  const meta = itemLike.meta && typeof itemLike.meta === "object" ? (itemLike.meta as Record<string, unknown>) : null;
  if (meta) {
    if (hasTrueFlag(meta.boundOnAcquire)) return true;
    if (hasTrueFlag(meta.nonTransferable)) return true;
    if (hasFalseFlag(meta.tradeable)) return true;
  }
  return false;
}

export function normalizeBoundItemMeta<T extends Record<string, unknown>>(itemLike: T): T {
  const def = resolveItemDefinitionForTransfer(itemLike);
  const shouldBind =
    Boolean(def?.boundOnAcquire) ||
    Boolean(def?.nonTransferable) ||
    def?.tradeable === false ||
    isItemBoundOrNonTransferable(itemLike);
  if (!shouldBind) return itemLike;
  return {
    ...itemLike,
    bound: true,
    boundOnAcquire: true,
    nonTransferable: true,
    tradeable: false,
    droppable: false,
  };
}
