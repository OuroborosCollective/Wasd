/**
 * AutoAssetDirector.mjs
 * 
 * Autonomous Asset Metadata Parser and Injector
 * 
 * Parses filenames into ontological tags and injects them into manifest.json files.
 * This enables the AutonomousResonanceRouter to perform dynamic asset binding
 * based on world state vectors instead of hardcoded IDs.
 * 
 * Usage:
 *   node scripts/AutoAssetDirector.mjs --input ./assets/raw/stitch/my_drop --output ./assets/runtime/stitch/my_drop
 *   node scripts/AutoAssetDirector.mjs --enrich-manifest ./apps/client-2d/public/2d-assets/stitch/manifest.json
 * 
 * File naming convention:
 *   {baseType}_{season?}_{decay?}_{culture?}_{biome?}_{environment?}.{ext}
 *   Example: tree_winter_decay_elf.png, wall_stone_ruined.png, npc_elven_forest_spring.png
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// TAG EXTRACTION (shared with AutonomousResonanceRouter)
// ============================================================================

const SEASON_KEYWORDS = ['winter', 'spring', 'summer', 'autumn', 'frost', 'bloom', 'snow'];
const DECAY_KEYWORDS = ['decay', 'ruined', 'broken', 'withered', 'destroyed', 'ancient', 'decayed'];
const CULTURE_KEYWORDS = ['elf', 'elven', 'human', 'dwarven', 'dwarf', 'orc', 'gothic', 'nordic', 'arcane', 'celtic', 'solar', 'void'];
const BIOME_KEYWORDS = ['forest', 'swamp', 'marsh', 'mountain', 'plains', 'desert', 'snow', 'cave', 'dungeon', 'coastal'];
const ENVIRONMENT_KEYWORDS = ['indoor', 'outdoor', 'underground', 'ruins', 'settlement', 'battlefield'];

/**
 * Extract ontological tags from filename
 */
function extractOntologicalTags(filename) {
  // Remove extension
  const baseName = filename.replace(/\.[^/.]+$/, "");
  // Split by underscore or hyphen
  const tokens = baseName.toLowerCase().split(/[_-]/);
  
  // Handle Stitch naming convention: stitch_{category}_{rest}
  // e.g., "stitch_enemy_undead_blade_walker" -> baseType = "enemy"
  let baseType = tokens[0] || "unknown";
  let isStitchAsset = false;
  
  if (baseType === 'stitch' && tokens.length > 1) {
    // Stitch asset - use second token as base type
    baseType = tokens[1];
    isStitchAsset = true;
  }
  
  // Find season
  let season = "neutral";
  for (const token of tokens) {
    if (token.includes('frost') || token.includes('winter') || token.includes('snow')) season = "winter";
    else if (token.includes('bloom') || token.includes('spring')) season = "spring";
    else if (token.includes('summer')) season = "summer";
    else if (token.includes('autumn') || token.includes('fall')) season = "autumn";
    else if (token.includes('swamp') || token.includes('marsh')) season = "wet"; // Swamp implies wet
  }
  
  // Find decay level
  let decay = "none";
  for (const token of tokens) {
    if (token.includes('ancient') || token.includes('ruined')) decay = "high";
    else if (token.includes('destroyed') || token.includes('broken') || token.includes('decay')) decay = "medium";
    else if (token.includes('withered')) decay = "low";
  }
  
  // Find culture
  let culture = "universal";
  for (const token of tokens) {
    if (token.includes('elf') || token.includes('elven')) culture = "elven";
    else if (token.includes('human')) culture = "human";
    else if (token.includes('dwarf') || token.includes('dwarven')) culture = "dwarven";
    else if (token.includes('orc')) culture = "orc";
    else if (token.includes('gothic') || token.includes('eldritch')) culture = "gothic";
    else if (token.includes('nordic')) culture = "nordic";
    else if (token.includes('arcane') || token.includes('magic')) culture = "arcane";
    else if (token.includes('celtic')) culture = "celtic";
    else if (token.includes('solar') || token.includes('light')) culture = "solar";
    else if (token.includes('void') || token.includes('dark')) culture = "void";
    else if (token.includes('cyber')) culture = "cyber";
    else if (token.includes('undead') || token.includes('undead')) culture = "undead";
    else if (token.includes('crystal')) culture = "crystal";
  }
  
  // Find biome
  let biome = undefined;
  for (const token of tokens) {
    if (token.includes('forest') || token.includes('wood')) biome = "forest";
    else if (token.includes('swamp') || token.includes('marsh')) biome = "swamp";
    else if (token.includes('mountain') || token.includes('rock')) biome = "mountain";
    else if (token.includes('desert') || token.includes('sand')) biome = "desert";
    else if (token.includes('snow') || token.includes('ice')) biome = "snow";
    else if (token.includes('cave') || token.includes('dungeon')) biome = "dungeon";
    else if (token.includes('plains') || token.includes('field')) biome = "plains";
    else if (token.includes('coast') || token.includes('beach')) biome = "coastal";
    else if (token.includes('cyber')) biome = "urban";
    else if (token.includes('eldritch') || token.includes('gothic')) biome = "dungeon";
  }
  
  // Find environment
  let environment = undefined;
  for (const token of tokens) {
    if (token.includes('indoor') || token.includes('inside')) environment = "indoor";
    else if (token.includes('ruin')) environment = "ruins";
    else if (token.includes('settlement') || token.includes('village')) environment = "settlement";
    else if (token.includes('battle')) environment = "battlefield";
  }
  
  // Find style/modifier
  const style = tokens.find(t => 
    ['modular', 'square', 'multi', 'assembled', 'catalog', 'sheet'].includes(t)
  ) || undefined;
  
  return {
    baseType,
    season,
    decay,
    culture,
    ...(biome && { biome }),
    ...(environment && { environment }),
    ...(style && { style }),
  };
}

