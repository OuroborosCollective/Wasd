import type { BaseItem, Affix, GeneratedItem, Rarity } from "./diabloItemGen.js";
import { generateItem } from "./diabloItemGen.js";

export type UnidentifiedItem = {
  uid: string;
  baseId: string;
  rarity: Rarity;
  ilvl: number;
  seed: number;
  identified: false;
};

export type IdentifiedItem = GeneratedItem & { identified: true };

export function identify(unid: UnidentifiedItem, base: BaseItem, affixes: Affix[]): IdentifiedItem {
  const gen = generateItem({ base, affixes, ilvl: unid.ilvl, rarity: unid.rarity });
  return { ...gen, uid: unid.uid, seed: unid.seed, identified: true };
}
