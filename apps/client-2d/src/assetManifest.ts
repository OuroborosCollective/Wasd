export type AssetCategory = 'tilesets' | 'characters' | 'monsters' | 'buildings' | 'props' | 'fx' | 'ui' | 'weapons';

export type AssetEntry = {
  src: string;
  source?: string;
  sourcePath?: string;
  license?: string;
  tileWidth?: number;
  tileHeight?: number;
  frameWidth?: number;
  frameHeight?: number;
  width?: number;
  height?: number;
  weaponClass?: string;
  rarity?: string;
  tags?: string[];
  animations?: Record<string, number[]>;
};

export type AssetManifest = {
  version?: number;
  generatedAt?: string;
  basePath?: string;
  sources?: unknown[];
  tilesets?: Record<string, AssetEntry>;
  characters?: Record<string, AssetEntry>;
  monsters?: Record<string, AssetEntry>;
  buildings?: Record<string, AssetEntry>;
  props?: Record<string, AssetEntry>;
  fx?: Record<string, AssetEntry>;
  ui?: Record<string, AssetEntry>;
  weapons?: Record<string, AssetEntry>;
  fallbacks?: Record<string, string | null>;
};

export async function loadAssetManifest(): Promise<AssetManifest | null> {
  try {
    const res = await fetch('/2d-assets/manifest.json', { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json() as AssetManifest;
  } catch {
    return null;
  }
}

export function getEntry(manifest: AssetManifest | null, category: AssetCategory, id?: string | null): AssetEntry | null {
  if (!manifest || !id) return null;
  return manifest[category]?.[id] ?? null;
}

export function firstEntry(manifest: AssetManifest | null, category: AssetCategory): AssetEntry | null {
  const group = manifest?.[category];
  if (!group) return null;
  const first = Object.keys(group)[0];
  return first ? group[first] ?? null : null;
}

export function fallbackEntry(manifest: AssetManifest | null, category: AssetCategory, fallbackKey: string): AssetEntry | null {
  const id = manifest?.fallbacks?.[fallbackKey] ?? null;
  return getEntry(manifest, category, id) ?? firstEntry(manifest, category);
}

export function pickWeaponVisual(
  manifest: AssetManifest | null,
  input: { visualId?: string | null; weaponClass?: string | null; rarity?: string | null; seed?: string | number | null },
): { id: string; entry: AssetEntry } | null {
  const weapons = manifest?.weapons;
  if (!weapons) return null;

  if (input.visualId && weapons[input.visualId]) return { id: input.visualId, entry: weapons[input.visualId] };

  const weaponClass = String(input.weaponClass || '').toLowerCase();
  const rarity = String(input.rarity || '').toLowerCase();
  const matches = Object.entries(weapons).filter(([, entry]) => {
    const classOk = !weaponClass || entry.weaponClass === weaponClass || entry.tags?.includes(weaponClass);
    const rarityOk = !rarity || entry.rarity === rarity || entry.tags?.includes(rarity);
    return classOk && rarityOk;
  });

  const pool = matches.length > 0 ? matches : Object.entries(weapons);
  if (pool.length === 0) return null;

  const seed = String(input.seed ?? `${weaponClass}:${rarity}`);
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = Math.abs(hash) % pool.length;
  const [id, entry] = pool[index];
  return { id, entry };
}
