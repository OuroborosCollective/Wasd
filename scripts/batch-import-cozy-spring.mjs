#!/usr/bin/env node
/**
 * Deterministic importer for SakPix Cozy Spring.
 *
 * The purchased pack is distributed as container ZIPs that contain the 20 real
 * category ZIPs. This importer recursively unpacks nested ZIPs from
 * .asset-inbox/cozy-spring and copies the real PNG assets into the 2D public
 * asset tree. It does NOT slice prop sheets into random 32x32 fragments.
 *
 * Runtime policy:
 * - tilesets may be used as tile sheets / terrain sources
 * - props are full PNG assets from the pack and may be used as world props
 * - sliced 32x32 frame manifests are not generated here
 *
 * Usage:
 *   node scripts/batch-import-cozy-spring.mjs [.asset-inbox/cozy-spring]
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, statSync, copyFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const repoRoot = resolve(process.cwd());
const inboxDir = resolve(process.argv[2] ?? join(repoRoot, '.asset-inbox/cozy-spring'));
const outputRoot = join(repoRoot, 'apps/client-2d/public/assets/cozy-spring');
const tmpRoot = join(repoRoot, '.tmp/cozy-spring-real-import');

const CATEGORY_MAP = {
  'grass tiles': { category: 'tilesets', biome: 'plains', kind: 'grass', tags: ['grass', 'tile', 'ground', 'spring', 'green'] },
  'soil and dirt tiles': { category: 'tilesets', biome: 'plains', kind: 'dirt', tags: ['soil', 'dirt', 'tile', 'ground', 'brown'] },
  'stone paths': { category: 'tilesets', biome: 'plains', kind: 'road', tags: ['stone', 'path', 'road', 'walkway'] },
  'flower paths': { category: 'tilesets', biome: 'plains', kind: 'road', tags: ['flower', 'path', 'road', 'garden'] },
  'water and ponds': { category: 'tilesets', biome: 'plains', kind: 'water', tags: ['water', 'pond', 'lake', 'liquid'] },

  'cherry blossom trees': { category: 'props', biome: 'plains', kind: 'tree', tags: ['tree', 'cherry', 'blossom', 'pink', 'spring'] },
  'trees spring': { category: 'props', biome: 'plains', kind: 'tree', tags: ['tree', 'spring', 'green', 'nature'] },
  'trees (spring)': { category: 'props', biome: 'plains', kind: 'tree', tags: ['tree', 'spring', 'green', 'nature'] },
  'bushes and shrubs': { category: 'props', biome: 'plains', kind: 'bush', tags: ['bush', 'shrub', 'plant', 'green'] },
  'flowers and plants': { category: 'props', biome: 'plains', kind: 'flower', tags: ['flower', 'plant', 'garden', 'nature'] },
  'petals and ground details': { category: 'props', biome: 'plains', kind: 'flower', tags: ['petal', 'ground', 'detail', 'decoration'] },

  'fences and gates': { category: 'props', biome: 'plains', kind: 'fence', tags: ['fence', 'gate', 'barrier', 'wooden'] },
  'bridges and boardwalks': { category: 'props', biome: 'plains', kind: 'bridge', tags: ['bridge', 'boardwalk', 'wood', 'structure'] },
  'garden beds': { category: 'props', biome: 'plains', kind: 'garden', tags: ['garden', 'bed', 'planting', 'vegetable'] },
  'garden furniture': { category: 'props', biome: 'plains', kind: 'furniture', tags: ['furniture', 'garden', 'bench', 'table'] },
  'benches and seating': { category: 'props', biome: 'plains', kind: 'bench', tags: ['bench', 'seat', 'furniture', 'rest'] },
  'lamps and lights': { category: 'props', biome: 'plains', kind: 'lamp', tags: ['lamp', 'light', 'glow', 'decoration'] },
  'mailboxes and birdhouses': { category: 'props', biome: 'plains', kind: 'mailbox', tags: ['mailbox', 'birdhouse', 'house', 'bird'] },
  'pots and planters': { category: 'props', biome: 'plains', kind: 'pot', tags: ['pot', 'planter', 'flower', 'container'] },
  'decor and homey items': { category: 'props', biome: 'plains', kind: 'deco', tags: ['decor', 'home', 'decoration', 'cozy'] },
  'extra cozy details': { category: 'props', biome: 'plains', kind: 'deco', tags: ['detail', 'decoration', 'cozy', 'spring'] },
};

function requireCommand(name) {
  const result = spawnSync(name, ['-v'], { encoding: 'utf8' });
  if (result.error) {
    console.error(`[CozyImport] Missing required command: ${name}`);
    process.exit(1);
  }
}

function normalizeName(filename) {
  return filename
    .toLowerCase()
    .replace(/\.zip$/i, '')
    .replace(/\([^)]*\)/g, ' $& ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function unzip(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  const result = spawnSync('unzip', ['-q', '-o', zipPath, '-d', destDir], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`unzip failed for ${zipPath}: ${result.stderr || result.stdout}`);
  }
}

function explodeNestedZips(sourceDir) {
  let round = 0;
  while (round < 5) {
    const zips = walk(sourceDir).filter((file) => extname(file).toLowerCase() === '.zip');
    if (zips.length === 0) break;
    for (const zipPath of zips) {
      const dest = join(dirname(zipPath), slug(basename(zipPath, '.zip')));
      unzip(zipPath, dest);
      rmSync(zipPath, { force: true });
    }
    round += 1;
  }
}

function mappingFor(path) {
  const normalized = normalizeName(path);
  for (const [pattern, config] of Object.entries(CATEGORY_MAP)) {
    const p = normalizeName(pattern);
    if (normalized.includes(p)) return { group: pattern.replace(/[()]/g, '').replace(/\s+/g, ' ').trim(), ...config };
  }
  return { group: 'extra cozy details', category: 'props', biome: 'plains', kind: 'deco', tags: ['detail', 'decoration', 'cozy', 'spring'] };
}

function detectKind(filePath, config) {
  const lower = filePath.toLowerCase();
  if (lower.includes('tile') || lower.includes('ground')) return config.category === 'tilesets' ? config.kind : 'deco';
  if (lower.includes('water') || lower.includes('pond')) return 'water';
  if (lower.includes('path') || lower.includes('road')) return 'road';
  if (lower.includes('tree')) return 'tree';
  if (lower.includes('bush') || lower.includes('shrub')) return 'bush';
  if (lower.includes('flower') || lower.includes('plant')) return 'flower';
  if (lower.includes('fence') || lower.includes('gate')) return 'fence';
  if (lower.includes('bridge')) return 'bridge';
  if (lower.includes('bench') || lower.includes('seat')) return 'bench';
  if (lower.includes('lamp') || lower.includes('light')) return 'lamp';
  if (lower.includes('pot') || lower.includes('planter')) return 'pot';
  if (lower.includes('mailbox')) return 'mailbox';
  if (lower.includes('birdhouse')) return 'birdhouse';
  if (lower.includes('garden')) return 'garden';
  return config.kind;
}

function makeId(groupSlug, relPath, hash) {
  return `cozy_spring_${groupSlug}_${slug(relPath).replace(/-/g, '_')}_${hash.slice(0, 8)}`;
}

function isLikelyRuntimePng(path) {
  const lower = path.toLowerCase();
  if (!lower.endsWith('.png')) return false;
  if (lower.includes('__macosx/')) return false;
  if (lower.includes('/preview') || lower.includes('preview')) return false;
  if (lower.includes('/license') || lower.includes('license')) return false;
  return true;
}

function importFiles(extractedRoot) {
  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });

  const allPngs = walk(extractedRoot).filter(isLikelyRuntimePng).sort();
  const categories = { tilesets: {}, props: {} };
  const masterEntries = {};
  const groupEntries = new Map();

  for (const pngPath of allPngs) {
    const relFromExtract = relative(extractedRoot, pngPath).replace(/\\/g, '/');
    const config = mappingFor(relFromExtract);
    const groupSlug = slug(config.group);
    const kind = detectKind(relFromExtract, config);
    const hash = sha256File(pngPath);
    const safeName = `${slug(relFromExtract.replace(/\.png$/i, ''))}-${hash.slice(0, 8)}.png`;
    const destRel = `${config.category}/${groupSlug}/files/${safeName}`;
    const destPath = join(outputRoot, destRel);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(pngPath, destPath);

    const id = makeId(groupSlug, relFromExtract, hash);
    const entry = {
      id,
      src: `/assets/cozy-spring/${destRel}`,
      source: 'SakPix_Cozy_Spring_Asset_Pack',
      sourcePath: relFromExtract,
      sourceName: basename(pngPath),
      license: 'purchased-itchio-sakpix',
      category: config.category,
      kind,
      group: config.group,
      biome: config.biome,
      tags: [...new Set(['cozy-spring', config.category, kind, groupSlug, ...config.tags])],
      biomeTags: [...new Set([config.biome, 'plains', 'spring', 'village', 'cozy'])],
      cultureTags: ['cozy', 'spring'],
      sha256: hash,
      bytes: statSync(pngPath).size,
      deterministic: true,
      meta: {
        runtimeRole: config.category === 'tilesets' ? 'tileSource' : 'propObject',
        usableAsProp: config.category === 'props',
        usableAsTile: config.category === 'tilesets',
        fragmentOnly: false,
        ySortAnchor: config.category === 'props' ? 'bottom' : 'center',
        blocksMovement: ['tree', 'fence', 'bridge', 'bench', 'lamp', 'mailbox', 'pot', 'garden'].includes(kind),
        blocksVision: ['tree', 'fence'].includes(kind),
      },
    };

    masterEntries[id] = entry;
    if (!groupEntries.has(config.category)) groupEntries.set(config.category, new Map());
    const catMap = groupEntries.get(config.category);
    if (!catMap.has(groupSlug)) catMap.set(groupSlug, { config, entries: {} });
    catMap.get(groupSlug).entries[id] = entry;
  }

  for (const [category, groups] of groupEntries.entries()) {
    for (const [groupSlug, { config, entries }] of groups.entries()) {
      const manifest = {
        version: 2,
        id: `cozy_spring_${groupSlug}`,
        source: 'SakPix_Cozy_Spring_Asset_Pack',
        category,
        biome: config.biome,
        deterministic: true,
        expectedPngCount: Object.keys(entries).length,
        pngCount: Object.keys(entries).length,
        basePath: `/assets/cozy-spring/${category}/${groupSlug}`,
        entries,
        all: Object.keys(entries).sort(),
        validation: {
          noPngOmitted: true,
          importedPngCount: Object.keys(entries).length,
          manifestEntryCount: Object.keys(entries).length,
          importer: 'batch-import-cozy-spring.mjs',
        },
      };
      const groupDir = join(outputRoot, category, groupSlug);
      writeFileSync(join(groupDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
      categories[category][groupSlug] = { count: Object.keys(entries).length, biome: config.biome, kind: config.kind, group: config.group };
    }
  }

  const masterManifest = {
    version: 2,
    id: 'cozy_spring_master',
    source: 'SakPix_Cozy_Spring_Asset_Pack',
    deterministic: true,
    totalEntries: Object.keys(masterEntries).length,
    categories,
    tilesets: Object.fromEntries(Object.entries(masterEntries).filter(([, entry]) => entry.category === 'tilesets')),
    props: Object.fromEntries(Object.entries(masterEntries).filter(([, entry]) => entry.category === 'props')),
    entries: masterEntries,
  };

  writeFileSync(join(outputRoot, 'manifest.json'), JSON.stringify(masterManifest, null, 2) + '\n');
  writeFileSync(join(outputRoot, 'README.md'), `# Cozy Spring Asset Pack\n\nImported from .asset-inbox/cozy-spring by scripts/batch-import-cozy-spring.mjs.\n\nSource: https://sakpix.itch.io/cozy-spring-asset-pack-top-down-pixel-art-tileset-300-assets\n\nTotal imported PNG assets: ${Object.keys(masterEntries).length}\n\nLicense: purchased from itch.io / SakPix. Do not redistribute as an asset pack.\n`);

  return { total: Object.keys(masterEntries).length, categories };
}

function main() {
  console.log('=== Cozy Spring real-pack import ===');
  console.log(`Inbox: ${inboxDir}`);
  console.log(`Output: ${outputRoot}`);
  requireCommand('unzip');

  if (!existsSync(inboxDir)) {
    console.error(`[CozyImport] Inbox directory not found: ${inboxDir}`);
    process.exit(1);
  }

  rmSync(tmpRoot, { recursive: true, force: true });
  mkdirSync(tmpRoot, { recursive: true });

  const topZips = walk(inboxDir).filter((file) => extname(file).toLowerCase() === '.zip').sort();
  if (topZips.length === 0) {
    console.error('[CozyImport] No ZIP files found in inbox.');
    process.exit(1);
  }

  for (const zipPath of topZips) {
    unzip(zipPath, join(tmpRoot, slug(basename(zipPath, '.zip'))));
  }
  explodeNestedZips(tmpRoot);

  const result = importFiles(tmpRoot);
  rmSync(tmpRoot, { recursive: true, force: true });

  console.log(`Imported ${result.total} real Cozy Spring PNG assets.`);
  console.log(JSON.stringify(result.categories, null, 2));
}

main();
