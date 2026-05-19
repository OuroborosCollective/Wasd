#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const zipPath = join(repoRoot, 'asset-packs/2d/weapons/wasd-2d-weapon-pool.zip');
const outDir = repoRoot;
const expectedAtlas = join(repoRoot, 'apps/client-2d/public/2d-assets/weapons/weapon-atlas.png');
const expectedManifest = join(repoRoot, 'apps/client-2d/public/2d-assets/weapons/weapon-manifest.json');
const expectedCredits = join(repoRoot, 'apps/client-2d/public/2d-assets/credits/weapon-packs.md');

function log(message) {
  console.log(`[2DWeaponPool] ${message}`);
}

function requireZip() {
  if (!existsSync(zipPath)) {
    log(`No weapon pool artifact found at ${zipPath}. Skipping extraction.`);
    return false;
  }
  return true;
}

function ensureDirs() {
  mkdirSync(dirname(expectedAtlas), { recursive: true });
  mkdirSync(dirname(expectedCredits), { recursive: true });
}

function extract() {
  ensureDirs();
  execFileSync('unzip', ['-o', '-q', zipPath, '-d', outDir], { stdio: 'inherit' });
  const missing = [expectedAtlas, expectedManifest, expectedCredits].filter((p) => !existsSync(p));
  if (missing.length > 0) {
    throw new Error(`Weapon pool extraction incomplete. Missing: ${missing.join(', ')}`);
  }
  log('Weapon pool extracted into apps/client-2d/public/2d-assets/.');
}

if (requireZip()) extract();
