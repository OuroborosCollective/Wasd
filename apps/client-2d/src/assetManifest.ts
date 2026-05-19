export type AssetCategory = 'tilesets' | 'characters' | 'monsters' | 'buildings' | 'props' | 'fx' | 'ui';

export type AssetEntry = {
  src: string;
  source?: string;
  license?: string;
  tileWidth?: number;
  tileHeight?: number;
  frameWidth?: number;
  frameHeight?: number;
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
