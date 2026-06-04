#!/usr/bin/env node
/**
 * import-stitch-shirts.mjs
 * 
 * Downloads and imports shirt/equipment overlay atlases from the Stitch project
 * into the Arelorian 2D client asset system with proper Cozy Asset Director integration.
 * 
 * Usage:
 *   node scripts/import-stitch-shirts.mjs [--dry-run]
 * 
 * Environment:
 *   STITCH_API_KEY - Stitch MCP API key (default: uses configured key)
 */

import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const STITCH_API_KEY = process.env.STITCH_API_KEY || '';
const STITCH_PROJECT_ID = '3680791926463184978';
const dryRun = process.argv.includes('--dry-run');

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const publicRoot = join(root, 'apps/client-2d/public/2d-assets');
const shirtsRoot = join(publicRoot, 'game-assets', 'shirts');
const manifestPath = join(publicRoot, 'game-assets', 'manifest.json');

const workRoot = join(tmpdir(), `wasd-shirts-import-${Date.now()}`);
const downloadRoot = join(workRoot, 'downloads');

function log(message, type = 'info') {
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
  console.log(`[StitchShirts] ${prefix} ${message}`);
}

async function stitchRequest(toolName, params = {}) {
  // Initialize first
  await fetch('https://stitch.googleapis.com/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': STITCH_API_KEY,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'wasd-stitch-importer', version: '1.0' },
      },
    }),
  });
  
  // Call tool
  const response = await fetch('https://stitch.googleapis.com/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': STITCH_API_KEY,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now() + 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params,
      },
    }),
  });
  
  const result = await response.json();
  if (result.error) {
    throw new Error(result.error.message || 'Stitch API error');
  }
  return JSON.parse(result.result.content[0].text);
}

function slug(input, max = 96) {
  return String(input || 'asset')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
    .slice(0, max) || 'asset';
}

function downloadFile(url, destPath) {
  try {
    sh('curl', ['-L', '--fail', '--retry', '3', '-o', destPath, url], { stdio: 'inherit' });
    return true;
  } catch (e) {
    log(`Failed to download: ${url}`, 'error');
    return false;
  }
}

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function createPixiJsAtlasJson(frames, imageName, options = {}) {
  const {
    atlasWidth = 1024,
    atlasHeight = 1024,
    frameWidth = 64,
    frameHeight = 64,
    gridCols = 16,
    gridRows = 16,
    anchorX = 0.5,
    anchorY = 0.85,
  } = options;

  const animations = {};
  const animationsOrder = ['idle', 'walk', 'run', 'attack', 'defend', 'die'];
  
  // Group frames by animation
  for (const [frameName, frameData] of Object.entries(frames)) {
    const parts = frameName.replace(/\.png$/i, '').split('_');
    if (parts.length >= 2) {
      const anim = parts[1]; // e.g., "idle", "walk"
      if (!animations[anim]) {
        animations[anim] = [];
      }
      animations[anim].push(frameName);
    }
  }

  return {
    frames: Object.fromEntries(
      Object.entries(frames).map(([name, frame]) => [
        name,
        {
          frame: {
            x: frame.x || 0,
            y: frame.y || 0,
            w: frame.w || frameWidth,
            h: frame.h || frameHeight,
          },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: frameWidth, h: frameHeight },
          sourceSize: { w: frameWidth, h: frameHeight },
        },
      ])
    ),
    animations,
    meta: {
      app: 'Areloria WASD - Cozy Asset Director',
      version: '1.0.0',
      image: imageName,
      format: 'RGBA8888',
      size: { w: atlasWidth, h: atlasHeight },
      scale: '1',
      category: 'shirts',
      frameSize: frameWidth,
      gridLayout: `${gridCols}x${gridRows}`,
      stitchProject: STITCH_PROJECT_ID,
      autoCropEnabled: true,
      overlay: true,
      anchorY,
      cropRules: {
        trimTransparentPixels: true,
        minimumCropArea: 8,
        preserveAspectRatio: true,
      },
    },
  };
}

