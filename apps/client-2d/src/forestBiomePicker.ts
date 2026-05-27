export type ForestBiomeAssetCategory = 'tilesets' | 'props' | 'ui';

export type ForestBiomeAssetEntry = {
  id: string;
  src: string;
  source: string;
  sourcePath: string;
  sourceName: string;
  license: string;
  kind: string;
  group: string;
  biome: 'forest';
  category: ForestBiomeAssetCategory;
  bytes: number;
  sha256: string;
  tags: string[];
  deterministic: boolean;
};

export type ForestBiomeManifest = {
  version: number;
  id: string;
  biome: 'forest';
  source: string;
  generatedAt: string;
  deterministic: boolean;
  expectedPngCount: number;
  pngCount: number;
  txtCount: number;
  basePath: string;
  entries: Record<string, ForestBiomeAssetEntry>;
  all: string[];
  byKind: Record<string, string[]>;
  tilesets: Record<string, ForestBiomeAssetEntry>;
  props: Record<string, ForestBiomeAssetEntry>;
  ui: Record<string, ForestBiomeAssetEntry>;
  validation: {
    noPngOmitted: boolean;
    importedPngCount: number;
    manifestEntryCount: number;
    rule: string;
  };
};

export type ForestBiomePickInput = {
  worldSeed: string | number;
  chunkX: number;
  chunkZ: number;
  tileX: number;
  tileZ: number;
  layer?: number;
  kind?: string | null;
  category?: ForestBiomeAssetCategory | null;
};

const ROUTE_BASE = '/2d';
const TERRAIN_KIND_RE = /(?:^|[_\-\s/])(ground|grass|floor|tile|tileset|terrain|dirt|soil|path|road|earth|moss|leaf|leaves|edge|corner|transition|center)(?:$|[_\-\s/])/i;
const NON_TERRAIN_RE = /(?:particle|effect|fx|icon|ui|window|door|tree|bush|flower|rock|log|stump|character|npc|monster|object|deco|decoration)/i;

const MANIFEST_URLS = [
  '/2d/2d-assets/biomes/biome_atlas_v2/forest-manifest.json',
  '/2d/2d-assets/biomes/biome_atlas_v2/manifest.json',
  '/2d/2d-assets/biomes/forest/assetpack01/manifest.json',
  '/2d/assets/biomes/forest/assetpack01/manifest.json',
  '/2d-assets/biomes/biome_atlas_v2/forest-manifest.json',
  '/2d-assets/biomes/biome_atlas_v2/manifest.json',
];

function routeAssetPath(path: string): string {
  if (!path.startsWith('/')) return path;
  if (path.startsWith(`${ROUTE_BASE}/`)) return path;
  if (path.startsWith('/2d-assets/') || path.startsWith('/assets/')) return `${ROUTE_BASE}${path}`;
  return path;
}

function normalizeEntry(entry: ForestBiomeAssetEntry): ForestBiomeAssetEntry {
  return { ...entry, src: routeAssetPath(entry.src) };
}

function normalizeEntryMap(entries: Record<string, ForestBiomeAssetEntry> | undefined): Record<string, ForestBiomeAssetEntry> {
  const out: Record<string, ForestBiomeAssetEntry> = {};
  Object.entries(entries ?? {}).forEach(([id, entry]) => {
    out[id] = normalizeEntry(entry);
  });
  return out;
}

function normalizeManifest(manifest: ForestBiomeManifest): ForestBiomeManifest {
  const entries = normalizeEntryMap(manifest.entries);
  return {
    ...manifest,
    basePath: routeAssetPath(manifest.basePath ?? ''),
    entries,
    tilesets: normalizeEntryMap(manifest.tilesets),
    props: normalizeEntryMap(manifest.props),
    ui: normalizeEntryMap(manifest.ui),
  };
}

async function tryLoadForestBiomeManifest(url: string): Promise<ForestBiomeManifest | null> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  const raw = await response.json() as any;
  const manifest = raw.entries ? raw as ForestBiomeManifest : atlasManifestToForestManifest(raw, url);
  validateForestBiomeManifest(manifest);
  return normalizeManifest(manifest);
}

function atlasManifestToForestManifest(sourceManifest: any, url: string): ForestBiomeManifest {
  const frames = sourceManifest.frames ?? {};
  const entries: Record<string, ForestBiomeAssetEntry> = {};
  const tilesets: Record<string, ForestBiomeAssetEntry> = {};
  const byKind: Record<string, string[]> = {};
  const all: string[] = [];

  Object.keys(frames).sort().forEach((id) => {
    const kind = id.includes('ground') ? 'ground' : id.includes('edge') ? 'edge' : id.includes('corner') ? 'corner' : id.includes('trans') ? 'transition' : id.includes('center') ? 'center' : 'terrain';
    const biome = id.split('_to_')[0].split('_')[0] || 'forest';
    const sourcePath = id.includes('_to_') ? `transitions/${id}.png` : `tiles/${id}.png`;
    const entry: ForestBiomeAssetEntry = {
      id,
      src: `${url.replace(/\/[^/]*$/, '')}/${sourcePath}`,
      source: 'biome_atlas_manifest',
      sourcePath,
      sourceName: `${id}.png`,
      license: 'project-owned-generated-biome-atlas-v2',
      kind,
      group: biome,
      biome: 'forest',
      category: 'tilesets',
      bytes: 0,
      sha256: '',
      tags: ['biome-atlas-v2', 'terrain', kind, biome, 'pixi-alias'],
      deterministic: true,
    };
    entries[id] = entry;
    tilesets[id] = entry;
    byKind[kind] ??= [];
    byKind[kind].push(id);
    all.push(id);
  });

  return {
    version: 2,
    id: 'biome_atlas_v2_runtime',
    biome: 'forest',
    source: 'biome_atlas_manifest',
    generatedAt: new Date().toISOString(),
    deterministic: true,
    expectedPngCount: all.length,
    pngCount: all.length,
    txtCount: 0,
    basePath: url.replace(/\/[^/]*$/, ''),
    entries,
    all,
    byKind,
    tilesets,
    props: {},
    ui: {},
    validation: {
      noPngOmitted: true,
      importedPngCount: all.length,
      manifestEntryCount: all.length,
      rule: 'runtime-converted Pixi atlas manifest into forest-compatible terrain entries',
    },
  };
}

