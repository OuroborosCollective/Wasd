#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const zipPath = join(repoRoot, 'asset-packs/2d/weapons/modular_weapon_atlas.zip');
const tmpRoot = join(repoRoot, '.tmp/modular-weapon-atlas');
const unpackRoot = join(tmpRoot, 'unpacked');
const outDir = join(repoRoot, 'apps/client-2d/public/2d-assets/weapons/modular');
const log = (msg) => console.log(`[ModularWeaponAtlas] ${msg}`);

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function normalizeRarity(value) { const r = String(value ?? 'common').toLowerCase(); return r === 'mythic' ? 'mystic' : r; }
function findSourceRoot() {
  for (const name of ['weapon-atlas', 'weapon_atlas', 'modular_weapon_atlas', '.']) {
    const root = name === '.' ? unpackRoot : join(unpackRoot, name);
    if (existsSync(join(root, 'manifest.json'))) return root;
  }
  return null;
}
function weaponClassFor(part) {
  const kind = String(part?.weapon_kind ?? '').toLowerCase();
  if (kind) return kind === 'offhand' ? 'shield' : kind;
  const category = String(part?.category ?? '').toLowerCase();
  if (category.startsWith('sword_')) return 'sword';
  if (category.startsWith('axe_')) return 'axe';
  if (category.startsWith('hammer_')) return 'hammer';
  if (category.startsWith('spear_')) return 'spear';
  if (category.startsWith('bow_')) return 'bow';
  if (category.startsWith('dagger_')) return 'dagger';
  if (category.startsWith('mace_')) return 'mace';
  if (category.startsWith('staff_') || category === 'magical_crystal') return 'staff';
  if (category === 'knuckle') return 'knuckle';
  if (category === 'shield') return 'shield';
  return 'weapon';
}
function frameFor(part) {
  return {
    x: Number(part?.atlas_x ?? part?.x ?? 0),
    y: Number(part?.atlas_y ?? part?.y ?? 0),
    w: Number(part?.atlas_w ?? part?.w ?? 128),
    h: Number(part?.atlas_h ?? part?.h ?? 128),
  };
}
function buildWeaponManifest(sourceManifest, sourceParts, sourceAnimations) {
  const partsArray = Array.isArray(sourceParts) ? sourceParts : Object.entries(sourceParts ?? {}).map(([id, value]) => ({ id, ...value }));
  const partsById = Object.fromEntries(partsArray.map((part) => [part.id, part]));
  const manifestParts = sourceManifest.parts ?? partsById;
  const weapons = {}, byKind = {}, byCategory = {}, byRarity = {};
  for (const [partId, raw] of Object.entries(manifestParts).sort(([a], [b]) => a.localeCompare(b))) {
    const part = { ...(partsById[partId] ?? {}), ...raw, id: partId };
    const category = String(part.category ?? 'weapon_part');
    const weaponClass = weaponClassFor(part);
    const rarity = normalizeRarity(part.rarity);
    const id = `modular_${partId}`;
    const tags = [...new Set(['modular-weapon', 'weapon-part', weaponClass, category, rarity, ...(part.tags ?? []).map(String)])];
    weapons[id] = {
      id,
      src: '/2d-assets/weapons/modular/atlas.png',
      source: 'modular_weapon_atlas.zip',
      sourcePath: `atlas.png#${partId}`,
      license: 'project-owned-generated-modular-weapon-atlas',
      kind: 'weapon-part',
      group: category,
      weaponClass,
      rarity,
      visualRarity: rarity,
      frame: frameFor(part),
      width: 64,
      height: 64,
      tags,
      animations: Object.fromEntries((part.animation_groups ?? []).map((name) => [name, sourceAnimations.frame_data?.[name] ?? { frames: [0], fps: 8 }])),
      rules: { deterministic: true, modular: true, originalId: partId, category, material: part.material ?? null, compatibleWith: part.compatible_with ?? {}, animationGroups: part.animation_groups ?? [] },
    };
    byKind[weaponClass] ??= []; byKind[weaponClass].push(id);
    byCategory[category] ??= []; byCategory[category].push(id);
    byRarity[rarity] ??= []; byRarity[rarity].push(id);
  }
  return {
    version: 2,
    id: 'modular_weapon_atlas',
    source: 'modular_weapon_atlas.zip',
    generatedAt: new Date().toISOString(),
    deterministic: true,
    basePath: '/2d-assets/weapons/modular',
    atlas: sourceManifest.atlas ?? 'atlas.png',
    tileSize: sourceManifest.tile_size ?? 128,
    totalParts: Object.keys(weapons).length,
    weaponKinds: sourceManifest.weapon_kinds ?? Object.keys(byKind),
    categories: sourceManifest.categories ?? Object.keys(byCategory),
    rarityLevels: (sourceManifest.rarity_levels ?? []).map((entry) => ({ ...entry, sourceRarity: entry.rarity, rarity: normalizeRarity(entry.rarity) })),
    assemblyRules: sourceManifest.assembly_rules ?? {},
    byKind,
    byCategory,
    byRarity,
    weapons,
    sources: [{ id: 'modular_weapon_atlas', source: 'modular_weapon_atlas.zip', parts: Object.keys(weapons).length, deterministic: true }],
  };
}

if (!existsSync(zipPath)) { log(`No ZIP found at ${zipPath}. Keeping existing weapon assets.`); process.exit(0); }
rmSync(unpackRoot, { recursive: true, force: true });
mkdirSync(unpackRoot, { recursive: true });
execFileSync('unzip', ['-o', '-q', zipPath, '-d', unpackRoot], { stdio: 'inherit' });
const sourceRoot = findSourceRoot();
if (!sourceRoot) throw new Error(`Missing weapon-atlas/manifest.json inside ${zipPath}`);
const sourceManifest = readJson(join(sourceRoot, 'manifest.json'));
const sourceParts = readJson(join(sourceRoot, 'parts.json'));
const sourceAnimations = readJson(join(sourceRoot, 'animations.json'));
rmSync(outDir, { recursive: true, force: true });
mkdirSync(dirname(outDir), { recursive: true });
cpSync(sourceRoot, outDir, { recursive: true });
writeFileSync(join(outDir, 'weapon-manifest.json'), `${JSON.stringify(buildWeaponManifest(sourceManifest, sourceParts, sourceAnimations), null, 2)}\n`);
log(`Extracted modular weapon atlas into ${outDir}`);
