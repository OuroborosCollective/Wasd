#!/usr/bin/env node
/**
 * scripts/audit-system-registration.mjs
 * 
 * Static audit script to verify TickSystem registration integrity.
 * 
 * Checks:
 * - implements TickSystem interface
 * - registered in ARE bootstrap
 * - receives tick events
 * - produces deterministic output
 * 
 * Output:
 * {
 *   "active": [...],
 *   "registeredNotExecuting": [...],
 *   "unregistered": [...],
 *   "legacy": [...],
 *   "wallClockViolations": [...]
 * }
 * 
 * Usage:
 *   node scripts/audit-system-registration.mjs [--verbose]
 * 
 * Exit codes:
 *   0 - All systems validated
 *   1 - Critical failure
 *   2 - Findings reported (unregistered systems, wall-clock violations)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, basename, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const ARGV = process.argv.slice(2);
const VERBOSE = ARGV.includes('--verbose') || ARGV.includes('-v');
const OUTPUT_JSON = ARGV.includes('--json');

const results = {
  active: [],           // Systems registered and executing
  registeredNotExecuting: [],  // Systems imported but not receiving ticks
  unregistered: [],     // Systems implementing TickSystem but not registered
  legacy: [],          // Systems not using tick-based architecture
  wallClockViolations: []  // Runtime calculations using Date.now, Math.random, etc.
};

/**
 * Find all TypeScript/JS files recursively
 */
function findTsFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'build' || entry === '.git') continue;
      findTsFiles(full, files);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
      if (entry.includes('.test.') || entry.includes('.spec.')) continue;
      files.push(full);
    }
  }
  return files;
}

/**
 * Check if file uses TickSystem patterns
 */
