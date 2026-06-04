#!/usr/bin/env node
/**
 * stitch-game-assets-importer.mjs
 * 
 * Imports Stitch-generated game assets (models, effects, biomes, symbols, weather)
 * from the Arelorian Stitch project into the 2D client asset system.
 * 
 * Usage:
 *   node scripts/stitch-game-assets-importer.mjs [--dry-run]
 * 
 * Environment:
 *   GITHUB_TOKEN - Required for GitHub API access
 *   STITCH_API_KEY - Optional, for MCP-based asset listing
 *   ISSUE_NUMBER - GitHub issue with asset ZIP attachments (default: 1071)
 * 
 * Asset Categories:
 *   - models: Character sprites, NPC models
 *   - effects: Skill particles, combat FX
 *   - biomes: Environment terrain, transitions
 *   - symbols: Icons, UI elements
 *   - weather: Weather overlays, particle effects
 * 
 * Target: Cozy Asset Director workflow for auto-cropping and live game integration
 */

import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// Configuration
const PROJECT_ID = '5320982353793182486';
const STITCH_PROJECT_URL = 'https://stitch.withgoogle.com/projects/5320982353793182486';
const repo = process.env.GITHUB_REPOSITORY || 'Arelorian/Ouroboros';
const token = process.env.GITHUB_TOKEN;
const issueNumber = String(process.env.ISSUE_NUMBER || '1071');
const dryRun = process.argv.includes('--dry-run');
const localInbox = process.argv.find(a => a.startsWith('--local-inbox='))?.split('=')[1] || null;
const localOutput = process.argv.find(a => a.startsWith('--output='))?.split('=')[1] || null;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const publicRoot = join(root, 'apps/client-2d/public/2d-assets');
const stitchRoot = join(publicRoot, 'stitch');
const gameAssetsRoot = join(publicRoot, 'game-assets');
const manifestPath = join(publicRoot, 'manifest.json');

const workRoot = join(tmpdir(), `wasd-stitch-game-assets-${Date.now()}`);
const extractRoot = join(workRoot, 'extract');
const zipRoot = join(workRoot, 'zips');

// Asset category definitions
const CATEGORIES = {
  models: {
    folder: 'models',
    tags: ['character', 'npc', 'sprite', 'animation'],
    patterns: ['character', 'charakter', 'npc', 'samurai', 'mongolian', 'medieval', 'guard', 'hero'],
    depth: { zHeight: 2, isoFootprint: { w: 64, h: 64 }, shadow: { w: 72, h: 20, alpha: 0.35 } },
    frameSize: 256,
  },
  effects: {
    folder: 'effects',
    tags: ['fx', 'particle', 'magic', 'combat', 'spell'],
    patterns: ['effect', 'effects', 'fx', 'particle', 'spell', 'magic', 'combat', 'slash', 'fire', 'ice', 'lightning'],
    depth: { zHeight: 1, isoFootprint: { w: 32, h: 32 }, shadow: { w: 40, h: 12, alpha: 0.25 } },
    frameSize: 128,
  },
  biomes: {
    folder: 'biomes',
    tags: ['terrain', 'environment', 'ground', 'tile'],
    patterns: ['biome', 'terrain', 'ground', 'tile', 'environment', 'forest', 'desert', 'snow', 'swamp'],
    depth: { tileWidth: 64, tileHeight: 64 },
    frameSize: 64,
  },
  symbols: {
    folder: 'symbols',
    tags: ['icon', 'ui', 'symbol', 'item'],
    patterns: ['icon', 'symbol', 'item', 'resource', 'diamond', 'glass', 'armor', 'weapon'],
    depth: { zHeight: 1, isoFootprint: { w: 32, h: 32 }, shadow: null },
    frameSize: 64,
  },
  weather: {
    folder: 'weather',
    tags: ['weather', 'particle', 'overlay', 'rain', 'snow', 'storm'],
    patterns: ['weather', 'rain', 'snow', 'storm', 'electron', 'surge', 'overlay', 'particle'],
    depth: { zHeight: 0, isoFootprint: { w: 0, h: 0 }, shadow: null },
    frameSize: 128,
  },
  shirts: {
    folder: 'shirts',
    tags: ['equipment', 'armor', 'overlay', 'shirt', 'clothing'],
    patterns: ['shirt', 'shirts', 'armor', 'armor_overlay', 'equipment', 'cloth', 'clothing', 'tunic', 'robe', 'chainmail', 'plate', 'leather', 'mail'],
    depth: { zHeight: 2, isoFootprint: { w: 64, h: 64 }, shadow: null },
    frameSize: 64,
    overlay: true, // Equipment overlay for character sprites
    anchorY: 0.85, // Bottom anchor for layering on characters
  },
};