// ============================================================================
// MANIFEST PROCESSING
// ============================================================================

/**
 * Process a manifest.json file and add resonance tags to each asset
 */
function enrichManifest(manifestPath) {
  console.log(`\n[AutoAssetDirector] Enriching manifest: ${manifestPath}`);
  
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    console.error(`  ❌ Failed to read manifest: ${err.message}`);
    return;
  }
  
  if (!manifest.assets || !Array.isArray(manifest.assets)) {
    console.warn('  ⚠️  No assets array found in manifest');
    return;
  }
  
  let enrichedCount = 0;
  
  for (const asset of manifest.assets) {
    // Use assetId or sourceFile to extract filename
    const filename = asset.assetId || asset.sourceFile || '';
    
    // Extract tags from filename
    const tags = extractOntologicalTags(filename);
    
    // Add resonance metadata to asset
    asset.resonanceTags = tags;
    
    // Add resonance score hints for debugging
    asset._debugFilename = filename;
    asset._debugTags = tags;
    
    enrichedCount++;
    
    console.log(`  ✅ ${asset.assetId}`);
    console.log(`     Tags: ${JSON.stringify(tags)}`);
  }
  
  // Write enriched manifest
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n  ✨ Enriched ${enrichedCount} assets in manifest`);
}

/**
 * Process all image files in a directory and generate a resonance manifest
 */
function processAssetDirectory(inputDir, outputDir) {
  console.log(`\n[AutoAssetDirector] Processing directory: ${inputDir}`);
  
  if (!statSync(inputDir).isDirectory()) {
    console.error(`  ❌ Input is not a directory: ${inputDir}`);
    return;
  }
  
  // Find all image files
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  const files = readdirSync(inputDir).filter(f => {
    const ext = extname(f).toLowerCase();
    return imageExtensions.includes(ext);
  });
  
  if (files.length === 0) {
    console.warn('  ⚠️  No image files found');
    return;
  }
  
  console.log(`  📁 Found ${files.length} image files`);
  
  // Process each file
  const assets = [];
  for (const file of files) {
    const filePath = join(inputDir, file);
    const tags = extractOntologicalTags(file);
    
    assets.push({
      assetId: file.replace(/\.[^/.]+$/, ""), // Remove extension
      filename: file,
      path: filePath,
      tags,
      size: statSync(filePath).size,
    });
    
    console.log(`  ✅ ${file}`);
    console.log(`     Tags: ${JSON.stringify(tags)}`);
  }
  
  // Generate resonance manifest
  const manifest = {
    schemaVersion: 1,
    generatedBy: 'AutoAssetDirector.mjs',
    generatedAt: new Date().toISOString(),
    totalAssets: assets.length,
    assets,
  };
  
  // Write manifest
  const manifestPath = join(outputDir || inputDir, 'resonance-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n  ✨ Generated resonance manifest: ${manifestPath}`);
  
  return manifest;
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function showHelp() {
  console.log(`
AutoAssetDirector.mjs - Autonomous Asset Metadata Parser

Usage:
  node scripts/AutoAssetDirector.mjs --enrich-manifest <path>
    Enrich an existing manifest.json with resonance tags

  node scripts/AutoAssetDirector.mjs --process-dir <input> [output]
    Process all images in a directory and generate resonance manifest

  node scripts/AutoAssetDirector.mjs --help
    Show this help message

Examples:
  node scripts/AutoAssetDirector.mjs --enrich-manifest ./apps/client-2d/public/2d-assets/stitch/manifest.json
  
  node scripts/AutoAssetDirector.mjs --process-dir ./assets/raw/stitch/my_drop ./assets/runtime/stitch/my_drop
  
  node scripts/AutoAssetDirector.mjs --process-dir ./assets/raw/stitch/my_drop
`);
}

// Parse arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (args.includes('--enrich-manifest')) {
  const manifestPath = args[args.indexOf('--enrich-manifest') + 1];
  if (!manifestPath) {
    console.error('❌ --enrich-manifest requires a path argument');
    process.exit(1);
  }
  enrichManifest(manifestPath);
} else if (args.includes('--process-dir')) {
  const inputIdx = args.indexOf('--process-dir');
  const inputDir = args[inputIdx + 1];
  const outputDir = args[inputIdx + 2];
  
  if (!inputDir) {
    console.error('❌ --process-dir requires an input directory');
    process.exit(1);
  }
  processAssetDirectory(inputDir, outputDir);
} else {
  console.log('AutoAssetDirector.mjs - Autonomous Asset Metadata Parser\n');
  showHelp();
  process.exit(0);
}

console.log('\n[AutoAssetDirector] Done!');