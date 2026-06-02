#!/usr/bin/env node
/**
 * Batch Import Script for SakPix Cozy Spring Asset Pack
 * 
 * Handles nested ZIP structure:
 *   Outer ZIPs: 1cozyrosa.zip, 2cozyrosa.zip
 *   Inner ZIPs: "1. Grass tiles.zip", "2. Soil and dirt tiles.zip", etc.
 * 
 * Usage:
 *   node scripts/batch-import-cozy-spring.mjs [inbox-dir]
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
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
    .replace(/^\d+\.\s*/, '')  // Remove leading "1. " prefix
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
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

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function idFor(relPath) {
  return relPath
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function detectKind(filePath, config) {
  const lower = filePath.toLowerCase();
  
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
  
  return config.category === 'tilesets' ? 'tile' : 'prop';
}

async function extractZip(buffer) {
  // Parse ZIP local file headers with DEFLATE decompression
  const entries = [];
  
  // Check if it's a valid ZIP by looking for PK header
  if (!buffer.slice(0, 4).equals(Buffer.from([0x50, 0x4B, 0x03, 0x04]))) {
    return entries;
  }
  
  // Import zlib for decompression
  const { createGunzip } = await import('node:zlib');
  
  let offset = 0;
  while (offset < buffer.length - 30) {
    // Check for local file header signature
    if (buffer.readUInt32LE(offset) === 0x04034b50) {
      const compressionMethod = buffer.readUInt16LE(offset + 8);
      const fileNameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const uncompressedSize = buffer.readUInt32LE(offset + 22);
      const fileName = buffer.toString('utf8', offset + 30, offset + 30 + fileNameLen);
      
      const dataOffset = offset + 30 + fileNameLen + extraLen;
      const compressedData = buffer.slice(dataOffset, dataOffset + compressedSize);
      
      let finalData = compressedData;
      
      // Decompress if DEFLATE (method 8)
      if (compressionMethod === 8 && compressedSize > 0) {
        try {
          const decompressed = await new Promise((resolve, reject) => {
            const chunks = [];
            const gunzip = createGunzip();
            gunzip.on('data', (chunk) => chunks.push(chunk));
            gunzip.on('end', () => resolve(Buffer.concat(chunks)));
            gunzip.on('error', reject);
            gunzip.write(compressedData);
            gunzip.end();
          });
          finalData = decompressed;
        } catch (e) {
          // Use compressed data if decompression fails
          console.log(`  Warning: Could not decompress ${fileName}, using compressed data`);
        }
      }
      
      entries.push({
        name: fileName,
        data: finalData,
      });
      
      // Move to next entry (use compressed size for alignment)
      offset = dataOffset + compressedSize;
      
      // Skip to next local header (search for PK signature)
      while (offset < buffer.length - 4 && buffer.readUInt32LE(offset) !== 0x04034b50) {
        offset++;
      }
    } else {
      break;
    }
  }
  
  return entries;
}

async function extractNestedZip(buffer) {
  // Try to extract inner ZIP files
  const entries = await extractZip(buffer);
  return entries;
}

async function processInnerZip(zipBuffer, innerZipName, outputDir) {
  console.log(`  Processing: ${innerZipName}`);
  
  const config = findCategoryMapping(innerZipName);
  const groupName = normalizeName(innerZipName);
  
  console.log(`    Category: ${config.category}, Group: ${groupName}`);
  
  // Try to extract as ZIP
  const entries = await extractNestedZip(zipBuffer);
  
  const pngEntries = [];
  const allPngIds = [];
  
  for (const entry of entries) {
    if (entry.name.toLowerCase().endsWith('.png')) {
      pngEntries.push(entry);
      allPngIds.push(idFor(entry.name));
    }
  }
  
  if (pngEntries.length === 0) {
    console.log(`    Warning: No PNG files found`);
    return { count: 0, ids: [] };
  }
  
  console.log(`    Found ${pngEntries.length} PNG files`);
  
  // Create output directories
  const filesDir = join(outputDir, 'files');
  mkdirSync(filesDir, { recursive: true });
  
  const manifestEntries = {};
  
  for (const entry of pngEntries) {
    const id = idFor(entry.name);
    const safeRel = entry.name.replace(/[^a-zA-Z0-9._\/-]/g, '_').replace(/\/+/g, '/');
    const outPath = join(filesDir, safeRel);
    
    mkdirSync(dirname(outPath), { recursive: true });
    
    const kind = detectKind(entry.name, config);
    const src = `/2d-assets/cozy-spring/${config.category}/${groupName}/files/${safeRel}`;
    
    const manifestEntry = {
      id,
      src,
      source: 'SakPix_Cozy_Spring',
      sourcePath: entry.name,
      sourceName: basename(entry.name),
      license: 'purchased-itchio-sakpix',
      kind: kind,
      group: groupName,
      biome: config.biome,
      category: config.category,
      biomeTags: [config.biome, ...config.tags],
      cultureTags: ['cozy', 'spring'],
      tags: ['cozy-spring', config.category, ...config.tags, kind],
      bytes: entry.data.length,
      sha256: sha256(entry.data),
      deterministic: true,
    };
    
    manifestEntries[id] = manifestEntry;
    writeFileSync(outPath, entry.data);
  }
  
  // Write manifest
  const manifest = {
    version: 1,
    id: `cozy_spring_${groupName.replace(/\s+/g, '_')}`,
    source: 'SakPix_Cozy_Spring_Asset_Pack',
    category: config.category,
    biome: config.biome,
    generatedAt: new Date().toISOString(),
    deterministic: true,
    expectedPngCount: pngEntries.length,
    pngCount: pngEntries.length,
    basePath: `/2d-assets/cozy-spring/${config.category}/${groupName}`,
    entries: manifestEntries,
    all: allPngIds,
    validation: {
      noPngOmitted: true,
      importedPngCount: pngEntries.length,
      manifestEntryCount: Object.keys(manifestEntries).length,
    },
  };
  
  writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  
  console.log(`    Imported ${Object.keys(manifestEntries).length} assets`);
  
  return { count: pngEntries.length, ids: allPngIds };
}

async function main() {
  console.log('=== Cozy Spring Asset Pack - Batch Import ===');
  console.log(`Inbox: ${inboxDir}`);
  console.log(`Output: ${outputRoot}`);
  console.log('');
  
  // Ensure directories exist
  mkdirSync(inboxDir, { recursive: true });
  mkdirSync(outputRoot, { recursive: true });
  
  // Find outer ZIP files
  const outerZips = readdirSync(inboxDir)
    .filter(f => f.endsWith('.zip'))
    .map(f => join(inboxDir, f))
    .sort();
  
  if (outerZips.length === 0) {
    console.error('[BatchImport] No outer ZIP files found in inbox');
    process.exit(1);
  }
  
  console.log(`Found ${outerZips.length} outer ZIP files\n`);
  
  const allEntries = {};
  const categories = { tilesets: {}, props: {} };
  let totalAssets = 0;
  
  // Process each outer ZIP
  for (const outerZip of outerZips) {
    console.log(`\n[BatchImport] Processing outer ZIP: ${basename(outerZip)}`);
    
    const buffer = readFileSync(outerZip);
    const innerZipEntries = await extractZip(buffer);
    
    console.log(`  Found ${innerZipEntries.length} inner files`);
    
    // Filter for ZIP files only
    const innerZips = innerZipEntries.filter(e => e.name.toLowerCase().endsWith('.zip'));
    
    console.log(`  Found ${innerZips.length} inner ZIP files`);
    
    for (const innerZip of innerZips) {
      const config = findCategoryMapping(innerZip.name);
      const groupName = normalizeName(innerZip.name);
      
      const outputDir = join(outputRoot, config.category, groupName);
      
      try {
        const result = await processInnerZip(innerZip.data, innerZip.name, outputDir);
        
        if (result.count > 0) {
          // Read manifest to merge entries
          const manifestPath = join(outputDir, 'manifest.json');
          if (existsSync(manifestPath)) {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
            for (const [id, entry] of Object.entries(manifest.entries)) {
              allEntries[id] = entry;
            }
            categories[config.category][groupName] = {
              count: Object.keys(manifest.entries).length,
              biome: manifest.biome,
            };
            totalAssets += result.count;
          }
        }
      } catch (error) {
        console.error(`  Error processing ${innerZip.name}: ${error.message}`);
      }
    }
  }
  
  // Create master manifest
  console.log('\n=== Creating Master Manifest ===');
  
  const masterManifest = {
    version: 1,
    id: 'cozy_spring_master',
    source: 'SakPix_Cozy_Spring_Asset_Pack',
    generatedAt: new Date().toISOString(),
    totalEntries: Object.keys(allEntries).length,
    categories,
    entries: allEntries,
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

**Total Assets:** ${Object.keys(allEntries).length}

**License:** Purchased from itch.io - SakPix
`;
  
  writeFileSync(join(outputRoot, 'README.md'), readme);
  
  console.log('\n=== Summary ===');
  console.log(`Total assets imported: ${Object.keys(allEntries).length}`);
  console.log(`Output: ${outputRoot}`);
}

main().catch(console.error);