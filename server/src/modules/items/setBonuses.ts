import type { GeneratedItem, StatKey } from "../loot/diabloItemGen.js";

export type SetBonus = { pieces: number; stats: Partial<Record<StatKey, number>>; powerId?: string };
export type ItemSetDef = { id: string; name: string; pieceBaseIds: string[]; bonuses: SetBonus[] };

export function computeSetBonuses(equipped: GeneratedItem[], sets: Record<string, ItemSetDef>): {
  stats: Partial<Record<StatKey, number>>;
  powers: string[];
} {
  const counts = new Map<string, number>();
  for (const it of equipped) {
    if (it.setId) counts.set(it.setId, (counts.get(it.setId) ?? 0) + 1);
  }

  const stats: Partial<Record<StatKey, number>> = {};
  const powers: string[] = [];

  for (const [setId, n] of counts) {
    const def = sets[setId];
    if (!def) continue;
    for (const b of def.bonuses) {
      if (n >= b.pieces) {
        for (const [k, v] of Object.entries(b.stats)) {
          const kk = k as StatKey;
          stats[kk] = (stats[kk] ?? 0) + (v as number);
        }
        if (b.powerId) powers.push(b.powerId);
      }
    }
  }
  return { stats, powers };
}
