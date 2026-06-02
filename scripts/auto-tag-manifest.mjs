#!/usr/bin/env node
/**
 * Auto-Tag Manifest Script
 * 
 * Automatically tags new assets with semantic tags, maintains fallback mappings,
 * and cleans duplicate entries.
 * 
 * Usage:
 *   node scripts/auto-tag-manifest.mjs                    # Tag all manifest files
 *   node scripts/auto-tag-manifest.mjs --dry-run          # Preview changes without applying
 *   node scripts/auto-tag-manifest.mjs --source=GraphicRiver  # Tag specific source
 *   node scripts/auto-tag-manifest.mjs --pattern="tower"  # Tag assets matching pattern
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';

// Pattern mappings for semantic tagging
const PATTERN_TAGGING_RULES = {
  // Building patterns
  tower: ['tower', 'defensive', 'military', 'tall'],
  castle: ['castle', 'fort', 'defensive', 'royal'],
  house: ['house', 'residential', 'home', 'dwelling'],
  inn: ['inn', 'tavern', 'social', 'hospitality'],
  blacksmith: ['blacksmith', 'craft', 'forge', 'workshop'],
  workshop: ['workshop', 'craft', 'production'],
  warehouse: ['warehouse', 'storage', 'logistics'],
  guard_post: ['guard_post', 'military', 'security'],
  church: ['church', 'religious', 'spiritual'],
  
  // NPC patterns
  guard: ['guard', 'soldier', 'military', 'security'],
  soldier: ['soldier', 'military', 'warrior'],
  merchant: ['merchant', 'trader', 'commerce', 'shopkeeper'],
  healer: ['healer', 'priest', 'medical', 'support'],
  blacksmith_npc: ['blacksmith', 'craftsman', 'worker'],
  noble: ['noble', 'lord', 'royal', 'aristocrat'],
  farmer: ['farmer', 'agriculture', 'worker'],
  child: ['child', 'young', 'civilian'],
  
  // Prop patterns
  tree: ['tree', 'nature', 'vegetation', 'forest'],
  rock: ['rock', 'stone', 'mineral', 'geology'],
  bush: ['bush', 'shrub', 'vegetation'],
  flower: ['flower', 'plant', 'beauty'],
  chest: ['chest', 'container', 'treasure'],
  well: ['well', 'water', 'resource'],
  fence: ['fence', 'barrier', 'boundary'],
  sign: ['sign', 'marker', 'information'],
  
  // Biome patterns
  snow: ['snow', 'winter', 'frozen', 'cold'],
  swamp: ['swamp', 'wetland', 'marsh', 'mud'],
  desert: ['desert', 'arid', 'sand', 'dry'],
  mountain: ['mountain', 'alpine', 'highland', 'rocky'],
  coastal: ['coastal', 'beach', 'shore', 'ocean'],
  forest: ['forest', 'woodland', 'green', 'nature'],
  
  // Style patterns
  isometric: ['isometric', 'iso', '2d', 'pixel'],
  lowpoly: ['lowpoly', 'low-poly', '3d'],
  medieval: ['medieval', 'fantasy', 'historical'],
};

// Fallback chain mappings for GraphicRiver-style asset IDs
const GRAPHICRIVER_FALLBACK_MAP = {
  'tower': ['tower', 'military_tower', 'defensive', 'building', 'house'],
  'cannon_tower': ['cannon_tower', 'tower', 'military_tower', 'defensive', 'building'],
  'house': ['house', 'residential', 'hut', 'building'],
  'inn': ['inn', 'tavern', 'social', 'house'],
  'blacksmith': ['blacksmith', 'forge', 'workshop', 'building'],
  'merchant': ['merchant', 'trader', 'shop', 'npc'],
  'guard': ['guard', 'soldier', 'warrior', 'npc'],
  'soldier': ['soldier', 'military', 'warrior', 'npc'],
};

// Source-specific tag enrichments
const SOURCE_TAG_ENRICHMENTS = {
  'GraphicRiver': ['isometric', 'pixel-art', 'game-ready'],
  'Kenney': ['public-domain', 'free', 'open-source'],
  'Pipoya': ['character', 'sprite', 'animated'],
  'AssetPack01': ['forest', 'biome', 'nature'],
};

/**
 * Generate semantic tags from file path
 */
function extractTagsFromPath(filePath) {
  const fileName = basename(filePath, extname(filePath)).toLowerCase();
  const parts = fileName.split(/[_\-,\s]+/);
  const tags = new Set();
  
  // Add extracted pattern tags
  for (const [pattern, patternTags] of Object.entries(PATTERN_TAGGING_RULES)) {
    if (fileName.includes(pattern)) {
      patternTags.forEach(t => tags.add(t));
    }
    // Also check individual parts
    parts.forEach(part => {
      if (part.includes(pattern)) {
        patternTags.forEach(t => tags.add(t));
      }
    });
  }
  
  // Add file name parts as tags
  parts.forEach(part => {
    if (part.length > 2) {
      tags.add(part);
    }
  });
  
  // Check for GraphicRiver-style patterns
  const grMatch = fileName.match(/gr_iso_(\d)_([\w]+)_([\w]+)/);
  if (grMatch) {
    tags.add('graphicriver');
    tags.add('isometric');
    // Extract category from filename
    if (grMatch[2]) tags.add(grMatch[2]);
    if (grMatch[3]) tags.add(grMatch[3]);
  }
  
  return Array.from(tags);
}

