import { createARESeed, type ARERng, SeededARERng } from "../../core/determinism/AREDeterminism.js";

export type BadluckState = { noLegendaryStreak: number };

export type BaseWithTags = { tags?: string[] };

/**
 * Favor bases that match `preferredTags`; optionally boost MF from bad-luck streak (no legendary).
 */
export function smartLootPickBase<T extends BaseWithTags>(
  bases: T[],
  preferredTags: string[],
  badluck: BadluckState,
  rng: ARERng = new SeededARERng(createARESeed([
    "smart-loot",
    preferredTags.join(","),
    badluck.noLegendaryStreak,
    bases.length,
  ]))
): { base: T; mfBoost: number } {
  if (bases.length === 0) {
    throw new Error("smartLootPickBase: empty bases");
  }
  const mfBoost = Math.min(50, Math.max(0, badluck.noLegendaryStreak)) * 0.002;
  const tagBoostBases = bases.map((b) => ({
    b,
    w: 1 + (b.tags?.some((t: string) => preferredTags.includes(t)) ? 0.75 : 0),
  }));
  const total = tagBoostBases.reduce((s, x) => s + x.w, 0);
  let r = rng.nextFloat() * total;
  for (const x of tagBoostBases) {
    r -= x.w;
    if (r <= 0) return { base: x.b, mfBoost };
  }
  return { base: tagBoostBases[tagBoostBases.length - 1]!.b, mfBoost };
}