function log(message, type = 'info') {
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
  console.log(`[StitchGameAssets] ${prefix} ${message}`);
}

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'wasd-stitch-game-assets-importer',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
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

function listFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function categoryFor(text, categoryOverrides = {}) {
  const hay = text.toLowerCase();
  
  // Check explicit patterns per category
  for (const [cat, config] of Object.entries(CATEGORIES)) {
    for (const pattern of config.patterns) {
      if (hay.includes(pattern)) {
        // Check for specific exclusions
        if (cat === 'models' && /weather|particle|effect/.test(hay)) continue;
        if (cat === 'effects' && /character|npc/.test(hay)) continue;
        return cat;
      }
    }
  }
  
  // Default logic based on common terms
  if (/effect|particle|spell|magic|slash|fire|ice/i.test(hay)) return 'effects';
  if (/weather|rain|snow|storm|overlay/i.test(hay)) return 'weather';
  if (/biome|terrain|ground|environment|tile/i.test(hay)) return 'biomes';
  if (/icon|symbol|item|resource|armor|weapon/i.test(hay)) return 'symbols';
  if (/character|npc|samurai|guard|medieval|mongolian/i.test(hay)) return 'models';
  
  return 'effects'; // Default fallback
}

function cultureFor(text) {
  const hay = text.toLowerCase();
  if (/samurai|japanese|japan/.test(hay)) return 'samurai';
  if (/mongol|mongolian|steppe/.test(hay)) return 'mongolian';
  if (/medieval|fantasy|castle/.test(hay)) return 'medieval';
  return 'cross-cultural';
}

function ensureManifestShape(manifest) {
  manifest.version ??= 1;
  manifest.generatedAt = new Date().toISOString();
  manifest.basePath ??= '/2d-assets';
  manifest.sources ??= [];
  manifest.fallbacks ??= {};
  
  // Add game-assets categories
  manifest.models ??= {};
  manifest.effects ??= {};
  manifest.biomes ??= {};
  manifest.symbols ??= {};
  manifest.weather ??= {};
  manifest.shirts ??= {};
  
  return manifest;
}

function patchSpritesheetJson(payload, imageName, framePrefix) {
  const cloned = JSON.parse(JSON.stringify(payload));
  cloned.frames ??= {};
  
  const frames = {};
  for (const [name, frame] of Object.entries(cloned.frames)) {
    const normalizedName = slug(name.replace(/\.(png|webp|jpg|jpeg)$/i, ''), 96);
    frames[normalizedName] = {
      ...frame,
      rotated: false,
      trimmed: Boolean(frame.trimmed),
    };
  }
  
  cloned.frames = frames;
  cloned.meta = {
    ...(cloned.meta ?? {}),
    app: 'Areloria WASD Stitch Game Assets Importer',
    image: imageName,
    scale: String(cloned.meta?.scale ?? '1'),
  };
  
  return cloned;
}

function synthesizeGridJson({ imageName, framePrefix, frameSize = 256, columns = 4, rows = 4 }) {
  const names = [];
  const animations = {};
  
  // Generate standard animation frames
  for (let i = 1; i <= 4; i++) names.push(`idle_${String(i).padStart(2, '0')}`);
  for (let i = 1; i <= 4; i++) names.push(`walk_${String(i).padStart(2, '0')}`);
  for (let i = 1; i <= 4; i++) names.push(`attack_${String(i).padStart(2, '0')}`);
  for (let i = 1; i <= 4; i++) names.push(`death_${String(i).padStart(2, '0')}`);
  
  const frames = {};
  names.forEach((name, index) => {
    const x = (index % columns) * frameSize;
    const y = Math.floor(index / columns) * frameSize;
    frames[`${framePrefix}_${name}`] = {
      frame: { x, y, w: frameSize, h: frameSize },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: frameSize, h: frameSize },
      sourceSize: { w: frameSize, h: frameSize },
      anchor: { x: 0.5, y: 0.9 },
    };
  });
  
  return {
    frames,
    animations: {
      [`${framePrefix}_idle`]: names.slice(0, 4).map((_, i) => `${framePrefix}_idle_${String(i + 1).padStart(2, '0')}`),
      [`${framePrefix}_walk`]: names.slice(4, 8).map((_, i) => `${framePrefix}_walk_${String(i + 1).padStart(2, '0')}`),
      [`${framePrefix}_attack`]: names.slice(8, 12).map((_, i) => `${framePrefix}_attack_${String(i + 1).padStart(2, '0')}`),
      [`${framePrefix}_death`]: names.slice(12, 16).map((_, i) => `${framePrefix}_death_${String(i + 1).padStart(2, '0')}`),
    },
    meta: {
      app: 'Areloria WASD Stitch Game Assets Importer',
      version: '1.0',
      image: imageName,
      format: 'RGBA8888',
      size: { w: columns * frameSize, h: rows * frameSize },
      scale: '1',
    },
  };
}

