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

/**
 * Extended asset entry with semantic metadata for deterministic binding.
 */
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
  // Extended semantic metadata for deterministic binding
  biomeTags?: string[];
  cultureTags?: string[];
  factionTags?: string[];
  quality?: number; // 0-100 quality score
  lod?: "low" | "medium" | "high";
  deprecated?: boolean;
  corrupt?: boolean;
  performanceCost?: number; // Estimated GPU cost
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
  const cozySpring = await loadJson<AssetManifest>(routeAsset('/2d-assets/cozy-spring/manifest.json'));

  // Extract cozy spring tilesets and props from entries
  const cozyTilesets: Record<string, AssetEntry> = {};
  const cozyProps: Record<string, AssetEntry> = {};
  
  if (cozySpring?.entries) {
    for (const [id, entry] of Object.entries(cozySpring.entries)) {
      if (entry.category === 'tilesets') {
        cozyTilesets[id] = normalizeEntrySrc(entry);
      } else if (entry.category === 'props') {
        cozyProps[id] = normalizeEntrySrc(entry);
      }
    }
  }

  if (!root && !weaponManifest && !modularWeaponManifest && !pipoyaCharacters && !forestBiome && !graphicRiverIso && !cozySpring) return null;

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
      ...(cozySpring ? [{ id: cozySpring.id ?? 'cozy_spring_master', source: 'SakPix_Cozy_Spring_Asset_Pack', biome: 'plains', totalEntries: cozySpring.totalEntries, deterministic: true }] : []),
    ],
    tilesets: {
      ...normalizeEntries(root?.tilesets),
      ...normalizeEntries(forestBiome?.tilesets),
      ...normalizeEntries(graphicRiverIso?.tilesets),
      ...cozyTilesets,
    },
    props: {
      ...normalizeEntries(root?.props),
      ...normalizeEntries(forestBiome?.props),
      ...normalizeEntries(graphicRiverIso?.props),
      ...cozyProps,
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

function entryKey(id: string, entry: AssetEntry): string {
  return `${id} ${entry.sourcePath ?? ''} ${entry.src ?? ''}`.toLowerCase();
}

function isGraphicRiverEntry(id: string, entry: AssetEntry): boolean {
  const tags = (entry.tags ?? []).map((tag) => String(tag).toLowerCase());
  return tags.includes('graphicriver_iso') || entry.src.includes('/client2d-assets/graphicriver-iso/') || entryKey(id, entry).includes('graphicriver');
}

function isBadNormalActorFrame(id: string, entry: AssetEntry): boolean {
  const key = entryKey(id, entry);
  return ['death', 'dead', 'attack', 'scream', 'explosion', 'bullet', 'projectile'].some((term) => key.includes(term));
}

function isPreferredGraphicRiverCharacterFrame(id: string, entry: AssetEntry): boolean {
  const key = entryKey(id, entry);
  return ['peasant', 'child', 'walking', 'front'].some((term) => key.includes(term));
}

/**
 * Filters out bad runtime sheet/preview/atlas entries that should not be used as standalone sprites.
 * These typically represent full sprite sheets, preview images, or atlas grids.
 */
function isBadRuntimeSheetEntry(id: string, entry: AssetEntry): boolean {
  const key = entryKey(id, entry);
  const srcLower = entry.src.toLowerCase();
  const tagsLower = (entry.tags ?? []).map((tag) => String(tag).toLowerCase());

  // Explicitly bad naming patterns
  const badTerms = [
    'sheet', 'preview', 'atlas', 'sample', 'tileset', 'wall sheet',
    'background', 'fullsheet', 'spritesheet', 'sprite-sheet', 'sprite_sheet',
    'grid', 'collection', 'overview', 'all', 'composite', 'combined',
    'multi', 'pack', 'bundle', 'set', 'sequence', 'animation sheet',
    'flip', 'horizontal', 'vertical', 'strip', 'row', 'column'
  ];

  // Only filter if entry lacks proper frame/crop data (meaning it's a raw sheet)
  const hasFrameData = Boolean(entry.frame || (entry.sheetFrame && entry.frameSize) || entry.spriteLayers?.length);
  if (hasFrameData) return false; // Entry has crop data, trust it

  // For entries without frame data, check if it's a bad sheet/preview
  if (badTerms.some(term => key.includes(term))) return true;

  // Check src for common sheet/preview patterns
  const badSrcPatterns = ['_preview', '_sample', '_sheet', '_atlas', '-preview', '-sample', '-sheet', '-atlas',
    'spritesheet', 'sprite_sheet', 'tileset', 'wallpaper', 'background', 'composite'];
  if (badSrcPatterns.some(p => srcLower.includes(p))) return true;

  // Large images without frame data are likely sheets (heuristic: > 512 width is suspicious for single asset)
  if (!hasFrameData && entry.width && entry.width > 512) {
    // But allow if tags or source indicate it's a designed tile
    const goodTerms = ['tile', 'ground', 'grass', 'road', 'dirt', 'stone', 'floor'];
    if (!goodTerms.some(t => tagsLower.some(tag => tag.includes(t)))) return true;
  }

  return false;
}

function isRenderableEntry(entry: AssetEntry | null | undefined): boolean {
  if (!entry?.src) return false;
  // Reject bad sheet entries
  if (entry.id && entry.src && isBadRuntimeSheetEntry(entry.id, entry)) return false;
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
  const matches = renderablePool.filter(([id, entry]) => {
    const tags = (entry.tags ?? []).map((tag) => String(tag).toLowerCase());
    const group = String(entry.group ?? '').toLowerCase();
    const kind = String(entry.kind ?? '').toLowerCase();
    const tagsOk = wantedTags.length === 0 || wantedTags.every((tag) => tags.includes(tag));
    const groupOk = !wantedGroup || group === wantedGroup || tags.includes(wantedGroup);
    const kindOk = !wantedKind || kind === wantedKind || tags.includes(wantedKind);
    if (!tagsOk || !groupOk || !kindOk) return false;
    if (isGraphicRiverEntry(id, entry) && isBadNormalActorFrame(id, entry)) return false;
    return true;
  });

  const safeGraphicRiver = renderablePool.filter(([id, entry]) => isGraphicRiverEntry(id, entry) && !isBadNormalActorFrame(id, entry));
  const preferredGraphicRiver = safeGraphicRiver.filter(([id, entry]) => isPreferredGraphicRiverCharacterFrame(id, entry));
  const pool = matches.length > 0
    ? matches
    : preferredGraphicRiver.length > 0
      ? preferredGraphicRiver
      : safeGraphicRiver.length > 0
        ? safeGraphicRiver
        : renderablePool;
  if (pool.length === 0) return null;

  const seed = String(input.seed ?? `${wantedTags.join(',')}:${wantedGroup}:${wantedKind}`);
  const [id, entry] = pool[deterministicIndex(seed, pool.length)];
  return { id, entry };
}
