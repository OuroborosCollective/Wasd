#!/usr/bin/env node
/**
 * scripts/audit-system-registration.mjs
 * 
 * IMPORTANT: This is a STATIC HEURISTIC audit. It does not validate runtime behavior.
 * Systems are verified by analyzing source code patterns, not by executing the server.
 * 
 * Checks:
 * - implements TickSystem interface
 * - registered in ARE bootstrap (ServerBootstrap.ts, index.ts, installers)
 * - receives tick events
 * - uses deterministic patterns (respects ARE-DETERMINISM-ALLOW)
 * 
 * Modes:
 *   --baseline  Report findings without failing (for CI baseline)
 *   --strict    Fail on any findings (default behavior when not in baseline)
 *   --verbose   Show detailed output
 *   --json      Output machine-readable JSON
 * 
 * Output:
 * {
 *   "active": [...],
 *   "registeredNotExecuting": [...],
 *   "unregistered": [...],
 *   "legacy": [...],
 *   "wallClockViolations": [...],
 *   "metadataFieldCandidates": [...],
 *   "determinismExceptions": [...]
 * }
 * 
 * Usage:
 *   node scripts/audit-system-registration.mjs [--verbose]
 *   node scripts/audit-system-registration.mjs --baseline
 *   node scripts/audit-system-registration.mjs --strict
 * 
 * Exit codes:
 *   0 - Success (in baseline mode: findings reported, no failure)
 *   1 - Critical failure
 *   2 - Findings reported (strict mode only)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, basename, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const ARGV = process.argv.slice(2);
const VERBOSE = ARGV.includes('--verbose') || ARGV.includes('-v');
const OUTPUT_JSON = ARGV.includes('--json');
const BASELINE_MODE = ARGV.includes('--baseline');
const STRICT_MODE = ARGV.includes('--strict');

const results = {
  mode: BASELINE_MODE ? 'baseline' : (STRICT_MODE ? 'strict' : 'standard'),
  active: [],           // Systems registered and executing
  registeredNotExecuting: [],  // Systems imported but not receiving ticks
  unregistered: [],     // Systems implementing TickSystem but not registered
  legacy: [],          // Systems not using tick-based architecture
  wallClockViolations: [],  // Runtime calculations using Date.now, Math.random, etc.
  metadataFieldCandidates: [], // createdAt/updatedAt field names (not violations alone)
  determinismExceptions: [],  // ARE-DETERMINISM-ALLOW exceptions found
  warnings: []
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
 * 
 * IMPORTANT: Only counts as violation if:
 * - Pattern is paired with Date.now(), new Date(), or performance.now()
 * - NOT marked with ARE-DETERMINISM-ALLOW or @are-telemetry-side-channel
 * 
 * Field names like createdAt, updatedAt are metadataFieldCandidates, not violations
 * unless they're being assigned from wall-clock sources.
 */
