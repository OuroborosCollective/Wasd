#!/usr/bin/env node
/**
 * NPC Sprite Auto-Crop Script
 * 
 * Processes Stitch-generated NPC character sprites to:
 * 1. Remove backgrounds (make transparent)
 * 2. Crop to minimal bounding box
 * 3. Generate flow-ready sprites for UI
 * 
 * Usage:
 *   node scripts/crop-npc-sprites.mjs [--dry-run]
 */

import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Include both main characters dir and frames subdirectories
const INPUT_DIRS = [
  join(root, 'apps/client-2d/public/2d-assets/game-assets/models/characters'),
  join(root, 'apps/client-2d/public/2d-assets/game-assets/models/characters/warrior_human_male_frames')
];
const OUTPUT_DIR = join(root, 'apps/client-2d/public/2d-assets/game-assets/models/npc-flow');
const MANIFEST_PATH = join(root, 'apps/client-2d/public/2d-assets/game-assets/npc-flow-manifest.json');

// Background color detection - dark fantasy palette corners
// These are typically the darkest corners of Stitch-generated images
const BG_THRESHOLD_DARK = 50; // Pixels darker than this and near edges are likely background
const BG_THRESHOLD_LIGHT = 200; // Pixels lighter than this and near edges are likely background

function isLikelyBackground(x, y, width, height, r, g, b) {
  // Check if pixel is in corner regions (likely background)
  const cornerSize = Math.min(width, height) * 0.15;
  const isCorner = (
    (x < cornerSize && y < cornerSize) ||  // top-left
    (x > width - cornerSize && y < cornerSize) ||  // top-right
    (x < cornerSize && y > height - cornerSize) ||  // bottom-left
    (x > width - cornerSize && y > height - cornerSize)  // bottom-right
  );
  
  // Also check edge proximity
  const edgeDist = Math.min(x, y, width - x, height - y);
  const isEdge = edgeDist < 20;
  
  // Light background (common in Stitch outputs - light gray/white)
  const isLightBackground = isCorner && r > BG_THRESHOLD_LIGHT && g > BG_THRESHOLD_LIGHT && b > BG_THRESHOLD_LIGHT;
  
  // Dark background (classic dark fantasy)
  const isDarkBackground = isCorner && r < BG_THRESHOLD_DARK && g < BG_THRESHOLD_DARK && b < BG_THRESHOLD_DARK + 20;
  
  return isCorner && (isLightBackground || isDarkBackground);
}

async function findBounds(imageBuffer, width, height) {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let bgColor = { r: 0, g: 0, b: 0 };
  let bgCount = 0;
  
  // First pass: determine background color from corners
  for (let y = 0; y < Math.min(50, height); y++) {
    for (let x = 0; x < Math.min(50, width); x++) {
      const idx = (y * width + x) * 3;
      bgColor.r += imageBuffer[idx];
      bgColor.g += imageBuffer[idx + 1];
      bgColor.b += imageBuffer[idx + 2];
      bgCount++;
    }
  }
  bgColor.r = Math.round(bgColor.r / bgCount);
  bgColor.g = Math.round(bgColor.g / bgCount);
  bgColor.b = Math.round(bgColor.b / bgCount);
  
  console.log(`  Detected background color: RGB(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`);
  
  // Second pass: find content bounds using alpha channel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const r = imageBuffer[idx];
      const g = imageBuffer[idx + 1];
      const b = imageBuffer[idx + 2];
      
      // Content pixel: significantly different from background
      const diffFromBg = Math.abs(r - bgColor.r) + Math.abs(g - bgColor.g) + Math.abs(b - bgColor.b);
      
      // For light backgrounds (common in Stitch), content is DARKER
      // For dark backgrounds, content is LIGHTER
      const isLightBg = bgColor.r > 180;
      const hasSignificantDifference = isLightBg 
        ? diffFromBg > 40 && r < bgColor.r - 20  // Darker than light background
        : diffFromBg > 30;  // Different from dark background
      
      if (!isLikelyBackground(x, y, width, height, r, g, b) && hasSignificantDifference) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  return { minX, minY, maxX, maxY, bgColor, width, height };
}

function isBackgroundPixel(x, y, width, height, r, g, b, bgColor) {
  const isLightBg = bgColor.r > 180;
  const diffFromBg = Math.abs(r - bgColor.r) + Math.abs(g - bgColor.g) + Math.abs(b - bgColor.b);
  if (isLightBg) {
    return diffFromBg < 30;
  } else {
    return diffFromBg < 20;
  }
}

