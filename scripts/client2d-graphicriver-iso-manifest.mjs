#!/usr/bin/env node
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const IMAGE_EXTENSIONS = new Set(['.png', '.webp', '.jpg', '.jpeg']);
const DEFAULT_PUBLIC_BASE = '/client2d-assets/graphicriver-iso';

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) walk(full, out);
    else if (stats.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase())) out.push(full);
  }
  return out;
}

function slug(value) {
  return String(value)
    .replace(/\\/g, '/')
    .replace(/\.[a-z0-9]+$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96) || 'asset';
}

function categoryFor(relativePath) {
  const p = relativePath.toLowerCase();
  if (p.includes('projectile') || p.includes('/fx/') || p.includes('fire') || p.includes('ice') || p.includes('tesla') || p.includes('magic')) return 'fx';
  if (p.includes('tower') || p.includes('castle') || p.includes('building') || p.includes('cannon')) return 'buildings';
  if (p.includes('character') || p.includes('peasant') || p.includes('child') || p.includes('knight') || p.includes('horse')) return 'characters';
  if (p.includes('monster') || p.includes('enemy') || p.includes('rat') || p.includes('ghost') || p.includes('troll') || p.includes('ogre') || p.includes('dragon')) return 'monsters';
  if (p.includes('tile') || p.includes('background') || p.includes('grass') || p.includes('desert') || p.includes('road')) return 'tilesets';
  if (p.includes('nature') || p.includes('prop') || p.includes('tree') || p.includes('bush') || p.includes('plant') || p.includes('berry')) return 'props';
  return 'props';
}

function tagsFor(relativePath, category) {
  const p = relativePath.toLowerCase();
  const tags = new Set(['graphicriver_iso', 'isometric']);
  tags.add(category.replace(/s$/, ''));
  for (const token of ['grass', 'desert', 'road', 'peasant', 'child', 'knight', 'horse', 'rat', 'ghost', 'troll', 'ogre', 'dragon', 'tower', 'castle', 'cannon', 'fire', 'ice', 'tesla', 'tree', 'bush', 'plant']) {
    if (p.includes(token)) tags.add(token);
  }
  return [...tags];
}

function buildManifest(rootDir, publicBase) {
  const files = walk(rootDir);
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    basePath: publicBase,
    sources: [{ id: 'graphicriver_iso_td_3', source: 'GraphicRiver isometric tower defense game kit 3 of 3', privateVendor: true }],
    tilesets: {},
    characters: {},
    monsters: {},
    buildings: {},
    props: {},
    fx: {},
    ui: {},
    weapons: {},
    fallbacks: {},
  };

  for (const full of files) {
    const relative = path.relative(rootDir, full).replace(/\\/g, '/');
    const category = categoryFor(relative);
    const id = `gr_iso_${slug(relative)}`;
    manifest[category][id] = {
      id,
      src: `${publicBase}/${relative.split('/').map(encodeURIComponent).join('/')}`,
      source: 'GraphicRiver Iso TD Kit 3',
      sourcePath: relative,
      license: 'private-paid-vendor-runtime-only',
      kind: category.replace(/s$/, ''),
      group: category,
      tags: tagsFor(relative, category),
      rules: { privateVendor: true, isometric: true, runtimeOnly: true },
    };
  }

  const firstKey = (group) => Object.keys(group ?? {})[0] ?? null;
  manifest.fallbacks = {
    tile: firstKey(manifest.tilesets),
    tree: Object.keys(manifest.props).find((id) => id.includes('tree')) ?? firstKey(manifest.props),
    house: Object.keys(manifest.buildings).find((id) => id.includes('castle') || id.includes('tower')) ?? firstKey(manifest.buildings),
    npc: Object.keys(manifest.characters).find((id) => id.includes('peasant') || id.includes('child')) ?? firstKey(manifest.characters),
    player: Object.keys(manifest.characters).find((id) => id.includes('knight') || id.includes('peasant')) ?? firstKey(manifest.characters),
    monster: firstKey(manifest.monsters),
    fx: firstKey(manifest.fx),
  };

  manifest.counts = {
    tilesets: Object.keys(manifest.tilesets).length,
    characters: Object.keys(manifest.characters).length,
    monsters: Object.keys(manifest.monsters).length,
    buildings: Object.keys(manifest.buildings).length,
    props: Object.keys(manifest.props).length,
    fx: Object.keys(manifest.fx).length,
    total: files.length,
  };

  return manifest;
}

const rootDir = path.resolve(readArg('--root', process.env.GRAPHICRIVER_ISO_ROOT ?? '/opt/areloria/private-assets/graphicriver-iso/public'));
const outFile = path.resolve(readArg('--out', path.join(rootDir, 'manifest.json')));
const publicBase = readArg('--public-base', DEFAULT_PUBLIC_BASE);

if (!existsSync(rootDir)) {
  console.error(`[graphicriver-iso-manifest] root not found: ${rootDir}`);
  process.exit(1);
}

const manifest = buildManifest(rootDir, publicBase);
writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`[graphicriver-iso-manifest] wrote ${outFile}`);
console.log(`[graphicriver-iso-manifest] total png/web images: ${manifest.counts.total}`);
console.log(`[graphicriver-iso-manifest] characters=${manifest.counts.characters} monsters=${manifest.counts.monsters} tiles=${manifest.counts.tilesets} props=${manifest.counts.props} buildings=${manifest.counts.buildings} fx=${manifest.counts.fx}`);
