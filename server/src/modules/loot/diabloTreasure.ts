import type { BaseItem, Affix, GeneratedItem } from "./diabloItemGen.js";
import { generateItem, rarityRoll } from "./diabloItemGen.js";

export type TreasureEntry =
  | { type: "gold"; min: number; max: number; weight: number }
  | { type: "base"; baseId: string; weight: number }
  | { type: "tc"; tcId: string; weight: number };

export type TreasureClass = {
  id: string;
  picks: number;
  entries: TreasureEntry[];
};

function pickWeightedEntry(entries: TreasureEntry[]): TreasureEntry {
  if (entries.length === 0) {
    throw new Error("pickWeightedEntry: empty entries");
  }
  const total = entries.reduce((s, x) => s + Math.max(0, x.weight), 0);
  if (total <= 0) return entries[entries.length - 1]!;
  let r = Math.random() * total;
  for (const e of entries) {
    r -= Math.max(0, e.weight);
    if (r <= 0) return e;
  }
  return entries[entries.length - 1]!;
}

export function rollTreasure(opts: {
  tcId: string;
  tcs: Record<string, TreasureClass>;
  bases: Record<string, BaseItem>;
  affixes: Affix[];
  ilvl: number;
  mf?: number;
}): { gold: number; items: GeneratedItem[] } {
  const tc = opts.tcs[opts.tcId];
  if (!tc) return { gold: 0, items: [] };

  let gold = 0;
  const items: GeneratedItem[] = [];

  const rollFrom = (tcId: string) => {
    const t = opts.tcs[tcId];
    if (!t) return;
    for (let i = 0; i < t.picks; i++) {
      const e = pickWeightedEntry(t.entries);
      if (e.type === "gold") {
        gold += Math.floor(e.min + Math.random() * (e.max - e.min + 1));
      } else if (e.type === "tc") {
        rollFrom(e.tcId);
      } else if (e.type === "base") {
        const base = opts.bases[e.baseId];
        if (!base) continue;
        const rarity = rarityRoll(opts.mf ?? 0);
        items.push(generateItem({ base, ilvl: opts.ilvl, rarity, affixes: opts.affixes, mf: opts.mf }));
      }
    }
  };

  rollFrom(opts.tcId);
  return { gold, items };
}
