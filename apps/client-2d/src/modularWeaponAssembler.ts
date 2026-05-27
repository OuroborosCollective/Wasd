import { Container, Rectangle, Sprite, Texture } from "pixi.js";
import type { AssetEntry, AssetManifest } from "./assetManifest";

export type ModularWeaponKind = "sword" | "axe" | "hammer" | "spear" | "bow" | "dagger" | "knuckle" | "mace" | "staff" | "shield";
export type ModularWeaponRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mystic";
export type ModularWeaponElement = "none" | "fire" | "ice" | "electro" | "wind";

export type ModularWeaponInput = {
  visualId?: string | null;
  seed?: string | number | null;
  weaponClass?: string | null;
  rarity?: string | null;
  element?: string | null;
};

const RULES: Record<string, string[]> = {
  sword: ["sword_blade", "sword_guard", "sword_handle", "sword_pommel"],
  axe: ["axe_head", "axe_handle"],
  hammer: ["hammer_head", "axe_handle"],
  spear: ["spear_tip", "spear_shaft"],
  bow: ["bow_limb", "bow_string"],
  dagger: ["dagger_blade", "sword_guard", "sword_handle"],
  mace: ["mace_head", "axe_handle"],
  staff: ["staff_head", "spear_shaft", "magical_crystal"],
  knuckle: ["knuckle"],
  shield: ["shield"],
};

function normalizeKind(value: string | null | undefined): ModularWeaponKind {
  const v = String(value ?? "").toLowerCase();
  if (v === "offhand") return "shield";
  if (v in RULES) return v as ModularWeaponKind;
  return "sword";
}

function normalizeRarity(value: string | null | undefined): ModularWeaponRarity {
  const v = String(value ?? "common").toLowerCase();
  if (v === "mythic") return "mystic";
  if (["common", "uncommon", "rare", "epic", "legendary", "mystic"].includes(v)) return v as ModularWeaponRarity;
  return "common";
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(items: T[], seed: string): T | null {
  if (items.length === 0) return null;
  return items[hash(seed) % items.length] ?? null;
}

function modularParts(manifest: AssetManifest | null | undefined): [string, AssetEntry][] {
  return Object.entries(manifest?.weapons ?? {}).filter(([, entry]) => entry.tags?.includes("modular-weapon") && entry.frame);
}

function partPool(manifest: AssetManifest | null | undefined, category: string, rarity: string): [string, AssetEntry][] {
  const all = modularParts(manifest).filter(([, entry]) => String(entry.group ?? "") === category);
  const exact = all.filter(([, entry]) => String(entry.rarity ?? "") === rarity || entry.tags?.includes(rarity));
  return exact.length > 0 ? exact : all;
}

function frameTexture(base: Texture, entry: AssetEntry): Texture | null {
  const f = entry.frame;
  if (!f) return null;
  return new Texture({ source: base.source, frame: new Rectangle(f.x, f.y, f.w, f.h) });
}

function addPart(root: Container, base: Texture, entry: AssetEntry, index: number) {
  const tex = frameTexture(base, entry);
  if (!tex) return;
  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5, 0.5);
  sprite.width = 44;
  sprite.height = 44;
  sprite.x = index * 1.75;
  sprite.y = -index * 1.25;
  sprite.rotation = 0.35;
  sprite.alpha = 0.98;
  root.addChild(sprite);
}

export function makeModularWeaponSprite(
  manifest: AssetManifest | null | undefined,
  textures: Map<string, Texture>,
  input: ModularWeaponInput,
): Container | null {
  const kind = normalizeKind(input.weaponClass);
  const rarity = normalizeRarity(input.rarity);
  const seed = String(input.seed ?? input.visualId ?? `${kind}:${rarity}`);
  const categories = RULES[kind] ?? RULES.sword;
  const selected = categories
    .map((category, index) => pick(partPool(manifest, category, rarity), `${seed}:${kind}:${rarity}:${category}:${index}`))
    .filter(Boolean) as [string, AssetEntry][];

  if (selected.length === 0) return null;
  const atlas = textures.get(selected[0]?.[1]?.src ?? "");
  if (!atlas) return null;

  const root = new Container();
  selected.forEach(([, entry], index) => addPart(root, atlas, entry, index));
  root.x = 16;
  root.y = -24;
  root.rotation = 0.04;
  root.alpha = 0.98;
  return root;
}

export function hasModularWeapons(manifest: AssetManifest | null | undefined): boolean {
  return modularParts(manifest).length > 0;
}
