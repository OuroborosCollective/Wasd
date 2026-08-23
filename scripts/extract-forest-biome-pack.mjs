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
const FOREST_ASSET_NAME = 'AssetPack01_Forest_Sample.zip';

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

function stableTaggedAssetUrl(tagName, assetName) {
  if (typeof tagName !== 'string' || !/^[a-zA-Z0-9._-]{1,160}$/.test(tagName)) return null;
  if (typeof assetName !== 'string' || !/^[a-zA-Z0-9._-]{1,160}$/.test(assetName)) return null;
  return `https://github.com/OuroborosCollective/Wasd/releases/download/${encodeURIComponent(tagName)}/${encodeURIComponent(assetName)}`;
}

function forestReleaseAssetUrl() {
  if (!existsSync(releaseJsonPath)) return null;
  const release = JSON.parse(readFileSync(releaseJsonPath, 'utf8'));
  const asset = release.assets?.find((entry) => entry?.name === FOREST_ASSET_NAME);
  if (!asset) return null;

  const configured = typeof asset.url === 'string' ? asset.url.trim() : '';
  const stable = stableTaggedAssetUrl(release.tagName, asset.name);

  // GitHub's temporary "untagged-*" URLs stop working after a draft release is
  // published or retagged. Prefer the canonical tag URL whenever release.json
  // contains a valid tag/name pair; retain a non-temporary configured URL only
  // as compatibility for mirrors/custom release hosts.
  if (stable && (!configured || configured.includes('/releases/download/untagged-'))) {
    return stable;
  }
  return configured || stable;
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
  log(`Or add ${FOREST_ASSET_NAME} to release.json assets with a stable tagName.`);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
execFileSync(process.execPath, [importer, zipPath, outDir], { stdio: 'inherit' });
log(`Generated forest biome manifest from ${zipPath}`);
