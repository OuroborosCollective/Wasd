// @ts-nocheck
import type { Affix, BaseItem } from "./diabloItemGen.js";

/** Minimal bases/affixes for server-side demo drops (replace with content JSON later). */
export const SAMPLE_DROP_BASES: Record<string, BaseItem> = {
  /** Must match `game-data/items/items.json` so equip_gear resolves ItemRegistry. */
  rusted_blade: {
    id: "rusted_blade",
    name: "Rusted Blade",
    slot: "weapon",
    minDmg: 4,
    maxDmg: 9,
    tags: ["melee", "sword"],
  },
};

export const SAMPLE_DROP_AFFIXES: Affix[] = [
  {
    id: "of_might",
    name: "of Might",
    group: "attr_str",
    tagsAny: ["melee"],
    minLevel: 1,
    weight: 12,
    rolls: [{ stat: "str", min: 1, max: 4 }],
  },
  {
    id: "of_the_bear",
    name: "of the Bear",
    group: "attr_vit",
    tagsAny: ["sword"],
    minLevel: 1,
    weight: 10,
    rolls: [{ stat: "vit", min: 2, max: 6 }],
  },
  {
    id: "of_embers",
    name: "of Embers",
    group: "res_fire",
    tagsAny: ["melee"],
    minLevel: 1,
    weight: 8,
    rolls: [{ stat: "fireRes", min: 4, max: 12 }],
  },
];
