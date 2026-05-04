// @ts-nocheck
import type { Affix, GeneratedItem, StatKey } from "./diabloItemGen.js";
import { randInt } from "./diabloItemGen.js";

/**
 * Re-roll one random existing rolled stat key (excluding base weapon dmg lines if you only pass affix stats — caller passes full item).
 */
export function rerollOneStat(item: GeneratedItem, allowed: StatKey[], affixPool: Affix[]): void {
  const keys = Object.keys(item.stats) as StatKey[];
  if (!keys.length) throw new Error("no_stats");
  const victim = keys[Math.floor(Math.random() * keys.length)]!;
  delete item.stats[victim];

  const pool = affixPool.filter((x) => x.rolls.some((r) => allowed.includes(r.stat)));
  if (!pool.length) throw new Error("no_affix_pool");
  const a = pool[Math.floor(Math.random() * pool.length)]!;
  for (const rr of a.rolls) {
    if (!allowed.includes(rr.stat)) continue;
    item.stats[rr.stat] = (item.stats[rr.stat] ?? 0) + randInt(rr.min, rr.max);
  }
}
