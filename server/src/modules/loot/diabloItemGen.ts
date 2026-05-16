import { createARESeed, type ARERng, SeededARERng } from "../../core/determinism/AREDeterminism.js";
import { scaleRoll } from "./rollScale.js";

export type Rarity = "common" | "magic" | "rare" | "legendary" | "set";

export type BaseItem = {
  id: string;
  name: string;
  slot: "weapon" | "helm" | "chest" | "ring" | "amulet" | "boots" | "gloves";
  minDmg?: number;
  maxDmg?: number;
  armor?: number;
  tags: string[];
};

export type Affix = {
  id: string;
  name: string;
  group: string;
  tagsAny?: string[];
  minLevel: number;
  rolls: Array<{ stat: StatKey; min: number; max: number }>;
  weight: number;
};

export type StatKey =
  | "str"
  | "dex"
  | "int"
  | "vit"
  | "hp"
  | "armor"
  | "dmgMin"
  | "dmgMax"
  | "crit"
  | "atkSpeed"
  | "fireRes"
  | "coldRes";

export type GeneratedItem = {
  uid: string;
  baseId: string;
  name: string;
  rarity: Rarity;
  ilvl: number;
  seed: number;
  stats: Partial<Record<StatKey, number>>;
  setId?: string;
  legendaryPowerId?: string;
};

export function randInt(min: number, max: number, rng: ARERng = new SeededARERng(createARESeed(["randInt", min, max]))): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi < lo) return lo;
  return rng.nextRange(lo, hi);
}

export function pickWeighted<T extends { weight: number }>(arr: T[], rng: ARERng = new SeededARERng(createARESeed(["pickWeighted", arr.length]))): T {
  if (arr.length === 0) {
    throw new Error("pickWeighted: empty array");
  }
  const total = arr.reduce((s, x) => s + Math.max(0, x.weight), 0);
  if (total <= 0) return arr[arr.length - 1]!;
  let r = rng.nextFloat() * total;
  for (const x of arr) {
    r -= Math.max(0, x.weight);
    if (r <= 0) return x;
  }
  return arr[arr.length - 1]!;
}

export function rarityRoll(mf = 0, rng: ARERng = new SeededARERng(createARESeed(["rarityRoll", mf]))): Rarity {
  const r = rng.nextFloat() * (1 + mf * 0.002);
  if (r > 0.995) return "set";
  if (r > 0.985) return "legendary";
  if (r > 0.92) return "rare";
  if (r > 0.7) return "magic";
  return "common";
}

export function generateItem(opts: {
  base: BaseItem;
  ilvl: number;
  rarity?: Rarity;
  affixes: Affix[];
  mf?: number;
  setId?: string;
  legendaryPowerId?: string;
  rng?: ARERng;
}): GeneratedItem {
  const rng = opts.rng ?? new SeededARERng(createARESeed([
    "diablo-item",
    opts.base.id,
    opts.ilvl,
    opts.rarity ?? "auto",
    opts.mf ?? 0,
    opts.setId ?? "",
    opts.legendaryPowerId ?? "",
  ]));
  const rarity = opts.rarity ?? rarityRoll(opts.mf ?? 0, rng.fork("rarity"));
  const seed = randInt(1, 2 ** 31 - 1, rng.fork("seed"));

  const affixCount =
    rarity === "common"
      ? 0
      : rarity === "magic"
        ? randInt(1, 2, rng.fork("affix-count"))
        : rarity === "rare"
          ? randInt(3, 5, rng.fork("affix-count"))
          : rarity === "legendary"
            ? randInt(4, 6, rng.fork("affix-count"))
            : rarity === "set"
              ? randInt(4, 6, rng.fork("affix-count"))
              : 0;

  const pool = opts.affixes.filter(
    (a) =>
      a.minLevel <= opts.ilvl && (!a.tagsAny || a.tagsAny.some((t) => opts.base.tags.includes(t)))
  );

  const chosen: Affix[] = [];
  const usedGroups = new Set<string>();
  for (let i = 0; i < affixCount && pool.length; i++) {
    const candidates = pool.filter((a) => !usedGroups.has(a.group));
    if (!candidates.length) break;
    const a = pickWeighted(candidates, rng.fork(`affix:${i}`));
    chosen.push(a);
    usedGroups.add(a.group);
  }

  const stats: GeneratedItem["stats"] = {};
  if (opts.base.minDmg != null && opts.base.maxDmg != null) {
    stats.dmgMin = opts.base.minDmg;
    stats.dmgMax = opts.base.maxDmg;
  }
  if (opts.base.armor != null) stats.armor = opts.base.armor;

  for (const a of chosen) {
    for (const rr of a.rolls) {
      const scaled = scaleRoll(rr.min, rr.max, opts.ilvl);
      const v = randInt(scaled.min, scaled.max, rng.fork(`stat:${a.id}:${rr.stat}`));
      stats[rr.stat] = (stats[rr.stat] ?? 0) + v;
    }
  }

  const prefix =
    rarity === "magic"
      ? "Enchanted "
      : rarity === "rare"
        ? "Ancient "
        : rarity === "legendary"
          ? "Legendary "
          : rarity === "set"
            ? "Set "
            : "";
  const name = `${prefix}${opts.base.name}${chosen.length ? " " + chosen[0].name : ""}`;

  return {
    uid: `di_${seed.toString(36)}_${rng.fork("uid").nextInt(2 ** 31 - 1).toString(36)}`,
    baseId: opts.base.id,
    name,
    rarity,
    ilvl: opts.ilvl,
    seed,
    stats,
    setId: rarity === "set" ? (opts.setId ?? "set_unknown") : undefined,
    legendaryPowerId: rarity === "legendary" ? (opts.legendaryPowerId ?? "lp_unknown") : undefined,
  };
}
