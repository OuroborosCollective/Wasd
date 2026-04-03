import { ItemRegistry } from "./ItemRegistry.js";

function rowQty(row: any): number {
  const raw = Number(row?.quantity);
  const q = Number.isFinite(raw) ? Math.floor(raw) : 1;
  return Math.max(1, q);
}

/**
 * Merge stackable items with the same id into rows of at most maxStack.
 */
export function normalizeInventoryStacks(player: any): void {
  if (!Array.isArray(player.inventory)) player.inventory = [];
  const inv = player.inventory;
  type Bucket = { def: ReturnType<typeof ItemRegistry.getItem>; rows: any[] };
  const nonStack: any[] = [];
  const buckets = new Map<string, Bucket>();

  for (const raw of inv) {
    if (!raw || typeof raw.id !== "string") continue;
    const def = ItemRegistry.getItem(raw.id);
    if (!ItemRegistry.stacksWithDefinition(def)) {
      nonStack.push({ ...raw, quantity: rowQty(raw) });
      continue;
    }
    let b = buckets.get(raw.id);
    if (!b) {
      b = { def, rows: [] };
      buckets.set(raw.id, b);
    }
    b.rows.push(raw);
  }

  const merged: any[] = [...nonStack];
  for (const { def, rows } of buckets.values()) {
    const max = ItemRegistry.maxStackFor(def);
    let total = 0;
    for (const r of rows) total += rowQty(r);
    const templateId = rows[0].id;
    while (total > 0) {
      const n = Math.min(max, total);
      const inst = ItemRegistry.createInstance(templateId, n);
      if (inst) merged.push(inst);
      total -= n;
    }
  }
  player.inventory = merged;
}
