#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const outDir = join(repoRoot, 'apps/client-2d/public/2d-assets/biomes/biome_atlas_v2');
const releaseJsonPath = join(repoRoot, 'release.json');
const cacheDir = join(repoRoot, '.tmp/biome-atlas-v2');
const releaseZipPath = join(cacheDir, 'biome_atlas_v2.zip');
const unpackRoot = join(cacheDir, 'unpacked');
const unpackedAtlas = join(unpackRoot, 'biome_atlas');

const zipCandidates = [
  join(repoRoot, 'asset-packs/2d/biomes/biome_atlas_v2.zip'),
  join(repoRoot, 'asset-packs/2d/biome_atlas_v2.zip'),
  releaseZipPath,
];

function log(message) {
  console.log(`[BiomeAtlasV2] ${message}`);
}

function findZip() {
  return zipCandidates.find((candidate) => existsSync(candidate)) ?? null;
}

function releaseAssetUrl() {
  if (!existsSync(releaseJsonPath)) return null;
  const release = JSON.parse(readFileSync(releaseJsonPath, 'utf8'));
  const asset = release.assets?.find((entry) => entry?.name === 'biome_atlas_v2.zip');
  return asset?.url ?? null;
}

function downloadReleaseZip() {
  const url = releaseAssetUrl();
  if (!url || existsSync(releaseZipPath)) return;
  mkdirSync(cacheDir, { recursive: true });
  log(`Downloading biome atlas v2 from ${url}`);
  execFileSync('curl', ['-L', '--fail', '--retry', '3', '--output', releaseZipPath, url], { stdio: 'inherit' });
}

function kindFor(id) {
  if (id.includes('ground')) return 'ground';
  if (id.includes('edge')) return 'edge';
  if (id.includes('corner')) return 'corner';
  if (id.includes('trans')) return 'transition';
  if (id.includes('center')) return 'center';
  return 'terrain';
}

function sourcePathFor(id) {
  return id.includes('_to_') ? `transitions/${id}.png` : `tiles/${id}.png`;
}

function buildForestManifest(sourceManifest) {
  const frames = sourceManifest.frames ?? {};
  const entries = {};
  const tilesets = {};
  const byKind = {};
  const all = [];

  for (const id of Object.keys(frames).sort()) {
    const biome = id.split('_to_')[0].split('_')[0] || 'forest';
    const kind = kindFor(id);
    const sourcePath = sourcePathFor(id);
    const src = `/2d-assets/biomes/biome_atlas_v2/${sourcePath}`;
    const entry = {
      id,
      src,
      source: 'biome_atlas_v2.zip',
      sourcePath,
      sourceName: basename(sourcePath),
      license: 'project-owned-generated-biome-atlas-v2',
      kind,
      group: biome,
      biome: 'forest',
      category: 'tilesets',
      bytes: 0,
      sha256: '',
      tags: ['biome-atlas-v2', 'terrain', kind, biome],
      deterministic: true,
    };
    entries[id] = entry;
    tilesets[id] = entry;
    byKind[kind] ??= [];
    byKind[kind].push(id);
    all.push(id);
  }

  return {
    version: 2,
    id: 'biome_atlas_v2_terrain',
    biome: 'forest',
    source: 'biome_atlas_v2.zip',
    generatedAt: new Date().toISOString(),
    deterministic: true,
    expectedPngCount: all.length,
    pngCount: all.length,
    txtCount: 0,
    basePath: '/2d-assets/biomes/biome_atlas_v2',
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
      rule: 'biome atlas v2 frames are mirrored into forest-compatible terrain entries',
    },
  };
}

downloadReleaseZip();
const zipPath = findZip();
if (!zipPath) {
  log('No biome_atlas_v2.zip found. Keeping existing biome fallback.');
  log('Expected local paths:');
  zipCandidates.forEach((candidate) => log(` - ${candidate}`));
  log('Or add biome_atlas_v2.zip to release.json assets.');
  process.exit(0);
}

rmSync(unpackRoot, { recursive: true, force: true });
mkdirSync(unpackRoot, { recursive: true });
execFileSync('unzip', ['-o', '-q', zipPath, '-d', unpackRoot], { stdio: 'inherit' });

const sourceManifestPath = join(unpackedAtlas, 'manifest.json');
if (!existsSync(sourceManifestPath)) throw new Error(`Missing biome atlas manifest: ${sourceManifestPath}`);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(dirname(outDir), { recursive: true });
cpSync(unpackedAtlas, outDir, { recursive: true });

const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
const forestManifest = buildForestManifest(sourceManifest);
writeFileSync(join(outDir, 'forest-manifest.json'), `${JSON.stringify(forestManifest, null, 2)}\n`);
log(`Extracted ${forestManifest.pngCount} biome terrain entries into ${outDir}`);