function findWallClockViolations(filePath, content) {
  const violations = [];
  const metadataCandidates = [];
  const exceptions = [];
  
  const simulationPaths = [
    'server/src/modules',
    'server/src/core',
    'server/src/gameplay',
    'server/src/simulation'
  ];
  
  const isSimulationPath = simulationPaths.some(p => filePath.includes(p));
  if (!isSimulationPath) return { violations, metadataCandidates, exceptions };
  
  const lines = content.split('\n');
  
  // Check for ARE-DETERMINISM-ALLOW comments and extract them
  const allowPattern = /ARE-DETERMINISM-ALLOW[:\s]*(.*)/g;
  const sideChannelPattern = /@are-telemetry-side-channel/g;
  const persistenceOnlyPattern = /persistence-only|persistence.*only/g;
  
  let allowMatch;
  const allowedPatterns = [];
  while ((allowMatch = allowPattern.exec(content)) !== null) {
    allowedPatterns.push(allowMatch[1]?.trim() || 'true');
    exceptions.push({
      type: 'ARE-DETERMINISM-ALLOW',
      line: content.substring(0, allowMatch.index).split('\n').length,
      reason: allowMatch[1]?.trim() || 'Allowed'
    });
  }
  
  if (sideChannelPattern.test(content)) {
    exceptions.push({
      type: '@are-telemetry-side-channel',
      message: 'File marked as side-channel (observability only)'
    });
  }
  
  // If file has persistence-only comment, be lenient
  if (persistenceOnlyPattern.test(content)) {
    exceptions.push({
      type: 'persistence-only',
      message: 'File marked as persistence-only'
    });
  }
  
  // Hard violations: actual wall-clock usage
  const hardPatterns = [
    { pattern: /Date\.now\s*\(/g, type: 'Date.now()', category: 'wall-clock' },
    { pattern: /performance\.now\s*\(/g, type: 'performance.now()', category: 'wall-clock' },
    { pattern: /Math\.random\s*\(/g, type: 'Math.random()', category: 'non-deterministic' },
    { pattern: /crypto\.getRandomValues/g, type: 'crypto.getRandomValues()', category: 'non-deterministic' }
  ];
  
  for (const { pattern, type, category } of hardPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const lineContent = lines[lineNum - 1] || '';
      
      // Check if this line is inside an ARE-DETERMINISM-ALLOW block
      const isAllowed = allowedPatterns.some(allowed => 
        lineContent.includes(allowed) || 
        content.substring(0, match.index).includes('ARE-DETERMINISM-ALLOW')
      );
      
      if (!isAllowed) {
        violations.push({
          type,
          category,
          line: lineNum,
          snippet: lineContent.trim().substring(0, 100)
        });
      }
    }
  }
  
  // Soft violations: new Date() - may be OK for persistence metadata
  const datePattern = /new\s+Date\s*\(/g;
  let dateMatch;
  while ((dateMatch = datePattern.exec(content)) !== null) {
    const lineNum = content.substring(0, dateMatch.index).split('\n').length;
    const lineContent = lines[lineNum - 1] || '';
    
    const isAllowed = 
      lineContent.includes('ARE-DETERMINISM-ALLOW') ||
      lineContent.includes('@are-telemetry-side-channel') ||
      lineContent.includes('persistence-only') ||
      lineContent.includes('persistence metadata') ||
      lineContent.includes('toISOString') && lineContent.includes('0') || // Determinism placeholder
      lineContent.includes('Date.now') || // Already checked Date.now above
      lineContent.includes('Date.parse');
    
    if (!isAllowed) {
      violations.push({
        type: 'new Date()',
        category: 'wall-clock',
        line: lineNum,
        snippet: lineContent.trim().substring(0, 100)
      });
    }
  }
  
  // Metadata field candidates: createdAt, updatedAt, etc.
  // These are NOT violations unless assigned from wall-clock sources
  const metadataPatterns = [
    { pattern: /createdAt/g, type: 'createdAt field' },
    { pattern: /updatedAt/g, type: 'updatedAt field' },
    { pattern: /lastSeen/g, type: 'lastSeen field' },
    { pattern: /lastActive/g, type: 'lastActive field' }
  ];
  
  for (const { pattern, type } of metadataPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const lineContent = lines[lineNum - 1] || '';
      
      // Skip if already counted as violation or if it's just a type definition
      const isViolation = violations.some(v => v.line === lineNum && v.type.includes(type));
      const isTypeDef = lineContent.includes(`: ${type.replace(' field', '')}`) ||
                        lineContent.includes(`type ${type.replace(' field', '')}`);
      
      if (!isViolation && !isTypeDef) {
        // Check if this is a wall-clock assignment
        const isWallClockAssignment = 
          lineContent.includes('Date.now()') ||
          lineContent.includes('new Date()') ||
          lineContent.includes('performance.now()');
        
        if (isWallClockAssignment && !lineContent.includes('ARE-DETERMINISM-ALLOW')) {
          violations.push({
            type: `${type} from wall-clock`,
            category: 'wall-clock',
            line: lineNum,
            snippet: lineContent.trim().substring(0, 100)
          });
        } else {
          metadataCandidates.push({
            type,
            line: lineNum,
            snippet: lineContent.trim().substring(0, 100)
          });
        }
      }
    }
  }
  
  return { violations, metadataCandidates, exceptions };
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
  console.log(`Mode: ${results.mode.toUpperCase()}`);
  console.log('⚠️  This is a STATIC HEURISTIC - does not validate runtime behavior\n');
  
  // Scan multiple bootstrap sources
  const bootstrapFiles = [
    join(ROOT, 'server/src/index.ts'),
    join(ROOT, 'server/src/core/ServerBootstrap.ts'),
  ];
  
  let allBootstrapContent = '';
  for (const bf of bootstrapFiles) {
    if (existsSync(bf)) {
      allBootstrapContent += '\n' + readFileSync(bf, 'utf-8');
    }
  }
  
  // Also scan installer/registration files
  const installerFiles = findTsFiles(join(ROOT, 'server/src/modules'), []);
  for (const f of installerFiles) {
    if (f.includes('install') || f.includes('register') || f.includes('bootstrap')) {
      try {
        allBootstrapContent += '\n' + readFileSync(f, 'utf-8');
      } catch (e) {
        // Skip
      }
    }
  }
  
  const serverModulesPath = join(ROOT, 'server/src/modules');
  const serverCorePath = join(ROOT, 'server/src/core');
  
  // Find all TypeScript files (deduplicated)
  const allFilesSet = new Set([
    ...findTsFiles(serverModulesPath, []),
    ...findTsFiles(serverCorePath, []),
    ...findTsFiles(join(ROOT, 'server/src/gameplay'), [])
  ]);
  const allFiles = [...allFilesSet];
  
  console.log(`📊 Scanning ${allFiles.length} files for TickSystem patterns...`);
  
  const registeredSystems = new Set();
  
  // Parse bootstrap to find registered systems
  const registerPatterns = [
    /install(\w+)\s*\(/g,
    /register(\w+)\s*\(/g,
    /new\s+(\w+)\s*\(/g
  ];
  
  for (const pattern of registerPatterns) {
    let match;
    while ((match = pattern.exec(allBootstrapContent)) !== null) {
      registeredSystems.add(match[1]);
    }
  }
  
  console.log(`📊 Found ${registeredSystems.size} registered systems in bootstrap sources`);
  
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
      
      // Check for wall-clock violations (with enhanced detection)
      const { violations, metadataCandidates, exceptions } = findWallClockViolations(file, content);
      
      if (violations.length > 0) {
        info.violations = violations;
        results.wallClockViolations.push(info);
      }
      
      if (metadataCandidates.length > 0) {
        info.metadataCandidates = metadataCandidates;
        results.metadataFieldCandidates.push(info);
      }
      
      if (exceptions.length > 0) {
        info.exceptions = exceptions;
        results.determinismExceptions.push(info);
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
    for (const sys of results.unregistered.slice(0, 15)) {
      console.log(`   - ${sys.name} (${sys.file})`);
      console.log(`     Uses tick imports but not registered in bootstrap`);
    }
    if (results.unregistered.length > 15) {
      console.log(`   ... and ${results.unregistered.length - 15} more`);
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
    for (const sys of results.wallClockViolations.slice(0, 10)) {
      console.log(`   - ${sys.file}`);
      for (const v of sys.violations.slice(0, 2)) {
        console.log(`     Line ${v.line}: ${v.type} - ${v.snippet}`);
      }
      if (sys.violations.length > 2) {
        console.log(`     ... and ${sys.violations.length - 2} more violations`);
      }
    }
    if (results.wallClockViolations.length > 10) {
      console.log(`   ... and ${results.wallClockViolations.length - 10} more files`);
    }
  }
  
  console.log(`\n📊 METADATA FIELD CANDIDATES: ${results.metadataFieldCandidates.length}`);
  if (VERBOSE && results.metadataFieldCandidates.length > 0) {
    console.log('   (These are NOT violations - just field names that may be persistence metadata)');
    for (const sys of results.metadataFieldCandidates.slice(0, 5)) {
      console.log(`   - ${sys.file}: ${sys.metadataCandidates.length} fields`);
    }
  }
  
  console.log(`\n📊 DETERMINISM EXCEPTIONS: ${results.determinismExceptions.length}`);
  if (VERBOSE && results.determinismExceptions.length > 0) {
    console.log('   (Files with ARE-DETERMINISM-ALLOW or @are-telemetry-side-channel)');
    for (const sys of results.determinismExceptions.slice(0, 5)) {
      console.log(`   - ${sys.file}`);
    }
  }
  
  console.log(`\nℹ️  LEGACY SYSTEMS: ${results.legacy.length}`);
  if (VERBOSE && results.legacy.length > 0) {
    for (const sys of results.legacy.slice(0, 10)) {
      console.log(`   - ${sys.name} (${sys.file})`);
    }
  }
  
  // Add warning about static analysis limitations
  results.warnings.push({
    type: 'STATIC_HEURISTIC',
    message: 'This audit only analyzes source code patterns. Runtime behavior may differ.'
  });
  results.warnings.push({
    type: 'KNOWN_LIMITATION',
    message: 'Metadata fields (createdAt, updatedAt) are flagged separately, not as violations'
  });
  
  // Summary
  const hasIssues = results.unregistered.length > 0 || results.wallClockViolations.length > 0;
  
  console.log('\n' + '='.repeat(50));
  if (hasIssues) {
    if (BASELINE_MODE) {
      console.log('✅ BASELINE MODE: Findings reported (no failure)');
      console.log(`   - ${results.unregistered.length} unregistered systems`);
      console.log(`   - ${results.wallClockViolations.length} wall-clock violations`);
      if (OUTPUT_JSON) {
        console.log('\n' + JSON.stringify(results, null, 2));
      }
      process.exit(0);
    } else {
      console.log('⚠️  ISSUES FOUND - Review unregistered systems and wall-clock violations');
      console.log('   Use --baseline to report without failing');
      if (OUTPUT_JSON) {
        console.log('\n' + JSON.stringify(results, null, 2));
      }
      process.exit(2);
    }
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