function createRgbaBuffer(rgbBuffer, width, height, bounds) {
  const rgbaBuffer = Buffer.alloc(width * height * 4);
  const { bgColor } = bounds;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgbIdx = (y * width + x) * 3;
      const rgbaIdx = (y * width + x) * 4;
      const r = rgbBuffer[rgbIdx];
      const g = rgbBuffer[rgbIdx + 1];
      const b = rgbBuffer[rgbIdx + 2];
      const alpha = isBackgroundPixel(x, y, width, height, r, g, b, bgColor) ? 0 : 255;
      rgbaBuffer[rgbaIdx] = r;
      rgbaBuffer[rgbaIdx + 1] = g;
      rgbaBuffer[rgbaIdx + 2] = b;
      rgbaBuffer[rgbaIdx + 3] = alpha;
    }
  }
  return rgbaBuffer;
}

async function processSprite(inputPath, outputPath, spriteName) {
  console.log(`Processing: ${spriteName}`);
  
  // Read image as RGB raw data
  const { data: imageBuffer, info } = await sharp(inputPath)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const bounds = await findBounds(imageBuffer, info.width, info.height);
  
  if (bounds.maxX === 0 || bounds.maxY === 0) {
    console.log(`  ⚠️ No content found, skipping`);
    return null;
  }
  
  // Add padding
  const padding = 10;
  const cropLeft = Math.max(0, bounds.minX - padding);
  const cropTop = Math.max(0, bounds.minY - padding);
  const cropWidth = Math.min(info.width - cropLeft, bounds.maxX - bounds.minX + padding * 2);
  const cropHeight = Math.min(info.height - cropTop, bounds.maxY - bounds.minY + padding * 2);
  
  if (dryRun) {
    console.log(`  🧪 [DRY RUN] Would crop to ${cropWidth}x${cropHeight} at (${cropLeft}, ${cropTop})`);
    return { name: spriteName, bounds, crop: { left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight } };
  }
  
  // Extract the region and add alpha channel
  // First make background transparent, then crop
  // Create RGBA buffer with alpha channel (background = transparent)
  const rgbaBuffer = createRgbaBuffer(imageBuffer, info.width, info.height, bounds);

  // Create output PNG with transparency
  await sharp(rgbaBuffer, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  
  console.log(`  ✅ Cropped to ${cropWidth}x${cropHeight}`);
  return { name: spriteName, bounds, crop: { left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight } };
}

async function main() {
  console.log('🎨 NPC Sprite Auto-Crop Script');
  console.log('==============================');
  
  if (!existsSync(INPUT_DIR)) {
    console.error(`❌ Input directory not found: ${INPUT_DIR}`);
    process.exit(1);
  }
  
  if (!dryRun) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Collect all sprite files from all input directories
  const files = [];
  for (const inputDir of INPUT_DIRS) {
    if (existsSync(inputDir)) {
      const dirFiles = readdirSync(inputDir)
        .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
        .filter(f => !f.includes('_flow') && !f.includes('_cropped'))
        .filter(f => {
          const baseName = basename(f, extname(f));
          if (baseName.startsWith('stitch_') || baseName.includes('atlas')) {
            return false;
          }
          const parts = baseName.split('_');
          return parts.length >= 5;
        });
      files.push(...dirFiles.map(f => ({ dir: inputDir, file: f })));
    }
  }
  
  console.log(`Found ${files.length} sprites to process\n`);
  
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'Stitch-generated NPC sprites',
    processedAt: new Date().toISOString(),
    sprites: [],
    stats: {
      total: files.length,
      processed: 0,
      skipped: 0,
      errors: 0
    }
  };
  
  for (const file of files) {
    const inputPath = join(file.dir, file.file);
    const baseName = basename(file.file, extname(file.file));
    const outputName = `${baseName}_flow.png`;
    const outputPath = join(OUTPUT_DIR, outputName);
    
    try {
      const result = await processSprite(inputPath, outputPath, baseName);
      if (result) {
        manifest.sprites.push({
          id: baseName,
          original: `/2d-assets/game-assets/models/characters/${file}`,
          flow: `/2d-assets/game-assets/models/npc-flow/${outputName}`,
          ...result
        });
        manifest.stats.processed++;
      } else {
        manifest.stats.skipped++;
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${file}: ${error.message}`);
      manifest.stats.errors++;
    }
  }
  
  if (!dryRun) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`\n📋 Manifest saved to: ${MANIFEST_PATH}`);
  }
  
  console.log('\n📊 Stats:');
  console.log(`  Total: ${manifest.stats.total}`);
  console.log(`  Processed: ${manifest.stats.processed}`);
  console.log(`  Skipped: ${manifest.stats.skipped}`);
  console.log(`  Errors: ${manifest.stats.errors}`);
  
  if (dryRun) {
    console.log('\n🧪 DRY RUN - No files were actually processed');
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});