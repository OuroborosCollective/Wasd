import type { GeneratedItem, StatKey } from "./diabloItemGen.js";

export type Gem = { id: string; stats: Partial<Record<StatKey, number>> };

export type SocketedItem = GeneratedItem & { sockets: number; gems: (string | null)[] };

export function applyGemsStats(item: SocketedItem, gemDefs: Record<string, Gem>): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = { ...item.stats };
  for (const gid of item.gems) {
    if (!gid) continue;
    const g = gemDefs[gid];
    if (!g) continue;
    for (const [k, v] of Object.entries(g.stats)) {
      const key = k as StatKey;
      out[key] = (out[key] ?? 0) + (v as number);
    }
  }
  return out;
}