function defaultDepthMetadata(category, sourceText) {
  const config = CATEGORIES[category] || {};
  return config.depth || { zHeight: 1, isoFootprint: { w: 64, h: 32 }, shadow: { w: 72, h: 20, alpha: 0.32 } };
}

async function main() {
  log(`Starting Stitch game assets import (dry-run: ${dryRun})`);
  
  // Setup directories
  rmSync(workRoot, { recursive: true, force: true });
  mkdirSync(extractRoot, { recursive: true });
  mkdirSync(zipRoot, { recursive: true });
  mkdirSync(gameAssetsRoot, { recursive: true });
  
  // Determine output path
  const outputPath = localOutput || gameAssetsRoot;
  mkdirSync(outputPath, { recursive: true });
  
  // Load or create root manifest
  const rootManifest = existsSync(manifestPath) 
    ? ensureManifestShape(readJson(manifestPath)) 
    : ensureManifestShape({});
  
  const gameAssetsManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceIssue: localInbox ? 'local-inbox' : Number(issueNumber),
    stitchProjectUrl: STITCH_PROJECT_URL,
    basePath: '/2d-assets/game-assets',
    categories: Object.keys(CATEGORIES),
    notes: [
      'Stitch-generated game assets for Arelorian 2D client.',
      'Models, effects, biomes, symbols, and weather effects.',
      'Organized for Cozy Asset Director auto-cropping workflow.',
    ],
    sources: [],
    assets: {
      models: {},
      effects: {},
      biomes: {},
      symbols: {},
      weather: {},
    },
  };
  
  // LOCAL INBOX MODE - Import directly from local folder
  if (localInbox && existsSync(localInbox)) {
    log(`Importing from local inbox: ${localInbox}`);
    
    const files = listFiles(localInbox);
    const pngFiles = files.filter((file) => extname(file).toLowerCase() === '.png');
    const jsonFiles = files.filter((file) => extname(file).toLowerCase() === '.json');
    
    log(`Found ${pngFiles.length} PNG files in local inbox`);
    
    for (const pngFile of pngFiles) {
      const folder = basename(dirname(pngFile));
      const rel = relative(localInbox, pngFile);
      const descriptor = `${folder} ${rel}`;
      
      const category = categoryFor(descriptor);
      const culture = cultureFor(descriptor);
      const config = CATEGORIES[category] || {};
      
      const atlasIdBase = slug(`stitch_${category}_${culture}_${folder}`, 72);
      let atlasId = atlasIdBase;
      let suffix = 2;
      while (gameAssetsManifest.assets[category]?.[atlasId] || existsSync(join(outputPath, atlasId))) {
        atlasId = `${atlasIdBase}_${String(suffix).padStart(2, '0')}`;
        suffix++;
      }
      
      const atlasDir = join(outputPath, atlasId);
      mkdirSync(atlasDir, { recursive: true });
      
      const imageName = `${atlasId}.png`;
      const jsonName = `${atlasId}.json`;
      
      const imageRel = `game-assets/${atlasId}/${imageName}`;
      const jsonRel = `game-assets/${atlasId}/${jsonName}`;
      
      copyFileSync(pngFile, join(atlasDir, imageName));
      
      // Find matching JSON
      let jsonPayload;
      let repair = 'meta-image-normalized';
      
      const matchingJson = jsonFiles.find(f => slug(basename(f)) === slug(basename(pngFile, '.png') + '.json'));
      
      if (matchingJson) {
        jsonPayload = patchSpritesheetJson(readJson(matchingJson), imageName, atlasId);
      } else {
        const frameSize = config.frameSize || 256;
        jsonPayload = synthesizeGridJson({ imageName, framePrefix: atlasId, frameSize, columns: 4, rows: 4 });
        repair = 'synthesized-grid';
      }
      
      writeFileSync(join(atlasDir, jsonName), JSON.stringify(jsonPayload, null, 2) + '\n');
      
      // Create entry
      const entry = {
        src: `/2d-assets/${imageRel}`,
        atlas: `/2d-assets/${jsonRel}`,
        source: 'local-inbox',
        sourcePath: rel,
        license: 'Project-owned Stitch-generated asset.',
        kind: category,
        group: culture,
        tags: ['stitch', 'game-asset', category, culture, ...(config.tags || [])],
        ...defaultDepthMetadata(category, descriptor),
      };
      
      gameAssetsManifest.assets[category][atlasId] = entry;
      rootManifest[category] ??= {};
      rootManifest[category][atlasId] = entry;
    }
    
    log(`Imported ${pngFiles.length} assets from local inbox`);
  }
  // GITHUB ISSUE MODE - Import from ZIP attachments (only if no local inbox)
  else if (!localInbox && token) {
    try {
      log('Fetching asset URLs from GitHub issue...');
      const issue = await gh(`/repos/${repo}/issues/${issueNumber}`);
      const comments = await gh(`/repos/${repo}/issues/${issueNumber}/comments?per_page=100`);
      const text = [issue.body || '', ...comments.map((c) => c.body || '')].join('\n');
      
      const urls = [...new Set([...text.matchAll(/https:\/\/github\.com\/user-attachments\/files\/[^\s)\]]+\.zip/gi)].map((m) => m[0]))];
      
      if (urls.length) {
        log(`Found ${urls.length} ZIP attachments in issue #${issueNumber}`);
        
        let imported = 0;
        for (const [sourceIndex, url] of urls.entries()) {
          if (dryRun) {
            log(`[DRY-RUN] Would download: ${url}`);
            continue;
          }
          
          const rawZipName = decodeURIComponent(url.split('/').pop() || `stitch-game-pack-${sourceIndex + 1}.zip`);
          const zipName = rawZipName.replace(/[^a-zA-Z0-9_.() -]+/g, '_');
          const zipSlug = slug(zipName.replace(/\.zip$/i, ''), 72);
          const zipPath = join(zipRoot, `${String(sourceIndex + 1).padStart(2, '0')}_${zipSlug}.zip`);
          const targetExtract = join(extractRoot, zipSlug);
          mkdirSync(targetExtract, { recursive: true });
          
          log(`Downloading ${zipName}...`);
          try {
            sh('curl', ['-L', '--fail', '--retry', '3', '--retry-delay', '2', '-A', 'wasd-stitch-game-importer', '-o', zipPath, url], { stdio: 'inherit' });
          } catch (e) {
            log(`Failed to download ${url}: ${e.message}`, 'error');
            continue;
          }
          
          log(`Extracting ${zipName}...`);
          sh('unzip', ['-q', '-o', zipPath, '-d', targetExtract], { stdio: 'inherit' });
          
          gameAssetsManifest.sources.push({ name: zipName, url, importedAs: zipSlug });
          
          // Process files
          const files = listFiles(targetExtract);
          const pngFiles = files.filter((file) => extname(file).toLowerCase() === '.png');
          const jsonFiles = files.filter((file) => extname(file).toLowerCase() === '.json');
          
          for (const pngFile of pngFiles) {
            const folder = basename(dirname(pngFile));
            const rel = relative(targetExtract, pngFile);
            const descriptor = `${folder} ${rel}`;
            
            const category = categoryFor(descriptor);
            const culture = cultureFor(descriptor);
            const config = CATEGORIES[category] || {};
            
            const atlasIdBase = slug(`stitch_${category}_${culture}_${folder}`, 72);
            let atlasId = atlasIdBase;
            let suffix = 2;
            while (gameAssetsManifest.assets[category]?.[atlasId] || existsSync(join(gameAssetsRoot, atlasId))) {
              atlasId = `${atlasIdBase}_${String(suffix).padStart(2, '0')}`;
              suffix++;
            }
            
            const atlasDir = join(gameAssetsRoot, atlasId);
            mkdirSync(atlasDir, { recursive: true });
            
            const imageName = `${atlasId}.png`;
            const jsonName = `${atlasId}.json`;
            
            const imageRel = `game-assets/${atlasId}/${imageName}`;
            const jsonRel = `game-assets/${atlasId}/${jsonName}`;
            
            copyFileSync(pngFile, join(atlasDir, imageName));
            
            // Find matching JSON
            let jsonPayload;
            let repair = 'meta-image-normalized';
            
            const matchingJson = jsonFiles.find(f => slug(basename(f)) === slug(basename(pngFile, '.png') + '.json'));
            
            if (matchingJson) {
              jsonPayload = patchSpritesheetJson(readJson(matchingJson), imageName, atlasId);
            } else {
              const frameSize = config.frameSize || 256;
              jsonPayload = synthesizeGridJson({ imageName, framePrefix: atlasId, frameSize, columns: 4, rows: 4 });
              repair = 'synthesized-grid';
            }
            
            writeFileSync(join(atlasDir, jsonName), JSON.stringify(jsonPayload, null, 2) + '\n');
            
            // Create entry
            const entry = {
              src: `/2d-assets/${imageRel}`,
              atlas: `/2d-assets/${jsonRel}`,
              source: zipName,
              sourcePath: rel,
              license: 'Project-owned Stitch-generated asset. See /2d-assets/credits/stitch-game-assets-provenance.md',
              kind: category,
              group: culture,
              tags: ['stitch', 'game-asset', category, culture, ...(config.tags || [])],
              ...defaultDepthMetadata(category, descriptor),
            };
            
            gameAssetsManifest.assets[category][atlasId] = entry;
            rootManifest[category] ??= {};
            rootManifest[category][atlasId] = entry;
            
            imported++;
          }
        }
        
        log(`Imported ${imported} game asset atlases`);
      } else {
        log(`No ZIP attachments found in issue #${issueNumber}`, 'warn');
        log('Please upload Stitch-generated game asset ZIPs to the issue.', 'warn');
      }
    } catch (e) {
      log(`GitHub API error: ${e.message}`, 'error');
    }
  }
  
  // Write manifests
  const stitchGameManifestPath = join(outputPath, 'manifest.json');
  writeFileSync(stitchGameManifestPath, JSON.stringify(gameAssetsManifest, null, 2) + '\n');
  writeFileSync(manifestPath, JSON.stringify(rootManifest, null, 2) + '\n');
  
  // Create provenance document
  const provenanceDir = join(publicRoot, 'credits');
  mkdirSync(provenanceDir, { recursive: true });
  const provenance = [
    '# Stitch Game Assets Provenance',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Source issue: #${issueNumber}`,
    `Stitch project: ${STITCH_PROJECT_URL}`,
    '',
    'These assets were generated via Google Stitch and imported into Arelorian.',
    '',
    '## Categories',
    '- models: Character sprites and NPC animations',
    '- effects: Skill particles and combat FX',
    '- biomes: Environment terrain tiles',
    '- symbols: UI icons and item graphics',
    '- weather: Weather overlays and particle effects',
    '',
    '## Import sources',
    '',
    ...gameAssetsManifest.sources.map(s => `- ${s.name}: ${s.url || 'local'}`),
  ];
  writeFileSync(join(provenanceDir, 'stitch-game-assets-provenance.md'), provenance.join('\n') + '\n');
  
  // Summary
  log('Import complete!');
  log(`Summary:`);
  log(`  - models: ${Object.keys(gameAssetsManifest.assets.models).length} atlases`);
  log(`  - effects: ${Object.keys(gameAssetsManifest.assets.effects).length} atlases`);
  log(`  - biomes: ${Object.keys(gameAssetsManifest.assets.biomes).length} atlases`);
  log(`  - symbols: ${Object.keys(gameAssetsManifest.assets.symbols).length} atlases`);
  log(`  - weather: ${Object.keys(gameAssetsManifest.assets.weather).length} atlases`);
  log('');
  log('Assets ready for Cozy Asset Director auto-cropping workflow.');
  log(`Manifest: ${stitchGameManifestPath}`);
  
  // Cleanup
  if (!dryRun) {
    rmSync(workRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});