#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const importer = join(repoRoot, 'scripts/import-forest-biome-pack.mjs');
const outDir = join(repoRoot, 'apps/client-2d/public/2d/assets/biomes/forest/assetpack01');
const releaseJsonPath = join(repoRoot, 'release.json');
const releaseCacheDir = join(repoRoot, '.tmp/release-assets');
const releaseZipPath = join(releaseCacheDir, 'AssetPack01_Forest_Sample.zip');

const zipCandidates = [
  join(repoRoot, 'asset-packs/2d/forest/AssetPack01_Forest_Sample.zip'),
  join(repoRoot, 'asset-packs/2d/biomes/forest/AssetPack01_Forest_Sample.zip'),
  join(repoRoot, 'asset-packs/2d/AssetPack01_Forest_Sample.zip'),
  releaseZipPath,
];

function log(message) {
  console.log(`[ForestBiomeExtract] ${message}`);
}

function findZip() {
  return zipCandidates.find((candidate) => existsSync(candidate)) ?? null;
}

function forestReleaseAssetUrl() {
  if (!existsSync(releaseJsonPath)) return null;
  const release = JSON.parse(readFileSync(releaseJsonPath, 'utf8'));
  const asset = release.assets?.find((entry) => entry?.name === 'AssetPack01_Forest_Sample.zip');
  return asset?.url ?? null;
}

function downloadReleaseZip() {
  const url = forestReleaseAssetUrl();
  if (!url || existsSync(releaseZipPath)) return;

  mkdirSync(releaseCacheDir, { recursive: true });
  log(`Downloading forest release asset from ${url}`);

  try {
    execFileSync('curl', ['-L', '--fail', '--retry', '3', '--output', releaseZipPath, url], { stdio: 'inherit' });
  } catch (error) {
    if (existsSync(releaseZipPath)) rmSync(releaseZipPath, { force: true });
    log(`Forest release asset unavailable; keeping fallback manifest. ${error.message}`);
  }
}

downloadReleaseZip();
const zipPath = findZip();
if (!zipPath) {
  log(`No forest biome ZIP found. Keeping fallback manifest at ${outDir}.`);
  log('Expected one of:');
  zipCandidates.forEach((candidate) => log(` - ${candidate}`));
  log('Or add AssetPack01_Forest_Sample.zip to release.json assets.');
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
execFileSync(process.execPath, [importer, zipPath, outDir], { stdio: 'inherit' });
log(`Generated forest biome manifest from ${zipPath}`);