/**
 * Generate ID from file path
 */
function generateId(filePath) {
  return basename(filePath, extname(filePath))
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

/**
 * Calculate content hash
 */
function contentHash(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * Check for duplicate entries in manifest
 */
function findDuplicates(entries) {
  const hashMap = new Map();
  const duplicates = [];
  
  for (const [id, entry] of Object.entries(entries)) {
    if (entry.sha256) {
      if (hashMap.has(entry.sha256)) {
        duplicates.push({
          original: hashMap.get(entry.sha256),
          duplicate: id,
          entry
        });
      } else {
        hashMap.set(entry.sha256, id);
      }
    }
  }
  
  return duplicates;
}

/**
 * Find assets missing semantic tags
 */
function findUntaggedAssets(entries) {
  const untagged = [];
  
  for (const [id, entry] of Object.entries(entries)) {
    const tags = entry.tags ?? [];
    const hasSemanticTags = tags.some(t => 
      PATTERN_TAGGING_RULES[t] || 
      ['building', 'npc', 'prop', 'tile'].includes(t)
    );
    
    if (!hasSemanticTags && tags.length < 3) {
      untagged.push({ id, entry });
    }
  }
  
  return untagged;
}

/**
 * Auto-tag assets in a manifest file
 */
function tagManifest(manifest, options = {}) {
  const { dryRun = false, enrichSource = null } = options;
  const updates = [];
  const removals = [];
  
  // Find duplicates
  const duplicates = findDuplicates(manifest.entries ?? manifest);
  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate entries`);
    
    for (const dupe of duplicates) {
      if (!dryRun) {
        removals.push(dupe.duplicate);
      }
      updates.push({
        type: 'duplicate',
        id: dupe.duplicate,
        kept: dupe.original
      });
    }
  }
  
  // Find untagged assets
  const untagged = findUntaggedAssets(manifest.entries ?? manifest);
  if (untagged.length > 0) {
    console.log(`Found ${untagged.length} untagged entries`);
    
    for (const asset of untagged) {
      const autoTags = extractTagsFromPath(asset.entry.sourcePath || asset.id);
      const enrichedTags = [...new Set([...asset.entry.tags, ...autoTags])];
      
      // Add source-specific enrichment
      if (asset.entry.source && SOURCE_TAG_ENRICHMENTS[asset.entry.source]) {
        enrichedTags.push(...SOURCE_TAG_ENRICHMENTS[asset.entry.source]);
      }
      
      if (!dryRun) {
        if (manifest.entries) {
          manifest.entries[asset.id].tags = enrichedTags;
        } else {
          manifest[asset.id].tags = enrichedTags;
        }
      }
      
      updates.push({
        type: 'tagged',
        id: asset.id,
        newTags: enrichedTags
      });
    }
  }
  
  return { manifest, updates, removals, duplicates, untagged };
}

/**
 * Process all manifest files in a directory
 */
function processDirectory(dirPath, options = {}) {
  const manifestFiles = [];
  
  function scanDir(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (entry === 'manifest.json') {
        manifestFiles.push(fullPath);
      }
    }
  }
  
  scanDir(dirPath);
  return manifestFiles;
}

/**
 * Main CLI
 */
function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    source: args.find(a => a.startsWith('--source='))?.split('=')[1],
    pattern: args.find(a => a.startsWith('--pattern='))?.split('=')[1],
  };
  
  const repoRoot = resolve(process.cwd());
  const assetDirs = [
    join(repoRoot, 'apps/client-2d/public/assets'),
    join(repoRoot, 'public/assets'),
  ];
  
  console.log('=== Auto-Tag Manifest Script ===');
  console.log(`Mode: ${options.dryRun ? 'DRY-RUN (no changes will be written)' : 'LIVE (changes will be applied)'}`);
  console.log('');
  
  for (const assetDir of assetDirs) {
    if (!existsSync(assetDir)) {
      console.log(`Skipping non-existent directory: ${assetDir}`);
      continue;
    }
    
    console.log(`Scanning: ${assetDir}`);
    const manifestFiles = processDirectory(assetDir, options);
    
    for (const manifestPath of manifestFiles) {
      console.log(`\nProcessing: ${manifestPath}`);
      
      try {
        const manifestStr = readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestStr);
        
        const result = tagManifest(manifest, options);
        
        console.log(`  - Duplicates found: ${result.duplicates.length}`);
        console.log(`  - Assets tagged: ${result.updates.filter(u => u.type === 'tagged').length}`);
        
        if (result.updates.length > 0) {
          console.log('  Updates:');
          for (const update of result.updates.slice(0, 5)) {
            console.log(`    - [${update.type}] ${update.id}`);
            if (update.newTags) {
              console.log(`      Tags: ${update.newTags.join(', ')}`);
            }
          }
          if (result.updates.length > 5) {
            console.log(`    ... and ${result.updates.length - 5} more`);
          }
        }
        
        if (!options.dryRun && result.updates.length > 0) {
          writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
          console.log(`  Written: ${manifestPath}`);
        }
        
      } catch (error) {
        console.error(`  Error processing: ${error.message}`);
      }
    }
  }
  
  console.log('\n=== Complete ===');
  if (options.dryRun) {
    console.log('This was a dry run. Run without --dry-run to apply changes.');
  }
}

// Export for programmatic use
export { extractTagsFromPath, generateId, tagManifest, findDuplicates, findUntaggedAssets };

// Run if executed directly
main();