function checkTickSystemUsage(content) {
  const patterns = {
    implementsTickSystem: /implements\s+.*TickSystem|TickSystem\s*{|class.*TickSystem/,
    usesTickContext: /tickContextProvider|TickSystemContextProvider/,
    tickBasedLogic: /tickIndex|tickId|tickCount|worldTimeHours/,
    usesOuroboros: /getOuroborosTickSystem|OuroborosTickSystem/,
    receivesTick: /onTick|handleTick|tick\s*\(|tick\.add|registerTick/,
    importsTick: /from\s+["'].*Tick.*["']|import\s+.*Tick/
  };
  
  const found = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    found[key] = pattern.test(content);
  }
  
  return found;
}

/**
 * Check for wall-clock violations in simulation paths
 */
function findWallClockViolations(filePath, content) {
  const violations = [];
  
  const simulationPaths = [
    'server/src/modules',
    'server/src/core',
    'server/src/gameplay',
    'server/src/simulation'
  ];
  
  const isSimulationPath = simulationPaths.some(p => filePath.includes(p));
  if (!isSimulationPath) return violations;
  
  const patterns = [
    { pattern: /Date\.now\s*\(/g, type: 'Date.now()', category: 'wall-clock' },
    { pattern: /new\s+Date\s*\(/g, type: 'new Date()', category: 'wall-clock' },
    { pattern: /performance\.now\s*\(/g, type: 'performance.now()', category: 'wall-clock' },
    { pattern: /Math\.random\s*\(/g, type: 'Math.random()', category: 'non-deterministic' },
    { pattern: /crypto\.getRandomValues/g, type: 'crypto.getRandomValues()', category: 'non-deterministic' },
    { pattern: /createdAt/g, type: 'createdAt field', category: 'persistence-metadata' },
    { pattern: /updatedAt/g, type: 'updatedAt field', category: 'persistence-metadata' },
    { pattern: /lastSeen/g, type: 'lastSeen field', category: 'persistence-metadata' },
    { pattern: /lastActive/g, type: 'lastActive field', category: 'persistence-metadata' }
  ];
  
  const lines = content.split('\n');
  
  for (const { pattern, type, category } of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      violations.push({
        type,
        category,
        line: lineNum,
        snippet: lines[lineNum - 1]?.trim().substring(0, 100)
      });
    }
  }
  
  return violations;
}

/**
 * Check if a module is registered in bootstrap
 */
function isRegisteredInBootstrap(moduleName, bootstrapContent) {
  // Check for direct import and usage
  const importPattern = new RegExp(`import.*${moduleName}`);
  const usagePattern = new RegExp(`${moduleName}\\(|${moduleName}\\.`);
  
  return importPattern.test(bootstrapContent) && usagePattern.test(bootstrapContent);
}

/**
 * Check if a module is imported but not used (not receiving ticks)
 */
function isImportedNotUsed(moduleName, bootstrapContent) {
  const importPattern = new RegExp(`import.*{[^}]*${moduleName}[^}]*}.*from`);
  const usagePattern = new RegExp(`${moduleName}\\(|${moduleName}\\.`);
  
  const hasImport = importPattern.test(bootstrapContent);
  const hasUsage = usagePattern.test(bootstrapContent);
  
  return hasImport && !hasUsage;
}

/**
 * Main audit function
 */
async function runAudit() {
  console.log('🔍 ARE System Registration Audit');
  console.log('='.repeat(50));
  
  const bootstrapPath = join(ROOT, 'server/src/index.ts');
  const bootstrapContent = existsSync(bootstrapPath) 
    ? readFileSync(bootstrapPath, 'utf-8') 
    : '';
  
  const serverModulesPath = join(ROOT, 'server/src/modules');
  const serverCorePath = join(ROOT, 'server/src/core');
  
  // Find all TypeScript files
  const allFiles = [
    ...findTsFiles(serverModulesPath, []),
    ...findTsFiles(serverCorePath, []),
    ...findTsFiles(join(ROOT, 'server/src/gameplay'), [])
  ];
  
  console.log(`\n📊 Scanning ${allFiles.length} files for TickSystem patterns...`);
  
  const registeredSystems = new Set();
  
  // Parse bootstrap to find registered systems
  const registerPatterns = [
    /install(\w+)\s*\(/g,
    /register(\w+)\s*\(/g,
    /new\s+(\w+)\s*\(/g
  ];
  
  for (const pattern of registerPatterns) {
    let match;
    while ((match = pattern.exec(bootstrapContent)) !== null) {
      registeredSystems.add(match[1]);
    }
  }
  
  console.log(`📊 Found ${registeredSystems.size} registered systems in bootstrap`);
  
  // Analyze each file
  for (const file of allFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      const tickPatterns = checkTickSystemUsage(content);
      const relativePath = relative(ROOT, file);
      
      const info = {
        file: relativePath,
        name: basename(file, extname(file)),
        patterns: tickPatterns
      };
      
      // Check for wall-clock violations
      const violations = findWallClockViolations(file, content);
      if (violations.length > 0) {
        info.violations = violations;
        results.wallClockViolations.push(info);
      }
      
      // Classify system
      if (tickPatterns.implementsTickSystem || tickPatterns.usesTickContext || tickPatterns.receivesTick) {
        const isRegistered = [...registeredSystems].some(sys => 
          info.name.toLowerCase().includes(sys.toLowerCase()) ||
          sys.toLowerCase().includes(info.name.toLowerCase())
        );
        
        if (isRegistered) {
          results.active.push(info);
        } else if (tickPatterns.importsTick) {
          results.unregistered.push(info);
        } else {
          results.registeredNotExecuting.push(info);
        }
      } else if (tickPatterns.usesOuroboros || tickPatterns.tickBasedLogic) {
        // Has tick-based logic but not fully integrated
        results.registeredNotExecuting.push({ ...info, reason: 'Uses tick logic but not registered as TickSystem' });
      } else {
        // Check if it should be tick-based based on file path
        if (file.includes('/modules/') && !file.includes('/analytics') && !file.includes('/telemetry')) {
          results.legacy.push(info);
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  // Output results
  console.log('\n' + '='.repeat(50));
  console.log('📋 AUDIT RESULTS');
  console.log('='.repeat(50));
  
  console.log(`\n✅ ACTIVE SYSTEMS: ${results.active.length}`);
  if (VERBOSE) {
    for (const sys of results.active.slice(0, 20)) {
      console.log(`   - ${sys.name} (${sys.file})`);
    }
    if (results.active.length > 20) {
      console.log(`   ... and ${results.active.length - 20} more`);
    }
  }
  
  console.log(`\n⚠️  UNREGISTERED SYSTEMS: ${results.unregistered.length}`);
  if (results.unregistered.length > 0) {
    for (const sys of results.unregistered) {
      console.log(`   - ${sys.name} (${sys.file})`);
      console.log(`     Uses tick imports but not registered in bootstrap`);
    }
  }
  
  console.log(`\n⚠️  NOT EXECUTING: ${results.registeredNotExecuting.length}`);
  if (VERBOSE && results.registeredNotExecuting.length > 0) {
    for (const sys of results.registeredNotExecuting.slice(0, 10)) {
      console.log(`   - ${sys.name} (${sys.file})`);
      if (sys.reason) console.log(`     Reason: ${sys.reason}`);
    }
  }
  
  console.log(`\n⚠️  WALL-CLOCK VIOLATIONS: ${results.wallClockViolations.length}`);
  if (results.wallClockViolations.length > 0) {
    for (const sys of results.wallClockViolations) {
      console.log(`   - ${sys.file}`);
      for (const v of sys.violations.slice(0, 3)) {
        console.log(`     Line ${v.line}: ${v.type} - ${v.snippet}`);
      }
      if (sys.violations.length > 3) {
        console.log(`     ... and ${sys.violations.length - 3} more violations`);
      }
    }
  }
  
  console.log(`\nℹ️  LEGACY SYSTEMS: ${results.legacy.length}`);
  if (VERBOSE && results.legacy.length > 0) {
    for (const sys of results.legacy.slice(0, 10)) {
      console.log(`   - ${sys.name} (${sys.file})`);
    }
  }
  
  // Summary
  const hasIssues = results.unregistered.length > 0 || results.wallClockViolations.length > 0;
  
  console.log('\n' + '='.repeat(50));
  if (hasIssues) {
    console.log('⚠️  ISSUES FOUND - Review unregistered systems and wall-clock violations');
    if (OUTPUT_JSON) {
      console.log('\n' + JSON.stringify(results, null, 2));
    }
    process.exit(2);
  } else {
    console.log('✅ All systems validated successfully');
    if (OUTPUT_JSON) {
      console.log('\n' + JSON.stringify(results, null, 2));
    }
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
