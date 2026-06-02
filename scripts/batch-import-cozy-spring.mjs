#!/usr/bin/env node
/**
 * Batch Import Script for SakPix Cozy Spring Asset Pack
 * 
 * Imports all 20 ZIP files from the Cozy Spring Asset Pack with automatic
 * category detection based on filename.
 * 
 * Usage:
 *   node scripts/batch-import-cozy-spring.mjs [inbox-dir]
 * 
 * Each ZIP will be extracted and imported to the appropriate category:
 * - Grass tiles, Soil tiles, Stone paths, Flower paths, Water → tilesets
 * - Trees, Bushes, Flowers, Fences, Bridges → props
 * - Decor items, Furniture, Lamps → props (decorations/furniture)
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, resolve, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const repoRoot = resolve(process.cwd());
const inboxDir = resolve(process.argv[2] ?? join(repoRoot, '.asset-inbox/cozy-spring'));
const outputRoot = join(repoRoot, 'apps/client-2d/public/2d-assets/cozy-spring');

// Category mapping based on filename patterns
const CATEGORY_MAP = {
  // Tilesets
  'grass tiles': { category: 'tilesets', biome: 'plains', tags: ['grass', 'tile', 'ground', 'spring', 'green'] },
  'soil and dirt tiles': { category: 'tilesets', biome: 'plains', tags: ['soil', 'dirt', 'tile', 'ground', 'brown'] },
  'stone paths': { category: 'tilesets', biome: 'plains', tags: ['stone', 'path', 'road', 'walkway'] },
  'flower paths': { category: 'tilesets', biome: 'plains', tags: ['flower', 'path', 'road', 'garden'] },
  'water and ponds': { category: 'tilesets', biome: 'coastal', tags: ['water', 'pond', 'lake', 'liquid'] },
  
  // Nature props
  'cherry blossom trees': { category: 'props', biome: 'forest', tags: ['tree', 'cherry', 'blossom', 'pink', 'spring'] },
  'trees (spring)': { category: 'props', biome: 'forest', tags: ['tree', 'spring', 'green', 'nature'] },
  'bushes and shrubs': { category: 'props', biome: 'forest', tags: ['bush', 'shrub', 'plant', 'green'] },
  'flowers and plants': { category: 'props', biome: 'forest', tags: ['flower', 'plant', 'garden', 'nature'] },
  'petals and ground details': { category: 'props', biome: 'plains', tags: ['petal', 'ground', 'detail', 'decoration'] },
  
  // Structures
  'fences and gates': { category: 'props', biome: 'plains', tags: ['fence', 'gate', 'barrier', 'wooden'] },
  'bridges and boardwalks': { category: 'props', biome: 'forest', tags: ['bridge', 'boardwalk', 'wood', 'structure'] },
  
  // Garden props
  'garden beds': { category: 'props', biome: 'plains', tags: ['garden', 'bed', 'planting', 'vegetable'] },
  'garden furniture': { category: 'props', biome: 'plains', tags: ['furniture', 'garden', 'bench', 'table'] },
  'benches and seating': { category: 'props', biome: 'plains', tags: ['bench', 'seat', 'furniture', 'rest'] },
  
  // Home/Decor props
  'lamps and lights': { category: 'props', biome: 'plains', tags: ['lamp', 'light', 'glow', 'decoration'] },
  'mailboxes and birdhouses': { category: 'props', biome: 'plains', tags: ['mailbox', 'birdhouse', 'house', 'bird'] },
  'pots and planters': { category: 'props', biome: 'plains', tags: ['pot', 'planter', 'flower', 'container'] },
  'decor and homey items': { category: 'props', biome: 'plains', tags: ['decor', 'home', 'decoration', 'cozy'] },
  'extra cozy details': { category: 'props', biome: 'plains', tags: ['detail', 'decoration', 'cozy', 'spring'] },
};

function normalizeName(filename) {
  return filename
    .toLowerCase()
    .replace(/\.zip$/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function findCategoryMapping(filename) {
  const normalized = normalizeName(filename);
  
  for (const [pattern, config] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return config;
    }
  }
  
  // Default fallback
  return { category: 'props', biome: 'plains', tags: ['cozy', 'spring', 'decoration'] };
}

function requireCommand(name) {
  const result = spawnSync(name, ['-v'], { encoding: 'utf8' });
  if (result.error) {
    console.error(`[BatchImport] Missing required command: ${name}`);
    process.exit(1);
  }
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

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function processZip(zipPath, config) {
  const zipName = basename(zipPath, '.zip');
  const normalizedName = normalizeName(zipName);
  
  console.log(`\n[BatchImport] Processing: ${zipName}`);
  console.log(`  Category: ${config.category}`);
  console.log(`  Biome: ${config.biome}`);
  console.log(`  Tags: ${config.tags.join(', ')}`);
  
  const tmpRoot = join(repoRoot, `.tmp/cozy-spring/${normalizedName}`);
  const destRoot = join(outputRoot, config.category, normalizedName);
  const filesRoot = join(destRoot, 'files');
  
  // Cleanup
  rmSync(tmpRoot, { recursive: true, force: true });
  mkdirSync(tmpRoot, { recursive: true });
  mkdirSync(filesRoot, { recursive: true });
  
  // Extract ZIP
  console.log(`  Extracting...`);
  const unzip = spawnSync('unzip', ['-q', zipPath, '-d', tmpRoot], { encoding: 'utf8' });
  if (unzip.status !== 0) {
    console.error(`  Error: unzip failed`);
    console.error(unzip.stderr || unzip.stdout);
    return false;
  }
  
  // Find PNG files
  const allFiles = walk(tmpRoot);
  const pngFiles = allFiles.filter(f => extname(f).toLowerCase() === '.png');
  
  if (pngFiles.length === 0) {
    console.error(`  Warning: No PNG files found`);
    return false;
  }
  
  console.log(`  Found ${pngFiles.length} PNG files`);
  
  // Create entries
  const entries = {};
  const all = [];
  
  for (const file of pngFiles) {
    const rawRel = relative(tmpRoot, file);
    const safeRel = rawRel.replace(/[^a-zA-Z0-9._/-]+/g, '_').replace(/\/+/g, '/');
    const outPath = join(filesRoot, safeRel);
    
    mkdirSync(dirname(outPath), { recursive: true });
    
    // Copy file
    const content = readFileSync(file);
    
    // Determine sub-kind from path
    const kind = detectKind(file, config);
    
    const id = idFor(safeRel);
    const src = `/2d-assets/cozy-spring/${config.category}/${normalizedName}/files/${safeRel}`;
    const entry = {
      id,
      src,
      source: 'SakPix_Cozy_Spring',
      sourcePath: rawRel,
      sourceName: basename(file),
      license: 'purchased-itchio-sakpix',
      kind: kind,
      group: normalizedName,
      biome: config.biome,
      category: config.category,
      biomeTags: [config.biome, ...config.tags],
      cultureTags: ['cozy', 'spring'],
      tags: ['cozy-spring', config.category, ...config.tags, kind],
      bytes: content.length,
      sha256: sha256(content),
      deterministic: true,
    };
    
    if (entries[id]) {
      console.error(`  Warning: Duplicate ID ${id}`);
    }
    
    entries[id] = entry;
    all.push(id);
    writeFileSync(outPath, content);
  }
  
  // Create manifest
  const manifest = {
    version: 1,
    id: `cozy_spring_${normalizedName.replace(/\s+/g, '_')}`,
    source: 'SakPix_Cozy_Spring_Asset_Pack',
    category: config.category,
    biome: config.biome,
    generatedAt: new Date().toISOString(),
    deterministic: true,
    expectedPngCount: pngFiles.length,
    pngCount: pngFiles.length,
    basePath: `/2d-assets/cozy-spring/${config.category}/${normalizedName}`,
    entries,
    all,
    validation: {
      noPngOmitted: true,
      importedPngCount: pngFiles.length,
      manifestEntryCount: Object.keys(entries).length,
    },
  };
  
  writeFileSync(join(destRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  
  console.log(`  Created ${Object.keys(entries).length} entries`);
  console.log(`  Output: ${destRoot}`);
  
  // Cleanup tmp
  rmSync(tmpRoot, { recursive: true, force: true });
  
  return true;
}

function detectKind(filePath, config) {
  const lower = filePath.toLowerCase();
  
  // Path-based detection
  if (lower.includes('tile')) return 'tile';
  if (lower.includes('ground')) return 'tile';
  if (lower.includes('path')) return 'path';
  if (lower.includes('tree')) return 'tree';
  if (lower.includes('bush')) return 'bush';
  if (lower.includes('flower')) return 'flower';
  if (lower.includes('fence')) return 'fence';
  if (lower.includes('bridge')) return 'bridge';
  if (lower.includes('bench')) return 'bench';
  if (lower.includes('lamp')) return 'lamp';
  if (lower.includes('pot')) return 'pot';
  if (lower.includes('water')) return 'water';
  if (lower.includes('pond')) return 'water';
  if (lower.includes('mailbox')) return 'mailbox';
  if (lower.includes('birdhouse')) return 'birdhouse';
  if (lower.includes('furniture')) return 'furniture';
  if (lower.includes('garden')) return 'garden';
  if (lower.includes('detail')) return 'detail';
  
  // Default to category
  return config.category === 'tilesets' ? 'tile' : 'prop';
}

function main() {
  console.log('=== Cozy Spring Asset Pack - Batch Import ===');
  console.log(`Inbox: ${inboxDir}`);
  console.log(`Output: ${outputRoot}`);
  console.log('');
  
  requireCommand('unzip');
  
  // Ensure inbox exists
  if (!existsSync(inboxDir)) {
    console.error(`[BatchImport] Inbox directory not found: ${inboxDir}`);
    console.error('Please create the directory and place ZIP files inside.');
    process.exit(1);
  }
  
  // Find all ZIP files
  const zipFiles = readdirSync(inboxDir)
    .filter(f => f.toLowerCase().endsWith('.zip'))
    .map(f => join(inboxDir, f))
    .sort();
  
  if (zipFiles.length === 0) {
    console.error('[BatchImport] No ZIP files found in inbox');
    process.exit(1);
  }
  
  console.log(`Found ${zipFiles.length} ZIP files\n`);
  
  // Create output directory
  mkdirSync(outputRoot, { recursive: true });
  
  // Process each ZIP
  const results = { success: 0, failed: 0, skipped: 0 };
  
  for (const zipPath of zipFiles) {
    const zipName = basename(zipPath);
    const config = findCategoryMapping(zipName);
    
    try {
      const success = processZip(zipPath, config);
      if (success) {
        results.success++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.error(`  Error: ${error.message}`);
      results.failed++;
    }
  }
  
  // Create master manifest
  console.log('\n=== Creating Master Manifest ===');
  
  const masterEntries = {};
  const categories = { tilesets: {}, props: {} };
  
  // Scan output directory for manifests
  function scanForManifests(dir, cat) {
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      const st = statSync(fullPath);
      
      if (st.isDirectory()) {
        const manifestPath = join(fullPath, 'manifest.json');
        if (existsSync(manifestPath)) {
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
          const groupName = basename(fullPath);
          
          for (const [id, entry] of Object.entries(manifest.entries)) {
            masterEntries[id] = entry;
          }
          
          categories[cat][groupName] = {
            count: Object.keys(manifest.entries).length,
            biome: manifest.biome,
          };
        }
        scanForManifests(fullPath, cat);
      }
    }
  }
  
  if (existsSync(join(outputRoot, 'tilesets'))) {
    scanForManifests(join(outputRoot, 'tilesets'), 'tilesets');
  }
  if (existsSync(join(outputRoot, 'props'))) {
    scanForManifests(join(outputRoot, 'props'), 'props');
  }
  
  const masterManifest = {
    version: 1,
    id: 'cozy_spring_master',
    source: 'SakPix_Cozy_Spring_Asset_Pack',
    generatedAt: new Date().toISOString(),
    totalEntries: Object.keys(masterEntries).length,
    categories,
    entries: masterEntries,
  };
  
  writeFileSync(join(outputRoot, 'manifest.json'), JSON.stringify(masterManifest, null, 2) + '\n');
  
  // Create README
  const readme = `# Cozy Spring Asset Pack

Imported by \`scripts/batch-import-cozy-spring.mjs\`.

**Source:** [SakPix on itch.io](https://sakpix.itch.io/cozy-spring-asset-pack-top-down-pixel-art-tileset-300-assets)

**Contents:**
${Object.entries(categories).map(([cat, groups]) => 
  `\n### ${cat}\n` + 
  Object.entries(groups).map(([name, info]) => 
    `- ${name}: ${info.count} assets (${info.biome})`
  ).join('\n')
).join('\n')}

**Total Assets:** ${Object.keys(masterEntries).length}

**License:** Purchased from itch.io - SakPix
`;
  
  writeFileSync(join(outputRoot, 'README.md'), readme);
  
  console.log('\n=== Summary ===');
  console.log(`Processed: ${results.success + results.failed}/${zipFiles.length}`);
  console.log(`Success: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`\nTotal assets imported: ${Object.keys(masterEntries).length}`);
  console.log(`Output: ${outputRoot}`);
  
  // Now run auto-tagging
  console.log('\n=== Running Auto-Tagging ===');
  
  const autoTagResult = spawnSync('node', [
    join(repoRoot, 'scripts/auto-tag-manifest.mjs'),
    '--source=SakPix'
  ], { encoding: 'utf8', cwd: repoRoot });
  
  console.log(autoTagResult.stdout || autoTagResult.stderr);
}

main();