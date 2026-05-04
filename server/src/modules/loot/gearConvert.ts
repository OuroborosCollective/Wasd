// @ts-nocheck
import type { GeneratedItem } from "./diabloItemGen.js";
import type { GearItem } from "../items/dualInventoryTypes.js";

export function generatedItemToGearItem(g: GeneratedItem): GearItem {
  const stats: Record<string, number> = {};
  for (const [k, v] of Object.entries(g.stats)) {
    if (typeof v === "number" && Number.isFinite(v)) stats[k] = v;
  }
  return {
    uid: g.uid,
    baseId: g.baseId,
    name: g.name,
    rarity: g.rarity,
    ilvl: g.ilvl,
    stats,
    ...(g.setId ? { setId: g.setId } : {}),
    ...(g.legendaryPowerId ? { legendaryPowerId: g.legendaryPowerId } : {}),
  };
}
