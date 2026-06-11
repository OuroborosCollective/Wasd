#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

/**
 * ARELORIA Stateless Determinism hardcode audit.
 *
 * Axioms may be constants. Runtime state must be resolved from explicit inputs.
 * This scanner finds common toxic literals that tend to freeze world/player state
 * inside code instead of deriving it through resolvers.
 *
 * Usage:
 *   node scripts/audit-hardcoded-runtime-state.mjs
 *   node scripts/audit-hardcoded-runtime-state.mjs --fail
 */

const ROOT = process.cwd();
const FAIL_MODE = process.argv.includes('--fail');

const DIRECTORIES_TO_SCAN = [
  'apps/client-2d/src',
  'server/src',
];

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const ALLOW_MARKERS = [
  'ARE_AXIOM_ALLOW_HARDCODE',
  'STATELESS_AUDIT_ALLOW',
  'HARDCODE_AUDIT_ALLOW',
];

const TOXIC_PATTERNS = [
  {
    id: 'hardcoded-player-guest',
    regex: /(?:playerId|DEFAULT_GAMEPLAY_PLAYER_ID)\s*(?::[^=]+)?=\s*['"]guest['"]/g,
    reason: 'Hardcoded player id: resolve from identity/session/token instead.',
  },
  {
    id: 'hardcoded-player-anonymous',
    regex: /(?:playerId|DEFAULT_GAMEPLAY_PLAYER_ID)\s*(?::[^=]+)?=\s*['"]anonymous['"]/g,
    reason: 'Hardcoded anonymous player id: resolve deterministic anonymous identity instead.',
  },
  {
    id: 'hardcoded-world-seed',
    regex: /\bWORLD_SEED\s*(?::[^=]+)?=\s*['"][^'"]+['"]/g,
    reason: 'World seed should come from runtime config, URL, DB, or resolver input.',
  },
  {
    id: 'hardcoded-chunk-x-zero',
    regex: /\bchunkX\s*:\s*0\b|\bchunkX\s*=\s*0\b/g,
    reason: 'Chunk X must be derived from spawn/current position, not fixed to zero.',
  },
  {
    id: 'hardcoded-chunk-z-zero',
    regex: /\bchunkZ\s*:\s*0\b|\bchunkZ\s*=\s*0\b/g,
    reason: 'Chunk Z must be derived from spawn/current position, not fixed to zero.',
  },
  {
    id: 'hardcoded-biome-id',
    regex: /\bbiomeId\s*:\s*['"][^'"]+['"]|\bbiomeId\s*=\s*['"][^'"]+['"]/g,
    reason: 'Biome id should be derived from seed + chunk coordinates.',
  },
  {
    id: 'architect-fallback-name',
    regex: /\b(playerName|displayName|name)\s*(?::[^=]+)?=\s*[^;\n]*['"]Architect['"]/g,
    reason: 'Fallback names should pass through a deterministic identity/display resolver.',
  },
  {
    id: 'volatile-logic-date-now',
    regex: /\bDate\.now\s*\(/g,
    reason: 'Date.now() is forbidden in deterministic gameplay/runtime logic; use tick/manifest input.',
  },
  {
    id: 'volatile-logic-math-random',
    regex: /\bMath\.random\s*\(/g,
    reason: 'Math.random() is forbidden; use deterministic seeded hashing/RNG.',
  },
];

function isSourceFile(filePath) {
  return EXTENSIONS.has(path.extname(filePath));
}

function hasAllowMarker(line) {
  return ALLOW_MARKERS.some((marker) => line.includes(marker));
}

function walk(dir, output = []) {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) return output;

  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const fullPath = path.join(absolute, entry.name);
    const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue;
      walk(relPath, output);
      continue;
    }

    if (entry.isFile() && isSourceFile(fullPath)) output.push(relPath);
  }

  return output;
}

function lineNumberForIndex(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function lineAt(content, lineNumber) {
  return content.split(/\r?\n/)[lineNumber - 1] ?? '';
}

function auditFile(relPath) {
  const content = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const findings = [];

  for (const pattern of TOXIC_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const line = lineNumberForIndex(content, match.index);
      const sourceLine = lineAt(content, line);
      if (hasAllowMarker(sourceLine)) continue;
      findings.push({
        file: relPath,
        line,
        id: pattern.id,
        reason: pattern.reason,
        match: match[0].trim(),
      });
    }
  }

  return findings;
}

console.log('=== ARELORIA: Stateless Determinism Hardcode Audit ===');
console.log('Scanning for hidden runtime state in source code...\n');

const files = DIRECTORIES_TO_SCAN.flatMap((dir) => walk(dir));
const findings = files.flatMap(auditFile);

if (findings.length === 0) {
  console.log('No toxic runtime hardcoding found by current rules.');
  process.exit(0);
}

for (const finding of findings) {
  console.warn(`[TOXIC STATE] ${finding.file}:${finding.line}`);
  console.warn(`  rule: ${finding.id}`);
  console.warn(`  why : ${finding.reason}`);
  console.warn(`  hit : ${finding.match}\n`);
}

console.warn(`Audit complete: ${findings.length} finding(s).`);
console.warn('Replace runtime literals with resolver inputs or mark true axioms explicitly.');

if (FAIL_MODE) process.exit(1);
