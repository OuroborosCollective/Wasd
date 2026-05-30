import type { AssetCategory, AssetEntry, AssetManifest } from "./assetManifest";

export type PickedGraphicRiverAsset = { id: string; entry: AssetEntry };

const BAD_NORMAL_ACTOR_TERMS = ["death", "dead", "attack", "scream", "explosion", "bullet", "projectile"];
const GRAPHIC_RIVER_TAG = "graphicriver_iso";

function keyOf(id: string, entry: AssetEntry): string {
  return `${id} ${entry.sourcePath ?? ""} ${entry.src ?? ""}`.toLowerCase();
}

function hasAny(haystack: string, terms: string[]): boolean {
  return terms.some((term) => haystack.includes(term));
}

function deterministicIndex(seed: string, length: number): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % length;
}

function isRenderable(entry: AssetEntry | null | undefined): boolean {
  if (!entry?.src) return false;
  if (entry.src.toLowerCase().endsWith(".json")) return false;
  return true;
}

function categoryEntries(manifest: AssetManifest | null | undefined, category: AssetCategory): [string, AssetEntry][] {
  const group = manifest?.[category] ?? {};
  return Object.entries(group).filter(([, entry]) => isRenderable(entry));
}

function graphicRiverEntries(manifest: AssetManifest | null | undefined, category: AssetCategory): [string, AssetEntry][] {
  return categoryEntries(manifest, category).filter(([id, entry]) => {
    const tags = (entry.tags ?? []).map((tag) => String(tag).toLowerCase());
    return tags.includes(GRAPHIC_RIVER_TAG) || keyOf(id, entry).includes("graphicriver") || entry.src.includes("/client2d-assets/graphicriver-iso/");
  });
}

function choose(pool: [string, AssetEntry][], seed: string): PickedGraphicRiverAsset | null {
  if (pool.length === 0) return null;
  const [id, entry] = pool[deterministicIndex(seed, pool.length)];
  return { id, entry };
}

export function pickGraphicRiverCharacter(manifest: AssetManifest | null | undefined, seed: string, role = "npc"): PickedGraphicRiverAsset | null {
  const entries = graphicRiverEntries(manifest, "characters");
  const safe = entries.filter(([id, entry]) => !hasAny(keyOf(id, entry), BAD_NORMAL_ACTOR_TERMS));
  const roleLower = role.toLowerCase();
  const preferredTerms = roleLower.includes("guard") || roleLower.includes("smith")
    ? ["knight", "peasant", "walking", "front"]
    : ["peasant", "child", "walking", "front"];
  const preferred = safe.filter(([id, entry]) => hasAny(keyOf(id, entry), preferredTerms));
  return choose(preferred.length ? preferred : safe.length ? safe : entries, `gr-character:${seed}:${role}`);
}

export function pickGraphicRiverTile(manifest: AssetManifest | null | undefined, seed: string, kind: "grass" | "road" | "desert" = "grass"): PickedGraphicRiverAsset | null {
  const entries = graphicRiverEntries(manifest, "tilesets");
  const normal = entries.filter(([id, entry]) => keyOf(id, entry).includes(kind) && !hasAny(keyOf(id, entry), ["bottomdark", "upperdark", "sliced", "end_full"]));
  const preferred = normal.filter(([id, entry]) => hasAny(keyOf(id, entry), ["default", "normal", "main", "middle"]));
  return choose(preferred.length ? preferred : normal.length ? normal : entries, `gr-tile:${kind}:${seed}`);
}

export function pickGraphicRiverProp(manifest: AssetManifest | null | undefined, seed: string, kind: "tree" | "bush" | "plant" | "flower" = "tree"): PickedGraphicRiverAsset | null {
  const entries = [...graphicRiverEntries(manifest, "props"), ...graphicRiverEntries(manifest, "tilesets")];
  const filtered = entries.filter(([id, entry]) => keyOf(id, entry).includes(kind));
  return choose(filtered.length ? filtered : entries, `gr-prop:${kind}:${seed}`);
}

export function pickGraphicRiverBuilding(manifest: AssetManifest | null | undefined, seed: string, kind: "castle" | "tower" | "house" = "castle"): PickedGraphicRiverAsset | null {
  const entries = graphicRiverEntries(manifest, "buildings");
  const filtered = entries.filter(([id, entry]) => keyOf(id, entry).includes(kind));
  const fallbackTower = entries.filter(([id, entry]) => hasAny(keyOf(id, entry), ["castle", "tower", "cannon", "ice", "tesla"]));
  return choose(filtered.length ? filtered : fallbackTower.length ? fallbackTower : entries, `gr-building:${kind}:${seed}`);
}
