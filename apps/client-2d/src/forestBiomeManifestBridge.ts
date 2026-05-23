import type { AssetEntry, AssetManifest } from './assetManifest';
import type { ForestBiomeManifest } from './forestBiomePicker';
import { loadForestBiomeManifest, validateForestBiomeManifest } from './forestBiomePicker';

export async function loadForestBiomeAssetManifest(): Promise<Partial<AssetManifest> | null> {
  const forest = await loadForestBiomeManifest();
  if (!forest) return null;
  return forestBiomeToAssetManifest(forest);
}

export function forestBiomeToAssetManifest(forest: ForestBiomeManifest): Partial<AssetManifest> {
  validateForestBiomeManifest(forest);

  const toEntry = (entry: ForestBiomeManifest['entries'][string]): AssetEntry => ({
    id: entry.id,
    src: entry.src,
    source: entry.source,
    sourcePath: entry.sourcePath,
    sourceName: entry.sourceName,
    license: entry.license,
    kind: entry.kind,
    group: 'forest',
    tags: entry.tags,
    rules: {
      biome: 'forest',
      deterministic: true,
      sha256: entry.sha256,
      bytes: entry.bytes,
    },
  });

  return {
    sources: [{
      id: forest.id,
      source: forest.source,
      biome: forest.biome,
      pngCount: forest.pngCount,
      deterministic: forest.deterministic,
    }],
    tilesets: Object.fromEntries(Object.entries(forest.tilesets).map(([id, entry]) => [id, toEntry(entry)])),
    props: Object.fromEntries(Object.entries(forest.props).map(([id, entry]) => [id, toEntry(entry)])),
    ui: Object.fromEntries(Object.entries(forest.ui).map(([id, entry]) => [id, toEntry(entry)])),
  };
}
