import { randomUUID } from "node:crypto";

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

export function randInt(min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi < lo) return lo;
  return Math.floor(lo + Math.random() * (hi - lo + 1));
}

export function pickWeighted<T extends { weight: number }>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error("pickWeighted: empty array");
  }
  const total = arr.reduce((s, x) => s + Math.max(0, x.weight), 0);
  if (total <= 0) return arr[arr.length - 1]!;
  let r = Math.random() * total;
  for (const x of arr) {
    r -= Math.max(0, x.weight);
    if (r <= 0) return x;
  }
  return arr[arr.length - 1]!;
}

export function rarityRoll(mf = 0): Rarity {
  const r = Math.random() * (1 + mf * 0.002);
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
}): GeneratedItem {
  const rarity = opts.rarity ?? rarityRoll(opts.mf ?? 0);
  const seed = randInt(1, 2 ** 31 - 1);

  const affixCount =
    rarity === "common"
      ? 0
      : rarity === "magic"
        ? randInt(1, 2)
        : rarity === "rare"
          ? randInt(3, 5)
          : rarity === "legendary"
            ? randInt(4, 6)
            : rarity === "set"
              ? randInt(4, 6)
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
    const a = pickWeighted(candidates);
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
      const v = randInt(rr.min, rr.max);
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
    uid: randomUUID(),
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