async function main() {
  log('Starting Stitch shirt/equipment atlas import...');
  
  mkdirSync(shirtsRoot, { recursive: true });
  mkdirSync(downloadRoot, { recursive: true });
  
  // List screens from Stitch project
  log('Fetching screens from Stitch project...');
  const screens = await stitchRequest('list_screens', { projectId: STITCH_PROJECT_ID });
  
  // Define shirt types for auto-detection
  const shirtPatterns = [
    'armor', 'chainmail', 'plate', 'leather', 'robe', 'tunic', 
    'mail', 'scale', 'cloth', 'shirt', 'clothing', 'equipment_overlay'
  ];
  
  // Screen types to look for
  const targetTypes = [
    { name: 'Archer', category: 'shirts', pattern: 'archer' },
    { name: 'Bard', category: 'shirts', pattern: 'bard' },
    { name: 'Berserker', category: 'shirts', pattern: 'berserker' },
    { name: 'Cleric', category: 'shirts', pattern: 'cleric' },
    { name: 'Mage', category: 'shirts', pattern: 'mage' },
    { name: 'Necromancer', category: 'shirts', pattern: 'necromancer' },
    { name: 'Paladin', category: 'shirts', pattern: 'paladin' },
    { name: 'Ranger', category: 'shirts', pattern: 'ranger' },
    { name: 'Rogue', category: 'shirts', pattern: 'rogue' },
    { name: 'Warrior', category: 'shirts', pattern: 'warrior' },
  ];
  
  const processed = [];
  
  // Get screens with screenshots (character sprites)
  for (const screen of screens.screens || []) {
    const title = screen.title || '';
    const screenId = screen.name?.split('/')[5] || slug(title);
    const screenshotUrl = screen.screenshot?.downloadUrl;
    
    // Look for character screens
    const isCharacterScreen = /archer|bard|berserker|cleric|mage|necromancer|paladin|ranger|rogue|warrior/i.test(title);
    
    if (!screenshotUrl || !isCharacterScreen) continue;
    
    // Determine character type from title
    const charType = targetTypes.find(t => new RegExp(t.pattern, 'i').test(title))?.name || 'unknown';
    
    log(`Processing: ${charType} - ${title.substring(0, 50)}...`);
    
    if (dryRun) {
      log(`[DRY-RUN] Would download screenshot for ${charType}`);
      continue;
    }
    
    // Download screenshot
    const imageName = `shirt_${charType.toLowerCase()}_base.png`;
    const imagePath = join(shirtsRoot, imageName);
    
    if (downloadFile(screenshotUrl, imagePath)) {
      log(`Downloaded: ${imageName}`);
      
      // Generate JSON atlas based on known structure
      // Each character sheet has: Idle (row 0-4), Walk (row 5-9), Fight (row 10-14), Die (row 15-19)
      // Columns: N, NW, W, SW, S, SE, E, NE (8 directions)
      const frames = {};
      const directions = ['n', 'nw', 'w', 'sw', 's', 'se', 'e', 'ne'];
      const animations = ['idle', 'walk', 'fight', 'die'];
      
      // 64x64 frames on 1024x1024 sheet = 16 cols, 16 rows
      const frameSize = 64;
      
      animations.forEach((anim, rowOffset) => {
        directions.forEach((dir, colOffset) => {
          for (let frame = 0; frame < 5; frame++) {
            const x = colOffset * frameSize;
            const y = (rowOffset * 5 + frame) * frameSize;
            const frameName = `${charType.toLowerCase()}_${anim}_${frame}.png`;
            frames[frameName] = { x, y, w: frameSize, h: frameSize };
          }
        });
      });
      
      const atlasName = `shirt_${charType.toLowerCase()}_base.json`;
      const atlasData = createPixiJsAtlasJson(frames, imageName, {
        atlasWidth: 1024,
        atlasHeight: 1024,
        frameWidth: 64,
        frameHeight: 64,
        gridCols: 16,
        gridRows: 16,
        anchorY: 0.85,
      });
      
      writeFileSync(join(shirtsRoot, atlasName), JSON.stringify(atlasData, null, 2) + '\n');
      log(`Created atlas: ${atlasName}`);
      
      processed.push({
        type: charType.toLowerCase(),
        image: imageName,
        atlas: atlasName,
        category: 'shirts',
      });
    }
  }
  
  // Create main shirts manifest
  const shirtsManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'Stitch Project: ' + STITCH_PROJECT_ID,
    category: 'shirts',
    assets: processed.reduce((acc, item) => {
      acc[item.type] = {
        src: `/2d-assets/game-assets/shirts/${item.image}`,
        atlas: `/2d-assets/game-assets/shirts/${item.atlas}`,
        category: 'shirts',
        overlay: true,
        anchorY: 0.85,
        frames: { idle: 5, walk: 5, fight: 5, die: 5 },
        directions: 8,
      };
      return acc;
    }, {}),
  };
  
  // Update main manifest
  let mainManifest = { assets: {} };
  if (existsSync(manifestPath)) {
    try {
      mainManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      log('Creating new manifest', 'warn');
    }
  }
  
  mainManifest.assets.shirts = shirtsManifest.assets;
  mainManifest.version = mainManifest.version || 1;
  mainManifest.shirtsUpdatedAt = new Date().toISOString();
  
  writeFileSync(manifestPath, JSON.stringify(mainManifest, null, 2) + '\n');
  
  // Summary
  log('Import complete!');
  log(`Summary:`);
  log(`  - Shirts/Equipment overlays: ${processed.length} character types`);
  log(`  - Category: shirts (equipment overlay)`);
  log(`  - Format: PixiJS Spritesheet with JSON atlas`);
  log(`  - Location: ${shirtsRoot}`);
  log('');
  log('Assets ready for Cozy Asset Director auto-cropping workflow.');
  
  // Cleanup
  if (!dryRun) {
    rmSync(workRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});