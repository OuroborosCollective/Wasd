import { createARESeed, type ARERng, SeededARERng } from "../../core/determinism/AREDeterminism.js";
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

function pickWeightedEntry(entries: TreasureEntry[], rng: ARERng): TreasureEntry {
  if (entries.length === 0) {
    throw new Error("pickWeightedEntry: empty entries");
  }
  const total = entries.reduce((s, x) => s + Math.max(0, x.weight), 0);
  if (total <= 0) return entries[entries.length - 1]!;
  let r = rng.nextFloat() * total;
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
  rng?: ARERng;
}): { gold: number; items: GeneratedItem[] } {
  const rng = opts.rng ?? new SeededARERng(createARESeed(["treasure", opts.tcId, opts.ilvl, opts.mf ?? 0]));
  const tc = opts.tcs[opts.tcId];
  if (!tc) return { gold: 0, items: [] };

  let gold = 0;
  const items: GeneratedItem[] = [];

  const rollFrom = (tcId: string, depth = 0) => {
    const t = opts.tcs[tcId];
    if (!t) return;
    for (let i = 0; i < t.picks; i++) {
      const pickRng = rng.fork(`${tcId}:${depth}:${i}`);
      const e = pickWeightedEntry(t.entries, pickRng.fork("entry"));
      if (e.type === "gold") {
        gold += pickRng.nextRange(e.min, e.max);
      } else if (e.type === "tc") {
        rollFrom(e.tcId, depth + 1);
      } else if (e.type === "base") {
        const base = opts.bases[e.baseId];
        if (!base) continue;
        const rarity = rarityRoll(opts.mf ?? 0, pickRng.fork("rarity"));
        items.push(generateItem({
          base,
          ilvl: opts.ilvl,
          rarity,
          affixes: opts.affixes,
          mf: opts.mf,
          rng: pickRng.fork("item"),
        }));
      }
    }
  };

  rollFrom(opts.tcId);
  return { gold, items };
}
