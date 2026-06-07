#!/usr/bin/env node
/**
 * scripts/audit-live-worldtick-contract.mjs
 * 
 * Static audit script to verify WorldTick reality contract for /2d/ client.
 * 
 * Usage:
 *   node scripts/audit-live-worldtick-contract.mjs [--verbose]
 * 
 * Exit codes:
 *   0 - All critical checks pass
 *   1 - Critical failure (missing required files)
 *   2 - Warnings found (see output)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const CRITICAL_ERRORS = [];
const WARNINGS = [];
const INFO = [];

const ARGV = process.argv.slice(2);
const VERBOSE = ARGV.includes('--verbose') || ARGV.includes('-v');

/**
 * Find all TypeScript/TSX files recursively
 */
function findTsFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      // Skip common non-source directories
      if (entry === 'node_modules' || entry === 'dist' || entry === 'build' || entry === '.git') continue;
      findTsFiles(full, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Search files for a pattern
 */
function searchFiles(files, pattern, flags = '') {
  const regex = new RegExp(pattern, flags);
  const results = [];
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          results.push({ file, line: i + 1, content: lines[i].trim() });
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  return results;
}

/**
 * Check if root 2d/ source exists (should NOT)
 */
function checkNoRoot2dSource() {
  const root2d = join(ROOT, '2d');
  if (existsSync(root2d)) {
    CRITICAL_ERRORS.push({
      check: 'NO_ROOT_2D_SOURCE',
      message: `Root /2d/ source directory exists at ${root2d}`,
      severity: 'CRITICAL',
      fix: 'Move source to apps/client-2d/src/'
    });
    return false;
  }
  INFO.push({ check: 'NO_ROOT_2D_SOURCE', message: 'No root /2d/ source directory (good)' });
  return true;
}

/**
 * Check if apps/client-2d exists (should)
 */
function checkClient2dExists() {
  const client2d = join(ROOT, 'apps', 'client-2d');
  if (!existsSync(client2d)) {
    CRITICAL_ERRORS.push({
      check: 'CLIENT_2D_EXISTS',
      message: `apps/client-2d does not exist`,
      severity: 'CRITICAL',
      fix: 'Create apps/client-2d/ with proper source structure'
    });
    return false;
  }
  const srcExists = existsSync(join(client2d, 'src'));
  if (!srcExists) {
    CRITICAL_ERRORS.push({
      check: 'CLIENT_2D_SRC_EXISTS',
      message: `apps/client-2d/src does not exist`,
      severity: 'CRITICAL',
      fix: 'Create apps/client-2d/src/ with client source'
    });
    return false;
  }
  INFO.push({ check: 'CLIENT_2D_EXISTS', message: 'apps/client-2d/src exists (good)' });
  return true;
}

/**
 * Check if WorldTick.ts exists
 */
function checkWorldTickExists() {
  const worldTickPaths = [
    join(ROOT, 'server', 'src', 'core', 'WorldTick.ts'),
    join(ROOT, 'server', 'src', 'core', 'WorldTick.js'),
  ];
  const exists = worldTickPaths.some(p => existsSync(p));
  if (!exists) {
    CRITICAL_ERRORS.push({
      check: 'WORLDTICK_EXISTS',
      message: 'WorldTick.ts not found in server/src/core/',
      severity: 'CRITICAL',
      fix: 'Create server/src/core/WorldTick.ts with WorldTick class'
    });
    return false;
  }
  INFO.push({ check: 'WORLDTICK_EXISTS', message: 'WorldTick.ts exists (good)' });
  return true;
}

/**
 * Search for hardcoded player name defaults
 */
function checkHardcodedPlayerNames(files) {
  const patterns = [
    { pattern: /["']Thomas["']/, name: 'Thomas (capitalized)' },
    { pattern: /["']thomas["']/, name: 'thomas (lowercase)' },
    { pattern: /localStorage\.getItem\(["']wasd:2d:name["']\)\s*\?\?\s*["'][Tt]homas/, name: 'Thomas default in localStorage' },
  ];
  
  for (const { pattern, name } of patterns) {
    const results = searchFiles(files, pattern.source);
    if (results.length > 0) {
      WARNINGS.push({
        check: 'HARDCODED_PLAYER_NAME',
        message: `Found hardcoded player name: ${name}`,
        severity: 'WARNING',
        files: results.map(r => `${r.file.replace(ROOT, '')}:${r.line}`),
        fix: 'Use server-provided character name from WorldTick welcome packet'
      });
    }
  }
}

/**
 * Search for demo/fallback resource names in client
 */
function checkDemoResources(files) {
  const clientFiles = files.filter(f => f.includes('apps/client-2d'));
  
  // Only check for demo-specific patterns (not production item names)
  const demoPatterns = [
    { pattern: /demo_npc|demo-resource|demo_spot/, name: 'Demo resource/npc prefix' },
    { pattern: /hardcoded.*gather|client.*gather.*increment/, name: 'Client-side gather increment' },
  ];
  
  for (const { pattern, name } of demoPatterns) {
    const results = searchFiles(clientFiles, pattern.source, 'i');
    if (results.length > 0) {
      WARNINGS.push({
        check: 'DEMO_RESOURCE_PATTERN',
        message: `Found ${name} pattern in client`,
        severity: 'WARNING',
        files: results.map(r => `${r.file.replace(ROOT, '')}:${r.line}`),
        fix: 'Replace with server-authoritative resource nodes'
      });
    }
  }
}

/**
 * Search for localStorage usage that might bypass server
 */
function checkLocalStorageGameplay(files) {
  const clientFiles = files.filter(f => f.includes('apps/client-2d'));
  
  // Patterns that suggest local gameplay mutation
  const suspiciousPatterns = [
    { pattern: /inventory\[[^\]]+\]\s*\+\s*=/, name: 'Client-side inventory increment' },
    { pattern: /setInventory\([^)]*\+\s*\d/, name: 'Direct inventory addition' },
  ];
  
  for (const { pattern, name } of suspiciousPatterns) {
    const results = searchFiles(clientFiles, pattern.source);
    if (results.length > 0) {
      WARNINGS.push({
        check: 'LOCAL_STORAGE_GAMEPLAY',
        message: `Potential ${name} in client`,
        severity: 'WARNING',
        files: results.map(r => `${r.file.replace(ROOT, '')}:${r.line}`),
        fix: 'All gameplay mutations should go through server API'
      });
    }
  }
}

/**
 * Check WorldTick initialization patterns
 */
function checkWorldTickInit(files) {
  const serverFiles = files.filter(f => f.includes('server/src'));
  
  const startPattern = /setInterval.*tick\(\)/;
  const results = searchFiles(serverFiles, startPattern.source);
  
  const hasTickInterval = results.some(r => r.file.includes('WorldTick'));
  if (!hasTickInterval) {
    WARNINGS.push({
      check: 'WORLDTICK_TICK_INTERVAL',
      message: 'No setInterval(() => this.tick()) found in WorldTick',
      severity: 'WARNING',
      fix: 'Ensure WorldTick.tick() is called at 10Hz (100ms interval)'
    });
  } else {
    INFO.push({ check: 'WORLDTICK_TICK_INTERVAL', message: 'WorldTick tick interval found (good)' });
  }
}

/**
 * Check for WorldTick instantiation in ServerBootstrap
 */
function checkWorldTickInstantiation(files) {
  const bootstrapFiles = files.filter(f => f.includes('ServerBootstrap'));
  
  const newWorldTickPattern = /new WorldTick/;
  const results = searchFiles(bootstrapFiles, newWorldTickPattern.source);
  
  if (results.length === 0) {
    WARNINGS.push({
      check: 'WORLDTICK_INSTANTIATION',
      message: 'WorldTick not instantiated in ServerBootstrap',
      severity: 'WARNING',
      fix: 'Add: const tick = new WorldTick(ws); await tick.init();'
    });
  } else {
    INFO.push({ check: 'WORLDTICK_INSTANTIATION', message: 'WorldTick instantiated in ServerBootstrap (good)' });
  }
}

/**
 * Check for LiveGameplaySnapshot usage
 */
function checkLiveGameplaySnapshot(files) {
  const clientFiles = files.filter(f => f.includes('apps/client-2d'));
  
  const snapshotPattern = /LiveGameplaySnapshot|liveGameplayStore/;
  const results = searchFiles(clientFiles, snapshotPattern.source);
  
  if (results.length === 0) {
    WARNINGS.push({
      check: 'LIVE_GAMEPLAY_SNAPSHOT',
      message: 'LiveGameplaySnapshot not used in client',
      severity: 'WARNING',
      fix: 'Implement LiveGameplaySnapshot for server-authoritative UI data'
    });
  } else {
    INFO.push({ check: 'LIVE_GAMEPLAY_SNAPSHOT', message: `LiveGameplaySnapshot used in ${results.length} places (good)` });
  }
}

/**
 * List known fallback/demo files
 */
function listKnownDemoFiles(files) {
  const demoPatterns = ['stitch-screens', 'stitch-windows', 'stitch-ui'];
  const demoFiles = files.filter(f => 
    f.includes('apps/client-2d') && 
    demoPatterns.some(p => f.includes(p))
  );
  
  if (demoFiles.length > 0) {
    INFO.push({
      check: 'KNOWN_DEMO_FILES',
      message: `Found ${demoFiles.length} stitch/demo screen files (expected for UI previews)`,
      files: demoFiles.slice(0, 10).map(f => f.replace(ROOT, ''))
    });
  }
}

/**
 * Main audit function
 */
function runAudit() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  WorldTick Reality Audit - Static Contract Check');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Gather all TypeScript files
  const allFiles = [
    ...findTsFiles(join(ROOT, 'apps', 'client-2d', 'src')),
    ...findTsFiles(join(ROOT, 'server', 'src')),
  ];

  console.log(`[INFO] Scanning ${allFiles.length} TypeScript/TSX files...\n`);

  // Run critical checks first
  console.log('─── Critical Checks ───────────────────────────────────────────');
  checkNoRoot2dSource();
  checkClient2dExists();
  checkWorldTickExists();

  if (CRITICAL_ERRORS.length > 0) {
    console.log('\n[CRITICAL ERRORS FOUND]');
    for (const err of CRITICAL_ERRORS) {
      console.log(`  ✗ ${err.check}: ${err.message}`);
      console.log(`    Fix: ${err.fix}`);
    }
    console.log('\n[RESULT] FAILED - Critical infrastructure missing');
    process.exit(1);
  }

  // Run warning checks
  console.log('\n─── WorldTick Runtime Checks ──────────────────────────────────');
  checkWorldTickInit(allFiles);
  checkWorldTickInstantiation(allFiles);

  console.log('\n─── Client Data Flow Checks ──────────────────────────────────');
  checkLiveGameplaySnapshot(allFiles);
  checkHardcodedPlayerNames(allFiles);
  checkDemoResources(allFiles);
  checkLocalStorageGameplay(allFiles);

  console.log('\n─── Known Demo/Preview Files ─────────────────────────────────');
  listKnownDemoFiles(allFiles);

  // Output results
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Results');
  console.log('═══════════════════════════════════════════════════════════════');

  if (INFO.length > 0) {
    console.log('\n[INFO]');
    for (const item of INFO) {
      console.log(`  • ${item.message}`);
      if (VERBOSE && item.files) {
        for (const f of item.files.slice(0, 5)) {
          console.log(`    - ${f}`);
        }
      }
    }
  }

  if (WARNINGS.length > 0) {
    console.log('\n[WARNINGS]');
    for (const warn of WARNINGS) {
      console.log(`  ⚠ ${warn.check}: ${warn.message}`);
      if (VERBOSE && warn.files) {
        for (const f of warn.files.slice(0, 5)) {
          console.log(`    - ${f}`);
        }
      }
      console.log(`    Fix: ${warn.fix}`);
    }
    console.log('\n[RESULT] PASSED with warnings - review output above');
    process.exit(2);
  }

  console.log('\n[RESULT] ALL CHECKS PASSED');
  process.exit(0);
}

// Run the audit
runAudit();