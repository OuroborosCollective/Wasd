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

export function pickForestBiomeAsset(
  manifest: ForestBiomeManifest | null,
  input: ForestBiomePickInput,
): ForestBiomeAssetEntry | null {
  if (!manifest) return null;

  let poolIds: string[] = [];
  if (input.kind && manifest.byKind[input.kind]?.length) {
    poolIds = manifest.byKind[input.kind];
  } else if (input.category && manifest[input.category]) {
    poolIds = Object.keys(manifest[input.category]);
  } else {
    poolIds = manifest.all;
  }

  if (poolIds.length === 0) return null;

  const hash = deterministicForestHash([
    'forest-biome-v1',
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
  return pickForestBiomeAsset(manifest, { ...input, kind: 'ground', category: 'tilesets' });
}

export function pickForestGrass(manifest: ForestBiomeManifest | null, input: Omit<ForestBiomePickInput, 'kind' | 'category'>) {
  return pickForestBiomeAsset(manifest, { ...input, kind: 'grass', category: 'tilesets' });
}

export function pickForestDecoration(manifest: ForestBiomeManifest | null, input: Omit<ForestBiomePickInput, 'kind' | 'category'>) {
  return pickForestBiomeAsset(manifest, { ...input, category: 'props' });
}
