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

type PartLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  z?: number;
};

const RULES: Record<string, string[]> = {
  sword: ["sword_pommel", "sword_handle", "sword_guard", "sword_blade"],
  axe: ["axe_handle", "axe_head"],
  hammer: ["axe_handle", "hammer_head"],
  spear: ["spear_shaft", "spear_tip"],
  bow: ["bow_limb", "bow_string"],
  dagger: ["sword_handle", "sword_guard", "dagger_blade"],
  mace: ["axe_handle", "mace_head"],
  staff: ["spear_shaft", "staff_head", "magical_crystal"],
  knuckle: ["knuckle"],
  shield: ["shield"],
};

const DEFAULT_LAYOUT: PartLayout = { x: 0, y: 0, width: 46, height: 46, rotation: 0.35, z: 10 };

const LAYOUTS: Record<string, Record<string, PartLayout>> = {
  sword: {
    sword_pommel: { x: -8, y: 25, width: 22, height: 22, rotation: 0.35, z: 1 },
    sword_handle: { x: -3, y: 14, width: 25, height: 34, rotation: 0.35, z: 2 },
    sword_guard: { x: 4, y: 2, width: 40, height: 22, rotation: 0.35, z: 3 },
    sword_blade: { x: 13, y: -28, width: 34, height: 72, rotation: 0.35, z: 4 },
  },
  dagger: {
    sword_handle: { x: -4, y: 14, width: 22, height: 30, rotation: 0.38, z: 1 },
    sword_guard: { x: 2, y: 3, width: 32, height: 18, rotation: 0.38, z: 2 },
    dagger_blade: { x: 10, y: -20, width: 28, height: 52, rotation: 0.38, z: 3 },
  },
  axe: {
    axe_handle: { x: -7, y: 11, width: 26, height: 68, rotation: 0.22, z: 1 },
    axe_head: { x: 14, y: -22, width: 50, height: 46, rotation: 0.22, z: 2 },
  },
  hammer: {
    axe_handle: { x: -8, y: 12, width: 26, height: 68, rotation: 0.22, z: 1 },
    hammer_head: { x: 12, y: -24, width: 58, height: 38, rotation: 0.22, z: 2 },
  },
  mace: {
    axe_handle: { x: -8, y: 14, width: 25, height: 64, rotation: 0.25, z: 1 },
    mace_head: { x: 10, y: -25, width: 46, height: 46, rotation: 0.25, z: 2 },
  },
  spear: {
    spear_shaft: { x: -6, y: 8, width: 22, height: 86, rotation: 0.27, z: 1 },
    spear_tip: { x: 15, y: -45, width: 34, height: 42, rotation: 0.27, z: 2 },
  },
  staff: {
    spear_shaft: { x: -7, y: 10, width: 22, height: 86, rotation: 0.22, z: 1 },
    staff_head: { x: 11, y: -42, width: 38, height: 38, rotation: 0.22, z: 2 },
    magical_crystal: { x: 18, y: -52, width: 22, height: 22, rotation: 0.22, z: 3 },
  },
  bow: {
    bow_limb: { x: 7, y: -10, width: 55, height: 78, rotation: 0.18, z: 1 },
    bow_string: { x: 8, y: -9, width: 45, height: 74, rotation: 0.18, z: 2 },
  },
  knuckle: {
    knuckle: { x: 6, y: -3, width: 42, height: 34, rotation: 0.2, z: 1 },
  },
  shield: {
    shield: { x: 8, y: -8, width: 58, height: 66, rotation: 0.08, z: 1 },
  },
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

function layoutFor(kind: string, entry: AssetEntry, fallbackIndex: number): PartLayout {
  const group = String(entry.group ?? "");
  const layout = LAYOUTS[kind]?.[group];
  if (layout) return layout;
  return { ...DEFAULT_LAYOUT, x: fallbackIndex * 2, y: -fallbackIndex * 2 };
}

function addPart(root: Container, base: Texture, entry: AssetEntry, kind: string, index: number) {
  const tex = frameTexture(base, entry);
  if (!tex) return;
  const layout = layoutFor(kind, entry, index);
  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5, 0.5);
  sprite.width = layout.width;
  sprite.height = layout.height;
  sprite.x = layout.x;
  sprite.y = layout.y;
  sprite.rotation = layout.rotation ?? 0;
  sprite.alpha = 0.98;
  sprite.zIndex = layout.z ?? index;
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
  root.sortableChildren = true;
  selected.forEach(([, entry], index) => addPart(root, atlas, entry, kind, index));
  root.x = 16;
  root.y = -25;
  root.rotation = 0.02;
  root.alpha = 0.98;
  return root;
}

export function hasModularWeapons(manifest: AssetManifest | null | undefined): boolean {
  return modularParts(manifest).length > 0;
}
