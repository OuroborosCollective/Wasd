import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { TerritoryKey, TerritoryLayer } from "./GovernanceTypes.js";

const LAYER_ORDER: readonly TerritoryLayer[] = Object.freeze([
  "kingdom",
  "province_or_region",
  "settlement",
  "village_or_city",
  "guild_or_faction_overlay",
]);

export function isTerritoryLayer(value: unknown): value is TerritoryLayer {
  return typeof value === "string" && (LAYER_ORDER as readonly string[]).includes(value);
}

export function compareTerritoryKeys(a: TerritoryKey, b: TerritoryKey): number {
  const layerDelta = LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer);
  if (layerDelta !== 0) return layerDelta;
  return a.id.localeCompare(b.id) || String(a.parentId ?? "").localeCompare(String(b.parentId ?? ""));
}

export function sortTerritories<T extends TerritoryKey>(territories: readonly T[]): readonly T[] {
  return Object.freeze([...territories].sort(compareTerritoryKeys));
}

export function territoryHash(territory: TerritoryKey): string {
  return stableHash32([
    "TERRITORY_MODEL_V1",
    territory.layer,
    territory.id,
    territory.parentId ?? "",
    territory.chunkKey ?? "",
  ].join("|")).toString(16);
}

export function validateTerritoryKey(territory: TerritoryKey): readonly string[] {
  const errors: string[] = [];
  if (!territory.id.trim()) errors.push("territory_id_required");
  if (!isTerritoryLayer(territory.layer)) errors.push("invalid_territory_layer");
  if (territory.parentId !== undefined && !territory.parentId.trim()) errors.push("empty_parent_id");
  if (territory.chunkKey !== undefined && !territory.chunkKey.trim()) errors.push("empty_chunk_key");
  return Object.freeze(errors);
}
