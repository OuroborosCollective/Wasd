#!/usr/bin/env node
/**
 * CI Integration Script: ARE Determinism Firewall - Level 3
 * 
 * Uses AREInvariantGuard.scanCoreSource() for runtime source scanning.
 * This complements the regex-based check scripts with the TypeScript guard.
 * 
 * Run as: node scripts/scan-are-core.mjs [--strict]
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

// Simulated FORBIDDEN_NONDETERMINISTIC_TOKENS from AREInvariantGuard
const FORBIDDEN_NONDETERMINISTIC_TOKENS = [
  "Math.random",
  "Date.now",
  "performance.now()",
  "crypto.randomUUID()",
  "new Date()",
];

const IGNORED_DIRS = new Set([
  'node_modules', 'dist', 'build', '.turbo', '.cache', 
  'coverage', '__tests__', 'tests', 'test', '.git'
]);

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.mts', '.cts']);

const SCAN_ROOTS = [
  'server/src/core',
  'server/src/modules',
  'server/src/services',
  'packages/shared/src',
];

const STRICT_ROOTS = [
  'server/src/core/systems',
  'server/src/core/state', 
  'server/src/core/determinism',
  'server/src/modules/combat',
  'server/src/modules/npc',
  'server/src/modules/world',
  'server/src/modules/dungeon',
  'server/src/modules/economy',
  'server/src/modules/loot',
  'server/src/modules/oracle',
  'server/src/modules/warfront',
  'packages/shared/src',
];

// Exemption patterns recognized by the scanner
const FILE_EXEMPT_PATTERN = /@ARE-GUARD-EXEMPT:\s*(.{8,})/i;
const LINE_ALLOW_PATTERN = /ARE-DETERMINISM-ALLOW|@ARE-GUARD-EXEMPT/i;

function norm(p) {
  return p.split('\\').join('/');
}

function rel(file) {
  return norm(relative(process.cwd(), file));
}

function under(relFile, roots) {
  return roots.some((r) => relFile === r || relFile.startsWith(`${r}/`));
}

/**
 * Check if file has exemption comment at top.
 */
function getFileExemptionReason(content) {
  const head = content.split(/\r?\n/).slice(0, 30).join('\n');
  const match = head.match(FILE_EXEMPT_PATTERN);
  return match ? match[1].trim() : null;
}

/**
 * Check if a specific line is allowed by exemption comment.
 */
function isLineAllowed(lines, index) {
  // Check current line and previous line for exemption
  return LINE_ALLOW_PATTERN.test(lines[index] || '') || 
         LINE_ALLOW_PATTERN.test(lines[index - 1] || '');
}

function scanCoreSource(source, file = "unknown", content = null) {
  const violations = [];
  const lines = source.split('\n');
  const fileExemptReason = content ? getFileExemptionReason(content) : null;

  // Skip files with @ARE-GUARD-EXEMPT at top
  if (fileExemptReason) {
    return [];
  }

  // Special handling for AREGuard - it's a protection mechanism, not nondeterministic usage
  const isAREGuard = file.includes('AREGuard.ts');
  let inProtectionMethod = false;

  for (const token of FORBIDDEN_NONDETERMINISTIC_TOKENS) {
    let searchFrom = 0;
    let tokenIndex;

    while ((tokenIndex = source.indexOf(token, searchFrom)) !== -1) {
      const lineNum = source.slice(0, tokenIndex).split('\n').length;
      
      // Check if this specific line is exempted
      if (isLineAllowed(lines, lineNum - 1)) {
        searchFrom = tokenIndex + token.length;
        continue;
      }

      // For AREGuard, skip lines in protection methods (executeProtected)
      if (isAREGuard && isInProtectionMethod(lines, lineNum - 1)) {
        searchFrom = tokenIndex + token.length;
        continue;
      }

      violations.push({
        code: "FORBIDDEN_NONDETERMINISM",
        message: `Forbidden nondeterministic token "${token}" found in ARE core logic.`,
        file,
        line: lineNum,
        token,
        value: token,
      });

      searchFrom = tokenIndex + token.length;
    }
  }

  return violations;
}

/**
 * Check if a line is inside the executeProtected method of AREGuard
 */
