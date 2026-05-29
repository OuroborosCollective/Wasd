export type AssetCategory = 'tilesets' | 'characters' | 'monsters' | 'buildings' | 'props' | 'fx' | 'ui' | 'weapons';

export type SpriteAnimation = {
  row?: number;
  frames?: number[];
  fps?: number;
};

export type SpriteLayerFrame = {
  frame: { x: number; y: number; w: number; h: number };
  offsetX?: number;
  offsetY?: number;
  z?: number;
};

export type AssetEntry = {
  id?: string;
  src: string;
  source?: string;
  sourcePath?: string;
  sourceName?: string;
  license?: string;
  kind?: string;
  group?: string;
  tileWidth?: number;
  tileHeight?: number;
  frameWidth?: number;
  frameHeight?: number;
  width?: number;
  height?: number;
  frame?: { x: number; y: number; w: number; h: number };
  sheetFrame?: { x: number; y: number; w: number; h: number };
  frameSize?: { w: number; h: number };
  spriteLayers?: SpriteLayerFrame[];
  zHeight?: number;
  isoFootprint?: { w: number; h: number };
  shadow?: { w: number; h: number; alpha?: number };
  weaponClass?: string;
  rarity?: string;
  visualRarity?: string;
  tags?: string[];
  animations?: Record<string, SpriteAnimation | number[] | unknown>;
  rules?: Record<string, unknown>;
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

type WeaponManifestPayload = {
  weapons?: Record<string, AssetEntry>;
  sources?: unknown[];
};

type CharacterAtlasPayload = {
  id?: string;
  source?: string;
  src?: string;
  entries?: Record<string, AssetEntry>;
  groups?: Record<string, number>;
};

const ROUTE_BASE = '/2d';

function routeAsset(path: string): string {
  return `${ROUTE_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

function normalizeEntrySrc(entry: AssetEntry): AssetEntry {
  if (!entry.src.startsWith('/')) return entry;
  if (entry.src.startsWith('/2d/')) return entry;
  if (entry.src.startsWith('/client2d-assets/')) return entry;
  if (entry.src.startsWith('/2d-assets/') || entry.src.startsWith('/assets/')) {
    return { ...entry, src: routeAsset(entry.src) };
  }
  return entry;
}

function normalizeEntries(entries: Record<string, AssetEntry> | undefined): Record<string, AssetEntry> {
  const out: Record<string, AssetEntry> = {};
  Object.entries(entries ?? {}).forEach(([id, entry]) => {
    out[id] = normalizeEntrySrc(entry);
  });
  return out;
}

async function loadJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

function withEntryIds(entries: Record<string, AssetEntry> | undefined): Record<string, AssetEntry> {
  const out: Record<string, AssetEntry> = {};
  Object.entries(entries ?? {}).forEach(([id, entry]) => {
    const group = String(entry.group ?? '').toLowerCase();
    const implicitTags = group === 'female' || group === 'male' ? ['civilian'] : [];
    out[id] = { ...normalizeEntrySrc(entry), id, tags: [...new Set([...(entry.tags ?? []), ...implicitTags])] };
  });
  return out;
}

export async function loadAssetManifest(): Promise<AssetManifest | null> {
  const root = await loadJson<AssetManifest>(routeAsset('/2d-assets/manifest.json'));
  const weaponManifest = await loadJson<WeaponManifestPayload>(routeAsset('/2d-assets/weapons/weapon-manifest.json'));
  const modularWeaponManifest = await loadJson<WeaponManifestPayload>(routeAsset('/2d-assets/weapons/modular/weapon-manifest.json'));
  const pipoyaCharacters = await loadJson<CharacterAtlasPayload>(routeAsset('/2d-assets/characters/pipoya/pipoya-character-atlas.json'));
  const forestBiome = await loadJson<AssetManifest>(routeAsset('/assets/biomes/forest/assetpack01/manifest.json'));
  const graphicRiverIso = await loadJson<AssetManifest>('/client2d-assets/graphicriver-iso/manifest.json');

  if (!root && !weaponManifest && !modularWeaponManifest && !pipoyaCharacters && !forestBiome && !graphicRiverIso) return null;

  return {
    ...(root ?? { version: 1, basePath: routeAsset('/2d-assets') }),
    basePath: root?.basePath ? routeAsset(root.basePath) : routeAsset('/2d-assets'),
    sources: [
      ...(root?.sources ?? []),
      ...(weaponManifest?.sources ?? []),
      ...(modularWeaponManifest?.sources ?? []),
      ...(pipoyaCharacters ? [{ id: pipoyaCharacters.id ?? 'pipoya-character-atlas', source: pipoyaCharacters.source ?? 'Pipoya', groups: pipoyaCharacters.groups ?? {} }] : []),
      ...(forestBiome ? [{ id: 'assetpack01_forest_sample', source: 'AssetPack01_Forest_Sample.zip', biome: 'forest', pngCount: forestBiome.pngCount, deterministic: true }] : []),
      ...(graphicRiverIso?.sources ?? []),
    ],
    tilesets: {
      ...normalizeEntries(root?.tilesets),
      ...normalizeEntries(forestBiome?.tilesets),
      ...normalizeEntries(graphicRiverIso?.tilesets),
    },
    props: {
      ...normalizeEntries(root?.props),
      ...normalizeEntries(forestBiome?.props),
      ...normalizeEntries(graphicRiverIso?.props),
    },
    ui: {
      ...normalizeEntries(root?.ui),
      ...normalizeEntries(forestBiome?.ui),
      ...normalizeEntries(graphicRiverIso?.ui),
    },
    characters: {
      ...normalizeEntries(root?.characters),
      ...withEntryIds(pipoyaCharacters?.entries),
      ...normalizeEntries(graphicRiverIso?.characters),
    },
    monsters: {
      ...normalizeEntries(root?.monsters),
      ...normalizeEntries(graphicRiverIso?.monsters),
    },
    buildings: {
      ...normalizeEntries(root?.buildings),
      ...normalizeEntries(graphicRiverIso?.buildings),
    },
    fx: {
      ...normalizeEntries(root?.fx),
      ...normalizeEntries(graphicRiverIso?.fx),
    },
    weapons: {
      ...normalizeEntries(root?.weapons),
      ...normalizeEntries(weaponManifest?.weapons),
      ...normalizeEntries(modularWeaponManifest?.weapons),
      ...normalizeEntries(graphicRiverIso?.weapons),
    },
    fallbacks: {
      ...(root?.fallbacks ?? {}),
      ...(graphicRiverIso?.fallbacks ?? {}),
    },
  };
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
  return getEntry(manifest, category, id) ?? firstRenderableEntry(manifest, category) ?? firstEntry(manifest, category);
}

function deterministicIndex(seed: string, length: number): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % length;
}

function isRenderableEntry(entry: AssetEntry | null | undefined): boolean {
  if (!entry?.src) return false;
  if (entry.frame) return true;
  if (entry.sheetFrame && entry.frameSize) return true;
  if (entry.spriteLayers?.length) return true;
  if (entry.width && entry.height) return true;
  return !entry.src.toLowerCase().endsWith('.json');
}

function firstRenderableEntry(manifest: AssetManifest | null, category: AssetCategory): AssetEntry | null {
  const group = manifest?.[category];
  if (!group) return null;
  return Object.values(group).find(isRenderableEntry) ?? null;
}

export function pickWeaponVisual(
  manifest: AssetManifest | null,
  input: { visualId?: string | null; weaponClass?: string | null; rarity?: string | null; seed?: string | number | null },
): { id: string; entry: AssetEntry } | null {
  const weapons = manifest?.weapons;
  if (!weapons) return null;

  if (input.visualId && weapons[input.visualId] && isRenderableEntry(weapons[input.visualId])) return { id: input.visualId, entry: weapons[input.visualId] };

  const weaponClass = String(input.weaponClass || '').toLowerCase();
  const rarity = String(input.rarity || '').toLowerCase();
  const matches = Object.entries(weapons).filter(([, entry]) => {
    if (!isRenderableEntry(entry)) return false;
    const classOk = !weaponClass || entry.weaponClass === weaponClass || entry.tags?.includes(weaponClass);
    const rarityOk = !rarity || entry.rarity === rarity || entry.tags?.includes(rarity);
    return classOk && rarityOk;
  });

  const renderablePool = Object.entries(weapons).filter(([, entry]) => isRenderableEntry(entry));
  const pool = matches.length > 0 ? matches : renderablePool;
  if (pool.length === 0) return null;

  const seed = String(input.seed ?? `${weaponClass}:${rarity}`);
  const [id, entry] = pool[deterministicIndex(seed, pool.length)];
  return { id, entry };
}

export function pickCharacterVisual(
  manifest: AssetManifest | null,
  input: { visualId?: string | null; tags?: string[]; group?: string | null; kind?: string | null; seed?: string | number | null },
): { id: string; entry: AssetEntry } | null {
  const characters = manifest?.characters;
  if (!characters) return null;

  if (input.visualId && characters[input.visualId] && isRenderableEntry(characters[input.visualId])) return { id: input.visualId, entry: characters[input.visualId] };

  const wantedTags = (input.tags ?? []).map((tag) => tag.toLowerCase());
  const wantedGroup = String(input.group || '').toLowerCase();
  const wantedKind = String(input.kind || '').toLowerCase();
  const renderablePool = Object.entries(characters).filter(([, entry]) => isRenderableEntry(entry));
  const matches = renderablePool.filter(([, entry]) => {
    const tags = (entry.tags ?? []).map((tag) => String(tag).toLowerCase());
    const group = String(entry.group ?? '').toLowerCase();
    const kind = String(entry.kind ?? '').toLowerCase();
    const tagsOk = wantedTags.length === 0 || wantedTags.every((tag) => tags.includes(tag));
    const groupOk = !wantedGroup || group === wantedGroup || tags.includes(wantedGroup);
    const kindOk = !wantedKind || kind === wantedKind || tags.includes(wantedKind);
    return tagsOk && groupOk && kindOk;
  });

  const pool = matches.length > 0 ? matches : renderablePool;
  if (pool.length === 0) return null;

  const seed = String(input.seed ?? `${wantedTags.join(',')}:${wantedGroup}:${wantedKind}`);
  const [id, entry] = pool[deterministicIndex(seed, pool.length)];
  return { id, entry };
}
