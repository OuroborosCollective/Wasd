/**
 * Module Analysis Scanner
 * 
 * Scans all modules in server/src/modules/ and categorizes them:
 * - Category A: ARE-Aligned (follows TickSystem pattern)
 * - Category B: Deterministic-Ready (has game logic, needs ARE wrapping)
 * - Category C: Math/Date Utilities (pure functions, make deterministic)
 * - Category D: Non-Deterministic (uses Math.random/Date.now, needs refactoring)
 * - Category E: Stub/Fake (no real logic, delete)
 * 
 * Usage: node scripts/analyze-modules.mjs [--verbose] [--category=<A-E>] [--module=<name>]
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename, extname } from 'path';
import { argv } from 'process';

const MODULES_DIR = 'server/src/modules';
const ARE_DIR = 'server/src/core/are';

// Patterns to detect
const PATTERNS = {
  // ARE-aligned patterns
  TICK_SYSTEM: /implements\s+TickSystem|extends\s+TickSystem|registerTickSystem/,
  TICK_SYSTEM_PRIORITY: /TickSystemPriority\./,
  KAPPA_TYPES: /Kappa|TickId|StateHash|ChunkKey/,
  DETERMINISTIC_PRNG: /DeterministicPrng|createDeterministicPrng|SeededARERng/,
  DELTA_PATTERN: /\bDelta\b|StateDelta|generateDelta/,
  
  // Non-deterministic patterns (Category D) - need to verify context
  MATH_RANDOM: /Math\.random\(/,
  DATE_NOW_ACTUAL: /Date\.now\(\)/,
  DATE_NEW_WITH_ALLOW: /new\s+Date\([^)]*\)\s*\/\*\s*ARE-DETERMINISM-ALLOW/,
  DATE_NEW_BARE: /new\s+Date\(\)/,
  PERFORMANCE_NOW: /performance\.now\(\)/,
  SET_TIMEOUT: /setTimeout|setInterval/,
  
  // Import patterns
  WORLD_TICK_IMPORT: /WorldTick[^a-zA-Z]|from\s+['"]\.\.\/WorldTick|WorldTickProvider/,
  
  // Stub patterns
  STUB_RETURN_NULL: /return\s+null|return\s+undefined/,
  STUB_EMPTY_ARRAY: /return\s*\[\s*\]/,
  STUB_NOT_IMPLEMENTED: /throw\s+new\s+Error\(['"]Not\s+implemented|NOT\s+IMPLEMENTED/i,
  STUB_COMMENT: /\/\/\s*(TODO|FIXME|HACK|stub|placeholder)/i,
  
  // Import patterns for analysis
  ARE_IMPORT: /from\s+['"]\.\.\/\.\.\/core\/are|from\s+['"]\.\/are\//,
  
  // ARE allowed patterns (not actually non-deterministic)
  ARE_TELEMETRY_SIDECHANNEL: /@are-telemetry-side-channel/,
  ARE_DETERMINISM_ALLOW: /ARE-DETERMINISM-ALLOW/,
};

// Parse command line args
const args = argv.slice(2);
const options = {
  verbose: args.includes('--verbose'),
  ci: args.includes('--ci'),
  category: args.find(a => a.startsWith('--category='))?.split('=')[1],
  module: args.find(a => a.startsWith('--module='))?.split('=')[1],
  failOn: args.find(a => a.startsWith('--fail-on='))?.split('=')[1]?.split(',') || [],
};

const ModuleAnalysis = {
  path: '',
  module: '',
  filename: '',
  category: 'A',
  patterns: [],
  issues: [],
  lines: 0,
  imports: [],
};

function scanFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').length;
    
    // Extract imports
    const imports = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return { content, lines, imports };
  } catch (e) {
    return null;
  }
}

function categorizeModule(analysis) {
  const { content, lines, imports } = analysis;
  
  const patternsFound = [];
  const issues = [];
  
  // Check for ARE-aligned patterns
  const isAREAligned = PATTERNS.TICK_SYSTEM.test(content) || 
                       PATTERNS.TICK_SYSTEM_PRIORITY.test(content) ||
                       PATTERNS.KAPPA_TYPES.test(content);
  
  // Check for deterministic patterns
  const hasDeterministicPrng = PATTERNS.DETERMINISTIC_PRNG.test(content);
  const hasDelta = PATTERNS.DELTA_PATTERN.test(content);
  
  // Check for non-deterministic patterns (accounting for ARE annotations)
  const hasMathRandom = PATTERNS.MATH_RANDOM.test(content);
  const hasDateNowActual = PATTERNS.DATE_NOW_ACTUAL.test(content);
  const hasDateNewBare = PATTERNS.DATE_NEW_BARE.test(content) && !PATTERNS.DATE_NEW_WITH_ALLOW.test(content);
  const hasPerformanceNow = PATTERNS.PERFORMANCE_NOW.test(content);
  const hasSetTimeout = PATTERNS.SET_TIMEOUT.test(content);
  const hasWorldTickImport = PATTERNS.WORLD_TICK_IMPORT.test(content);
  
  // Check for ARE annotations that allow certain patterns
  const hasAREAllow = PATTERNS.ARE_DETERMINISM_ALLOW.test(content);
  const hasTelemetrySideChannel = PATTERNS.ARE_TELEMETRY_SIDECHANNEL.test(content);
  
  // Check for stub patterns
  const isStub = PATTERNS.STUB_NOT_IMPLEMENTED.test(content) ||
                 (PATTERNS.STUB_RETURN_NULL.test(content) && lines < 30);
  const hasStubComments = PATTERNS.STUB_COMMENT.test(content);
  
  if (isAREAligned) patternsFound.push('TICK_SYSTEM');
  if (hasDeterministicPrng) patternsFound.push('DETERMINISTIC_PRNG');
  if (hasDelta) patternsFound.push('DELTA');
  
  // Only flag Math.random as issue if not marked with ARE-DETERMINISM-ALLOW
  if (hasMathRandom) {
    patternsFound.push('MATH_RANDOM');
    if (!hasAREAllow) {
      issues.push('Uses Math.random - should use DeterministicPrng');
    }
  }
  
  if (hasDateNowActual) {
    patternsFound.push('DATE_NOW');
    issues.push('Uses Date.now() - non-deterministic');
  }
  
  if (hasDateNewBare && !hasTelemetrySideChannel) {
    patternsFound.push('DATE_NEW');
    issues.push('Uses bare new Date() - may be non-deterministic');
  }
  
  if (hasPerformanceNow && !hasAREAllow) {
    patternsFound.push('PERFORMANCE_NOW');
    issues.push('Uses performance.now() - check if for telemetry only');
  }
  
  if (hasSetTimeout) patternsFound.push('SET_TIMEOUT');
  
  // WorldTick import is expected in integration files, flag only in tick systems
  if (hasWorldTickImport && !isAREAligned) {
    // Only flag if not a wiring/integration file
    const isIntegrationFile = content.includes('installARELootIntegration') || 
                              content.includes('installDecomposition') ||
                              content.includes('installRuntime');
    if (!isIntegrationFile) {
      issues.push('Direct WorldTick import - should use TickSystemContext');
    }
  }
  
  if (isStub) patternsFound.push('STUB');
  if (hasStubComments) issues.push('Contains TODO/FIXME/HACK comments');
  
  // Categorize
  let category;
  if (isStub && !isAREAligned) {
    category = 'E';
  } else if (hasMathRandom && !hasAREAllow) {
    category = 'D';
  } else if (hasDateNowActual || (hasDateNewBare && !hasTelemetrySideChannel)) {
    category = 'D';
  } else if (hasPerformanceNow && !hasAREAllow) {
    category = 'D';
  } else if (isAREAligned && hasDeterministicPrng) {
    category = 'A';
  } else if (isAREAligned || hasDelta) {
    category = 'B';
  } else if (patternsFound.length === 0 || hasStubComments) {
    category = 'C';
  } else {
    category = 'B';
  }
  
  return { category, patterns: patternsFound, issues };
}

function analyzeModules() {
  const results = [];
  
  // Get all module directories
  const moduleDirs = readdirSync(MODULES_DIR).filter(name => {
    const stat = statSync(join(MODULES_DIR, name));
    return stat.isDirectory();
  });
  
  for (const moduleDir of moduleDirs) {
    const modulePath = join(MODULES_DIR, moduleDir);
    const files = readdirSync(modulePath).filter(f => extname(f) === '.ts');
    
    for (const file of files) {
      const filePath = join(modulePath, file);
      const scan = scanFile(filePath);
      
      if (!scan) continue;
      
      const { lines, imports } = scan;
      const { category, patterns, issues } = categorizeModule({ 
        content: scan.content, 
        lines, 
        imports 
      });
      
      // Filter by options
      if (options.category && options.category !== category) continue;
      if (options.module && options.module !== moduleDir) continue;
      
      results.push({
        path: relative(process.cwd(), filePath),
        module: moduleDir,
        filename: file,
        category,
        patterns,
        issues,
        lines,
        imports: imports.slice(0, 5), // First 5 imports for brevity
      });
    }
  }
  
  return results;
}

function printResults(results) {
  const categories = { A: [], B: [], C: [], D: [], E: [] };
  
  for (const r of results) {
    categories[r.category].push(r);
  }
  
  console.log('\n=== MODULE ANALYSIS REPORT ===\n');
  console.log(`Total modules analyzed: ${results.length}`);
  console.log('\n--- BY CATEGORY ---');
  
  for (const [cat, modules] of Object.entries(categories)) {
    const catNames = {
      A: 'ARE-Aligned (follows standard)',
      B: 'Deterministic-Ready (needs ARE wrapping)',
      C: 'Math/Date Utilities (make deterministic)',
      D: 'Non-Deterministic (needs refactoring)',
      E: 'Stub/Fake (delete)',
    };
    console.log(`\nCategory ${cat} [${catNames[cat]}]: ${modules.length} modules`);
    
    if (options.verbose || modules.length <= 20) {
      for (const m of modules) {
        const issueStr = m.issues.length > 0 ? ` ⚠ ${m.issues.join(', ')}` : '';
        console.log(`  - ${m.module}/${m.filename} (${m.lines} lines)${issueStr}`);
        if (options.verbose && m.patterns.length > 0) {
          console.log(`    Patterns: ${m.patterns.join(', ')}`);
        }
      }
    } else {
      console.log(`  ${modules.map(m => m.filename).join(', ')}`);
    }
  }
  
  // Summary statistics
  console.log('\n--- SUMMARY ---');
  console.log(`ARE-Aligned (A): ${categories.A.length}`);
  console.log(`Deterministic-Ready (B): ${categories.B.length}`);
  console.log(`Math/Date Utilities (C): ${categories.C.length}`);
  console.log(`Non-Deterministic (D): ${categories.D.length}`);
  console.log(`Stub/Fake (E): ${categories.E.length}`);
  
  const totalNonDeterministic = categories.D.length + categories.E.length;
  console.log(`\nActionable: ${categories.B.length + categories.C.length + categories.D.length + categories.E.length} modules need attention`);
  console.log(`Immediate delete candidates: ${categories.E.length} stubs`);
  console.log(`Critical fixes needed: ${categories.D.length} non-deterministic`);

  // CI mode: exit non-zero if blocked categories found
  if (options.ci || options.failOn.length > 0) {
    const blockedCats = options.failOn.length > 0 ? options.failOn : ['D', 'E'];
    const blocked = blockedCats.flatMap(c => categories[c] || []);
    const nonBlocked = blockedCats.filter(c => categories[c]?.length > 0);

    if (nonBlocked.length > 0) {
      console.log(`\n❌ CI GATE FAILED: Found ${blocked.length} module(s) in blocked categories: ${nonBlocked.join(', ')}`);
      console.log('   Use --fail-on=D,E to block D and E categories (default in CI mode)');
      console.log('   Use --fail-on=D to block only non-deterministic modules');
      if (options.ci) {
        console.log('\n=== CI MODE: EXIT 1 ===');
        process.exit(1);
      }
    } else {
      console.log('\n✅ CI GATE PASSED: No blocked categories found');
    }
  }
}

const results = analyzeModules();
printResults(results);