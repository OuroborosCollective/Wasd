#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const importer = join(repoRoot, 'scripts/import-forest-biome-pack.mjs');
const outDir = join(repoRoot, 'apps/client-2d/public/2d/assets/biomes/forest/assetpack01');

const zipCandidates = [
  join(repoRoot, 'asset-packs/2d/forest/AssetPack01_Forest_Sample.zip'),
  join(repoRoot, 'asset-packs/2d/biomes/forest/AssetPack01_Forest_Sample.zip'),
  join(repoRoot, 'asset-packs/2d/AssetPack01_Forest_Sample.zip'),
];

function log(message) {
  console.log(`[ForestBiomeExtract] ${message}`);
}

function findZip() {
  return zipCandidates.find((candidate) => existsSync(candidate)) ?? null;
}

const zipPath = findZip();
if (!zipPath) {
  log(`No forest biome ZIP found. Keeping fallback manifest at ${outDir}.`);
  log('Expected one of:');
  zipCandidates.forEach((candidate) => log(` - ${candidate}`));
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
execFileSync(process.execPath, [importer, zipPath, outDir], { stdio: 'inherit' });
log(`Generated forest biome manifest from ${zipPath}`);
