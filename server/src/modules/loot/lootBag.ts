// @ts-nocheck
import { randomUUID } from "node:crypto";
import type { GearItem, StackItem } from "../items/dualInventoryTypes.js";

export type LootBag = {
  id: string;
  x: number;
  y: number;
  gold: number;
  stack: StackItem[];
  gear: GearItem[];
  ownerId?: string;
  despawnAt: number;
};

export function spawnLootBag(p: {
  x: number;
  y: number;
  gold?: number;
  stack?: StackItem[];
  gear?: GearItem[];
  ownerId?: string;
  ttlMs?: number;
}): LootBag {
  return {
    id: randomUUID(),
    x: p.x,
    y: p.y,
    gold: p.gold ?? 0,
    stack: p.stack ?? [],
    gear: p.gear ?? [],
    ownerId: p.ownerId,
    despawnAt: Date.now() + (p.ttlMs ?? 2 * 60_000),
  };
}

/** Runtime bag shape used by WorldTick (position + legacy timing). */
export function lootBagToRuntimeBag(bag: LootBag, ownerExclusiveMs: number): any {
  return {
    id: bag.id,
    position: { x: bag.x, y: bag.y },
    x: bag.x,
    y: bag.y,
    gold: bag.gold,
    items: bag.stack.map((s) => ({ id: s.id, quantity: s.quantity })),
    gear: bag.gear,
    ownerId: bag.ownerId,
    ownerExclusiveUntil: Date.now() + ownerExclusiveMs,
    despawnAt: bag.despawnAt,
  };
}