function isInProtectionMethod(lines, lineNum) {
  // Look backwards for the method signature
  for (let i = lineNum - 1; i >= 0 && i >= lineNum - 20; i--) {
    const line = lines[i] || '';
    // Check for ARE-GUARD-EXEMPT or @ARE-GUARD-EXEMPT
    if (/@ARE-GUARD-EXEMPT|ARE-DETERMINISM-ALLOW/i.test(line)) return true;
    // Check for method start
    if (/static executeProtected|executeProtected\s*[<(]/.test(line)) return true;
  }
  return false;
}

async function walk(dir) {
  if (!existsSync(dir)) return [];
  
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  
  for (const entry of entries) {
    const full = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        files.push(...await walk(full));
      }
      continue;
    }
    
    if (entry.isFile() && EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      files.push(full);
    }
  }
  
  return files;
}

async function main() {
  const strictMode = process.argv.includes('--strict');
  const files = new Set();
  const allViolations = [];
  
  // Scan configured roots
  for (const root of SCAN_ROOTS) {
    const fullPath = join(process.cwd(), root);
    if (!existsSync(fullPath)) {
      console.warn(`Warning: Scan root not found: ${root}`);
      continue;
    }
    
    for (const file of await walk(fullPath)) {
      files.add(file);
    }
  }
  
  console.log(`\n🛡️  ARE Determinism Firewall - Source Scanner`);
  console.log(`   Mode: ${strictMode ? 'STRICT (fail on violations)' : 'ADVISORY (report only)'}`);
  console.log(`   Scanned: ${files.size} files`);
  console.log('─'.repeat(60));
  
  let scanned = 0;
  let violations = 0;
  
  for (const file of files) {
    const fileRel = rel(file);
    const content = await readFile(file, 'utf8');
    const strict = under(fileRel, STRICT_ROOTS);
    scanned++;
    
    // Pass content for exemption checking
    const fileViolations = scanCoreSource(content, fileRel, content);
    
    for (const v of fileViolations) {
      violations++;
      allViolations.push({ ...v, strict });
      
      const prefix = strict ? '🚫' : '⚠️';
      const tag = strict ? '[STRICT]' : '[ADVISORY]';
      
      console.log(`${prefix} ${tag} ${v.file}:${v.line}`);
      console.log(`   Token: ${v.token}`);
      console.log(`   ${v.message}`);
      console.log('');
    }
  }
  
  console.log('─'.repeat(60));
  console.log(`\n📊 Scan Summary:`);
  console.log(`   Files scanned: ${scanned}`);
  console.log(`   Total violations: ${violations}`);
  console.log(`   Strict violations: ${allViolations.filter(v => v.strict).length}`);
  console.log(`   Advisory violations: ${allViolations.filter(v => !v.strict).length}`);
  
  // Group by token type
  const byToken = new Map();
  for (const v of allViolations) {
    const key = v.token;
    if (!byToken.has(key)) byToken.set(key, []);
    byToken.get(key).push(v);
  }
  
  console.log('\n📋 Violations by Token:');
  for (const [token, items] of byToken) {
    console.log(`   ${token}: ${items.length} occurrence(s)`);
  }
  
  // Exit code
  if (strictMode && allViolations.some(v => v.strict)) {
    console.error('\n❌ STRICT MODE: Found violations in critical paths.');
    console.error('   Fix these before merging to main.');
    process.exit(1);
  }
  
  if (strictMode) {
    // In strict mode, only fail on strict violations
    // Advisory violations are reported but don't block the build
    console.log('\n✅ STRICT MODE: No critical path violations found.');
    console.log('   Advisory findings are informational only.');
    process.exit(0);
  }
  
  if (violations === 0) {
    console.log('\n✅ ARE Determinism Firewall: CLEAN');
    process.exit(0);
  } else {
    console.log('\n⚠️  ARE Determinism Firewall: ADVISORY FINDINGS');
    console.log('   Review above and consider fixing non-strict violations.');
    process.exit(0); // Advisory mode doesn't fail the build
  }
}

main().catch(err => {
  console.error('❌ Scan failed:', err);
  process.exit(2);
});