export async function loadForestBiomeManifest(): Promise<ForestBiomeManifest | null> {
  for (const url of MANIFEST_URLS) {
    try {
      const manifest = await tryLoadForestBiomeManifest(url);
      if (manifest) return manifest;
    } catch (error) {
      console.warn(`[ForestBiomePicker] Failed to load forest biome manifest: ${url}`, error);
    }
  }
  return null;
}

export function validateForestBiomeManifest(manifest: ForestBiomeManifest): void {
  const entryCount = Object.keys(manifest.entries ?? {}).length;
  if (!manifest.validation?.noPngOmitted) throw new Error('Forest biome manifest validation flag is false');
  if (manifest.pngCount !== entryCount) throw new Error(`Forest biome PNG count mismatch: ${manifest.pngCount} PNGs, ${entryCount} entries`);
  if (manifest.expectedPngCount !== entryCount) throw new Error(`Forest biome expected count mismatch: ${manifest.expectedPngCount} expected, ${entryCount} entries`);
}

export function deterministicForestHash(parts: Array<string | number | null | undefined>): number {
  let hash = 2166136261;
  for (const part of parts) {
    const text = String(part ?? '');
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 1249;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function entryText(entry: ForestBiomeAssetEntry): string {
  return `${entry.id} ${entry.kind} ${entry.group} ${entry.sourceName} ${entry.sourcePath} ${(entry.tags ?? []).join(' ')}`.toLowerCase();
}

function isSemanticTerrainEntry(entry: ForestBiomeAssetEntry | null | undefined): boolean {
  if (!entry || entry.category !== 'tilesets') return false;
  const text = `_${entryText(entry)}_`;
  if (NON_TERRAIN_RE.test(text)) return false;
  return TERRAIN_KIND_RE.test(text);
}

function basePoolIds(manifest: ForestBiomeManifest, input: ForestBiomePickInput): string[] {
  if (input.kind && manifest.byKind[input.kind]?.length) return manifest.byKind[input.kind];
  if (input.category && manifest[input.category]) return Object.keys(manifest[input.category]);
  return manifest.all;
}

export function pickForestBiomeAsset(
  manifest: ForestBiomeManifest | null,
  input: ForestBiomePickInput,
): ForestBiomeAssetEntry | null {
  if (!manifest) return null;

  let poolIds = basePoolIds(manifest, input);
  if (input.category === 'tilesets') {
    const semanticTerrainIds = poolIds.filter((id) => isSemanticTerrainEntry(manifest.entries[id]));
    if (semanticTerrainIds.length > 0) poolIds = semanticTerrainIds;
  }

  if (poolIds.length === 0) return null;

  const hash = deterministicForestHash([
    'forest-biome-v2-semantic-terrain',
    input.worldSeed,
    input.chunkX,
    input.chunkZ,
    input.tileX,
    input.tileZ,
    input.layer ?? 0,
    input.kind ?? '',
    input.category ?? '',
  ]);

  const id = poolIds[hash % poolIds.length];
  return manifest.entries[id] ?? null;
}

export function pickForestGround(manifest: ForestBiomeManifest | null, input: Omit<ForestBiomePickInput, 'kind' | 'category'>) {
  return pickForestBiomeAsset(manifest, { ...input, kind: 'ground', category: 'tilesets' })
    ?? pickForestBiomeAsset(manifest, { ...input, kind: 'floor', category: 'tilesets' })
    ?? pickForestBiomeAsset(manifest, { ...input, kind: 'center', category: 'tilesets' })
    ?? pickForestBiomeAsset(manifest, { ...input, kind: 'transition', category: 'tilesets' })
    ?? pickForestBiomeAsset(manifest, { ...input, kind: 'edge', category: 'tilesets' })
    ?? pickForestBiomeAsset(manifest, { ...input, kind: 'corner', category: 'tilesets' })
    ?? pickForestBiomeAsset(manifest, { ...input, kind: 'tile', category: 'tilesets' })
    ?? pickForestBiomeAsset(manifest, { ...input, category: 'tilesets' });
}

export function pickForestGrass(manifest: ForestBiomeManifest | null, input: Omit<ForestBiomePickInput, 'kind' | 'category'>) {
  return pickForestBiomeAsset(manifest, { ...input, kind: 'grass', category: 'tilesets' });
}

export function pickForestDecoration(manifest: ForestBiomeManifest | null, input: Omit<ForestBiomePickInput, 'kind' | 'category'>) {
  return pickForestBiomeAsset(manifest, { ...input, category: 'props' });
}
