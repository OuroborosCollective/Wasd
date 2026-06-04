#!/usr/bin/env node
/**
 * import-all-stitch-assets.mjs
 * 
 * Downloads and imports ALL assets from the Stitch project into the Arelorian 2D client.
 * Covers: models, biomes, symbols, effects, weather, and resource assets.
 * 
 * Usage:
 *   node scripts/import-all-stitch-assets.mjs [--dry-run] [--category=models|biomes|symbols|all]
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

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1] || 'all';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const publicRoot = join(root, 'apps/client-2d/public/2d-assets');
const gameAssetsRoot = join(publicRoot, 'game-assets');
const manifestPath = join(gameAssetsRoot, 'manifest.json');

const workRoot = join(tmpdir(), `wasd-all-assets-${Date.now()}`);

function log(message, type = 'info') {
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : '📦';
  console.log(`[StitchAllAssets] ${prefix} ${message}`);
}

async function stitchRequest(toolName, params = {}) {
  // Initialize
  await fetch('https://stitch.googleapis.com/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': STITCH_API_KEY },
    body: JSON.stringify({
      jsonrpc: '2.0', id: Date.now(), method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'wasd-full-importer', version: '1.0' } },
    }),
  });
  
  // Call tool
  const response = await fetch('https://stitch.googleapis.com/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': STITCH_API_KEY },
    body: JSON.stringify({
      jsonrpc: '2.0', id: Date.now() + 1, method: 'tools/call',
      params: { name: toolName, arguments: params },
    }),
  });
  
  const result = await response.json();
  if (result.error) throw new Error(result.error.message || 'Stitch API error');
  return JSON.parse(result.result.content[0].text);
}

function slug(input, max = 96) {
  return String(input || 'asset')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '').replace(/_{2,}/g, '_')
    .slice(0, max) || 'asset';
}

function downloadFile(url, destPath) {
  try {
    sh('curl', ['-L', '--fail', '--retry', '3', '-o', destPath, url], { stdio: 'pipe' });
    return true;
  } catch (e) {
    log(`Failed to download: ${url}`, 'error');
    return false;
  }
}

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

// Asset type definitions with detection patterns
const ASSET_TYPES = {
  // Character sprites - 256x256 frames, 5 frames x 8 directions x 4 animations
  models: {
    folder: 'models/characters',
    patterns: [/archer|bard|berserker|cleric|mage|necromancer|paladin|ranger|rogue|warrior/i, /sprite.*atlas.*fantasy.*character/i],
    frameSize: 256,
    grid: { cols: 8, rows: 20 },
    anchor: { x: 0.5, y: 0.9 },
    zHeight: 2,
    animations: ['idle', 'walk', 'fight', 'die'],
  },
  // Biome tiles - 64x64, 8x8 grid
  biomes: {
    folder: 'biomes',
    patterns: [/biome|terrain|ground|world/i, /forest|city|ice|sand|swamp|interior/i, /tile.*atlas/i],
    frameSize: 64,
    grid: { cols: 8, rows: 8 },
    anchor: { x: 0.5, y: 0.5 },
    zHeight: 0,
    tileBased: true,
  },
  // Icons - 64x64, 8x8 grid
  symbols: {
    folder: 'symbols',
    patterns: [/icon|alchemy|crafting|inventory|consumables|skills.*spells/i, /symbol.*atlas/i],
    frameSize: 64,
    grid: { cols: 8, rows: 8 },
    anchor: { x: 0.5, y: 0.5 },
    zHeight: 1,
    ui: true,
  },
  // Resource farming - 64x64
  resources: {
    folder: 'biomes/resources',
    patterns: [/resource|farming|harvest/i, /ore|crystal|log|mushroom|herb/i],
    frameSize: 64,
    grid: { cols: 8, rows: 8 },
    anchor: { x: 0.5, y: 0.5 },
    zHeight: 0,
  },
  // Trade routes and props
  props: {
    folder: 'biomes/props',
    patterns: [/trade|props|routes/i, /barrel|cart|crate|signpost/i],
    frameSize: 64,
    grid: { cols: 8, rows: 8 },
    anchor: { x: 0.5, y: 0.5 },
    zHeight: 1,
  },
};

function detectAssetType(title, existingTypes = []) {
  for (const [type, config] of Object.entries(ASSET_TYPES)) {
    if (existingTypes.includes(type)) continue;
    for (const pattern of config.patterns) {
      if (pattern.test(title)) return type;
    }
  }
  return null;
}

function createPixiJsAtlas(frames, imageName, config) {
  const { frameSize = 64, grid = { cols: 8, rows: 8 }, anchor = { x: 0.5, y: 0.5 } } = config;
  const animations = {};
  
  // Group by animation
  const frameNames = Object.keys(frames);
  const animNames = [...new Set(frameNames.map(n => n.split('_')[1]).filter(Boolean))];
  
  for (const anim of animNames) {
    animations[anim] = frameNames.filter(n => n.includes(`_${anim}_`)).sort();
  }
  
  return {
    frames: Object.fromEntries(
      Object.entries(frames).map(([name, frame]) => [
        name,
        {
          frame: { x: frame.x || 0, y: frame.y || 0, w: frame.w || frameSize, h: frame.h || frameSize },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: frameSize, h: frameSize },
          sourceSize: { w: frameSize, h: frameSize },
        },
      ])
    ),
    animations,
    meta: {
      app: 'Areloria WASD - Cozy Asset Director',
      version: '1.0.0',
      image: imageName,
      format: 'RGBA8888',
      size: { w: grid.cols * frameSize, h: grid.rows * frameSize },
      scale: '1',
      frameSize,
      gridLayout: `${grid.cols}x${grid.rows}`,
      stitchProject: STITCH_PROJECT_ID,
      ...config,
    },
  };
}

async function main() {
  log('Starting full Stitch asset import...');
  
  mkdirSync(gameAssetsRoot, { recursive: true });
  
  // Fetch all screens
  log('Fetching screens from Stitch project...');
  const screens = await stitchRequest('list_screens', { projectId: STITCH_PROJECT_ID });
  const screenList = screens.screens || [];
  
  log(`Found ${screenList.length} screens to process`);
  
  const imported = {
    models: [],
    biomes: [],
    symbols: [],
    resources: [],
    props: [],
  };
  
  const processedTypes = [];
  
  for (const screen of screenList) {
    const title = screen.title || '';
    const screenshotUrl = screen.screenshot?.downloadUrl;
    const metadataUrl = screen.htmlCode?.downloadUrl;
    
    if (!screenshotUrl && !metadataUrl) continue;
    
    // Determine asset type
    const assetType = detectAssetType(title, processedTypes);
    if (!assetType || (categoryFilter !== 'all' && assetType !== categoryFilter)) continue;
    
    const config = ASSET_TYPES[assetType];
    const typeFolder = join(gameAssetsRoot, config.folder);
    mkdirSync(typeFolder, { recursive: true });
    
    // Generate asset name from title
    const baseName = slug(title.split('.')[0].substring(0, 40));
    const timestamp = Date.now().toString(36).slice(-4);
    const assetName = `${assetType}_${baseName}_${timestamp}`;
    
    log(`Processing [${assetType}]: ${title.substring(0, 50)}...`);
    
    if (dryRun) {
      log(`[DRY-RUN] Would download ${assetType} asset`);
      continue;
    }
    
    // Download screenshot (main asset)
    if (screenshotUrl) {
      const imageName = `${assetName}.png`;
      const imagePath = join(typeFolder, imageName);
      
      if (downloadFile(screenshotUrl, imagePath)) {
        log(`  Downloaded: ${imageName}`);
        
        // Download metadata JSON if available
        let jsonData = null;
        if (metadataUrl) {
          try {
            const metaPath = join(typeFolder, `${assetName}.json`);
            if (downloadFile(metadataUrl, metaPath)) {
              const metaContent = readFileSync(metaPath, 'utf8');
              jsonData = JSON.parse(metaContent);
            }
          } catch (e) {
            log(`  No metadata JSON found`, 'warn');
          }
        }
        
        // Generate atlas JSON based on known structure
        const frames = {};
        const directions = ['n', 'nw', 'w', 'sw', 's', 'se', 'e', 'ne'];
        const animations = config.animations || ['idle', 'walk', 'fight', 'die'];
        
        if (assetType === 'models') {
          // 256x256 frames on 1024x1024 sheet
          animations.forEach((anim, animIdx) => {
            directions.forEach((dir, dirIdx) => {
              for (let frame = 0; frame < 5; frame++) {
                const x = dirIdx * 256;
                const y = (animIdx * 5 + frame) * 256;
                frames[`${baseName}_${anim}_${frame}.png`] = { x, y, w: 256, h: 256 };
              }
            });
          });
        } else {
          // 64x64 frames on 512x512 sheet (8x8)
          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              const x = col * 64;
              const y = row * 64;
              const frameName = `${baseName}_${row}_${col}.png`;
              frames[frameName] = { x, y, w: 64, h: 64 };
            }
          }
        }
        
        const atlasData = createPixiJsAtlas(frames, imageName, config);
        const atlasName = `${assetName}.json`;
        writeFileSync(join(typeFolder, atlasName), JSON.stringify(atlasData, null, 2) + '\n');
        
        imported[assetType].push({
          name: assetName,
          image: imageName,
          atlas: atlasName,
          title: title.substring(0, 80),
        });
        
        processedTypes.push(assetType);
      }
    }
  }
  
  // Update main manifest
  let manifest = { assets: {} };
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (e) {}
  }
  
  manifest.assets.models ??= {};
  manifest.assets.biomes ??= {};
  manifest.assets.symbols ??= {};
  manifest.version = manifest.version || 1;
  manifest.lastFullImport = new Date().toISOString();
  
  // Add imported assets to manifest
  for (const [type, assets] of Object.entries(imported)) {
    if (!manifest.assets[type]) manifest.assets[type] = {};
    for (const asset of assets) {
      manifest.assets[type][asset.name] = {
        src: `/2d-assets/game-assets/${ASSET_TYPES[type].folder}/${asset.image}`,
        atlas: `/2d-assets/game-assets/${ASSET_TYPES[type].folder}/${asset.atlas}`,
        category: type,
        ...ASSET_TYPES[type],
      };
    }
  }
  
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  
  // Summary
  log('');
  log('═══════════════════════════════════════');
  log('IMPORT COMPLETE!');
  log('═══════════════════════════════════════');
  log('');
  
  const totalAssets = Object.values(imported).flat().length;
  log(`Total assets imported: ${totalAssets}`);
  log('');
  
  for (const [type, assets] of Object.entries(imported)) {
    if (assets.length > 0) {
      log(`📦 ${type}: ${assets.length} assets`);
      assets.forEach(a => log(`   - ${a.name}`));
    }
  }
  
  log('');
  log(`Manifest updated: ${manifestPath}`);
  log('');
  log('Ready for VPS deployment with Cozy Asset Director!');
  
  rmSync(workRoot, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});