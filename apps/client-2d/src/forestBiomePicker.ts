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

const TERRAIN_KIND_RE = /(?:^|[_\-\s/])(ground|grass|floor|tile|tileset|terrain|dirt|soil|path|road|earth|moss|leaf|leaves)(?:$|[_\-\s/])/i;
const SPRAY_NOISE_RE = /(?:particle|effect|fx|icon|ui|window|door|tree|bush|flower|rock|log|stump|character|npc|monster|object|deco|decoration)/i;

export async function loadForestBiomeManifest(): Promise<ForestBiomeManifest | null> {
  try {
    const response = await fetch('/2d/assets/biomes/forest/assetpack01/manifest.json', { cache: 'no-store' });
    if (!response.ok) return null;
    const manifest = await response.json() as ForestBiomeManifest;
    validateForestBiomeManifest(manifest);
    return manifest;
  } catch (error) {
    console.warn('[ForestBiomePicker] Failed to load forest biome manifest', error);
    return null;
  }
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

function entrySearchText(entry: ForestBiomeAssetEntry): string {
  return `${entry.id} ${entry.kind} ${entry.group} ${entry.sourceName} ${entry.sourcePath} ${(entry.tags ?? []).join(' ')}`.toLowerCase();
}

function isTerrainEntry(entry: ForestBiomeAssetEntry | null | undefined): boolean {
  if (!entry || entry.category !== 'tilesets') return false;
  const text = entrySearchText(entry);
  if (SPRAY_NOISE_RE.test(text)) return false;
  return TERRAIN_KIND_RE.test(`_${text}_`);
}

function idsForPool(manifest: ForestBiomeManifest, input: ForestBiomePickInput): string[] {
  if (input.kind && manifest.byKind[input.kind]?.length) return manifest.byKind[input.kind];
  if (input.category && manifest[input.category]) return Object.keys(manifest[input.category]);
  return manifest.all;
}

export function pickForestBiomeAsset(
  manifest: ForestBiomeManifest | null,
  input: ForestBiomePickInput,
): ForestBiomeAssetEntry | null {
  if (!manifest) return null;

  let poolIds = idsForPool(manifest, input);
  if (input.category === 'tilesets') {
    const terrainIds = poolIds.filter((id) => isTerrainEntry(manifest.entries[id]));
    if (terrainIds.length > 0) poolIds = terrainIds;
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
    ?? pickForestBiomeAsset(manifest, { ...input, kind: 'tile', category: 'tilesets' })
    ?? pickForestBiomeAsset(manifest, { ...input, category: 'tilesets' });
}

export function pickForestGrass(manifest: ForestBiomeManifest | null, input: Omit<ForestBiomePickInput, 'kind' | 'category'>) {
  return pickForestBiomeAsset(manifest, { ...input, kind: 'grass', category: 'tilesets' });
}

export function pickForestDecoration(manifest: ForestBiomeManifest | null, input: Omit<ForestBiomePickInput, 'kind' | 'category'>) {
  return pickForestBiomeAsset(manifest, { ...input, category: 'props' });
}
