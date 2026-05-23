#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const [, , zipArg, destArg] = process.argv;

if (!zipArg) {
  console.error('Usage: node scripts/import-forest-biome-pack.mjs <AssetPack01_Forest_Sample.zip> [dest]');
  process.exit(1);
}

const repoRoot = resolve(process.cwd());
const zipPath = resolve(zipArg);
const destRoot = resolve(destArg ?? join(repoRoot, 'apps/client-2d/public/assets/biomes/forest/assetpack01'));
const filesRoot = join(destRoot, 'files');
const tmpRoot = join(repoRoot, '.tmp/forest-biome-pack-import');

if (!existsSync(zipPath)) {
  console.error(`[ForestBiomeImport] ZIP not found: ${zipPath}`);
  process.exit(1);
}

function requireCommand(name) {
  const result = spawnSync(name, ['-v'], { encoding: 'utf8' });
  if (result.error) {
    console.error(`[ForestBiomeImport] Missing required command: ${name}`);
    console.error('Install unzip or run this in GitHub Actions / Linux shell.');
    process.exit(1);
  }
}

function normalizePath(input) {
  return input.split(sep).join('/').replace(/^AssetPack01_Forest_Sample\//, '');
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function idFor(relPath) {
  return relPath
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function categoryFor(relPath) {
  const lower = relPath.toLowerCase();
  if (lower.includes('utility') || lower.includes('grid') || lower.includes('base') || lower.includes('background')) return 'ui';
  if (lower.includes('forestground') || lower.includes('ground') || lower.includes('grass') || lower.includes('moss') || lower.includes('step')) return 'tilesets';
  return 'props';
}

function forestKindFor(relPath) {
  const lower = relPath.toLowerCase();
  if (lower.includes('forestground') || lower.includes('ground')) return 'ground';
  if (lower.includes('grass')) return 'grass';
  if (lower.includes('moss')) return 'moss';
  if (lower.includes('fern')) return 'fern';
  if (lower.includes('foliage') || lower.includes('leaf') || lower.includes('leaves')) return 'foliage';
  if (lower.includes('tree') || lower.includes('trunk') || lower.includes('stump')) return 'tree';
  if (lower.includes('rock') || lower.includes('stone')) return 'rock';
  if (lower.includes('mushroom')) return 'mushroom';
  if (lower.includes('flower')) return 'flower';
  if (lower.includes('fruit') || lower.includes('berry')) return 'fruit';
  if (lower.includes('step')) return 'step';
  if (lower.includes('grid') || lower.includes('base') || lower.includes('utility')) return 'utility';
  return 'forest_prop';
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

requireCommand('unzip');
rmSync(tmpRoot, { recursive: true, force: true });
rmSync(destRoot, { recursive: true, force: true });
mkdirSync(tmpRoot, { recursive: true });
mkdirSync(filesRoot, { recursive: true });

const unzip = spawnSync('unzip', ['-q', zipPath, '-d', tmpRoot], { encoding: 'utf8' });
if (unzip.status !== 0) {
  console.error(unzip.stderr || unzip.stdout || '[ForestBiomeImport] unzip failed');
  process.exit(unzip.status ?? 1);
}

const extractedFiles = walk(tmpRoot).sort();
const pngFiles = extractedFiles.filter((file) => extname(file).toLowerCase() === '.png');
const txtFiles = extractedFiles.filter((file) => extname(file).toLowerCase() === '.txt');

if (pngFiles.length === 0) {
  console.error('[ForestBiomeImport] No PNG files found. Refusing to create empty biome pack.');
  process.exit(1);
}

const entries = {};
const byCategory = { tilesets: {}, props: {}, ui: {} };
const byKind = {};
const all = [];

for (const file of pngFiles) {
  const rawRel = normalizePath(relative(tmpRoot, file));
  const safeRel = rawRel.replace(/[^a-zA-Z0-9._/-]+/g, '_');
  const outPath = join(filesRoot, safeRel);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, readFileSync(file));

  const id = idFor(safeRel);
  const category = categoryFor(safeRel);
  const forestKind = forestKindFor(safeRel);
  const src = `/2d/assets/biomes/forest/assetpack01/files/${safeRel}`;
  const size = statSync(file).size;
  const entry = {
    id,
    src,
    source: 'AssetPack01_Forest_Sample',
    sourcePath: rawRel,
    sourceName: basename(rawRel),
    license: 'uploaded-user-provided-pack',
    kind: forestKind,
    group: 'forest',
    biome: 'forest',
    category,
    bytes: size,
    sha256: sha256(file),
    tags: ['forest', forestKind, category],
    deterministic: true,
  };

  if (entries[id]) {
    console.error(`[ForestBiomeImport] Duplicate generated id: ${id}`);
    console.error(` - ${entries[id].sourcePath}`);
    console.error(` - ${rawRel}`);
    process.exit(1);
  }

  entries[id] = entry;
  byCategory[category][id] = entry;
  byKind[forestKind] ??= [];
  byKind[forestKind].push(id);
  all.push(id);
}

const manifest = {
  version: 1,
  id: 'assetpack01_forest_sample',
  biome: 'forest',
  source: 'AssetPack01_Forest_Sample.zip',
  generatedAt: new Date().toISOString(),
  deterministic: true,
  expectedPngCount: pngFiles.length,
  pngCount: pngFiles.length,
  txtCount: txtFiles.length,
  basePath: '/2d/assets/biomes/forest/assetpack01',
  entries,
  all,
  byKind,
  tilesets: byCategory.tilesets,
  props: byCategory.props,
  ui: byCategory.ui,
  validation: {
    noPngOmitted: true,
    importedPngCount: pngFiles.length,
    manifestEntryCount: Object.keys(entries).length,
    rule: 'importedPngCount must equal manifestEntryCount',
  },
};

if (manifest.pngCount !== Object.keys(manifest.entries).length) {
  console.error(`[ForestBiomeImport] Missing PNG entries: ${manifest.pngCount} PNGs vs ${Object.keys(manifest.entries).length} manifest entries`);
  process.exit(1);
}

writeFileSync(join(destRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(destRoot, 'README.md'), `# AssetPack01 Forest Sample\n\nImported by \`scripts/import-forest-biome-pack.mjs\`.\n\n- PNG files: ${pngFiles.length}\n- Manifest entries: ${Object.keys(entries).length}\n- Deterministic: yes\n- Runtime path: \`/2d/assets/biomes/forest/assetpack01/manifest.json\`\n\nThe importer fails if any PNG is omitted from the manifest.\n`);

console.log(`[ForestBiomeImport] Imported ${pngFiles.length} PNG files into ${relative(repoRoot, destRoot)}`);
console.log(`[ForestBiomeImport] Manifest entries: ${Object.keys(entries).length}`);
console.log('[ForestBiomeImport] OK: no PNG omitted.');
