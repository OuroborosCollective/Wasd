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

function lootBagId(p: { x: number; y: number; ownerId?: string; gold?: number; now: number }): string {
  return `lootbag_${p.ownerId ?? 'world'}_${Math.floor(p.x)}_${Math.floor(p.y)}_${p.gold ?? 0}_${Math.floor(p.now)}`;
}

export function spawnLootBag(p: {
  x: number;
  y: number;
  gold?: number;
  stack?: StackItem[];
  gear?: GearItem[];
  ownerId?: string;
  ttlMs?: number;
  now?: number;
  id?: string;
}): LootBag {
  const now = p.now ?? 0;
  return {
    id: p.id ?? lootBagId({ x: p.x, y: p.y, ownerId: p.ownerId, gold: p.gold, now }),
    x: p.x,
    y: p.y,
    gold: p.gold ?? 0,
    stack: p.stack ?? [],
    gear: p.gear ?? [],
    ownerId: p.ownerId,
    despawnAt: now + (p.ttlMs ?? 2 * 60_000),
  };
}

/** Runtime bag shape used by WorldTick (position + legacy timing). */
export function lootBagToRuntimeBag(bag: LootBag, ownerExclusiveMs: number, now = 0): any {
  return {
    id: bag.id,
    position: { x: bag.x, y: bag.y },
    x: bag.x,
    y: bag.y,
    gold: bag.gold,
    items: bag.stack.map((s) => ({ id: s.id, quantity: s.quantity })),
    gear: bag.gear,
    ownerId: bag.ownerId,
    ownerExclusiveUntil: now + ownerExclusiveMs,
    despawnAt: bag.despawnAt,
  };
}
