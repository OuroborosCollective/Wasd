#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

/**
 * ARELORIA Stateless Determinism hardcode audit.
 *
 * Axioms may be constants. Runtime state must be resolved from explicit inputs.
 * The audit is intentionally split into ERROR and WARN findings:
 * - ERROR: likely gameplay/world/ARE-core deterministic runtime violation
 * - WARN : UI shell, observability, tests, security/infra time usage, or migration noise
 *
 * Usage:
 *   node scripts/audit-hardcoded-runtime-state.mjs
 *   node scripts/audit-hardcoded-runtime-state.mjs --fail
 *   node scripts/audit-hardcoded-runtime-state.mjs --strict-all
 */

const ROOT = process.cwd();
const FAIL_MODE = process.argv.includes('--fail');
const STRICT_ALL = process.argv.includes('--strict-all');

const DIRECTORIES_TO_SCAN = [
  'apps/client-2d/src',
  'server/src',
];

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const ALLOW_MARKERS = [
  'ARE_AXIOM_ALLOW_HARDCODE',
  'STATELESS_AUDIT_ALLOW',
  'HARDCODE_AUDIT_ALLOW',
  'NON_DETERMINISTIC_SHELL_ALLOW',
];

const ERROR_PATH_HINTS = [
  'apps/client-2d/src/DeterministicWorldIsoApp.tsx',
  'apps/client-2d/src/world/',
  'apps/client-2d/src/game/',
  'apps/client-2d/src/logic/',
  'apps/client-2d/src/input/',
  'apps/client-2d/src/live/playerVitalState.ts',
  'server/src/core/are/',
  'server/src/engine/',
  'server/src/gameplay/',
  'server/src/inventory/',
  'server/src/equipment/',
  'server/src/skills/',
  'server/src/crafting/',
  'server/src/economy/',
  'server/src/resources/',
  'server/src/quests/',
  'server/src/npc/',
  'server/src/market/',
  'server/src/systems/',
];

const WARN_PATH_HINTS = [
  '/__tests__/',
  '/tests/',
  '.test.',
  '.spec.',
  'benchmark-',
  'apps/client-2d/src/main.tsx',
  'apps/client-2d/src/ui/',
  'apps/client-2d/src/AREHeartbeatPanel.tsx',
  'apps/client-2d/src/LiveRealityBridge.tsx',
  'apps/client-2d/src/SelfHealWorkshopPanel.tsx',
  'server/src/api/',
  'server/src/auth/',
  'server/src/ai/',
  'server/src/assets/',
  'server/src/selfheal/',
  'server/src/selfhealing/',
  'server/src/networking/',
];

const TOXIC_PATTERNS = [
  {
    id: 'hardcoded-player-guest',
    regex: /(?:playerId|DEFAULT_GAMEPLAY_PLAYER_ID)\s*(?::[^=]+)?=\s*['"]guest['"]/g,
    reason: 'Hardcoded player id: resolve from identity/session/token instead.',
    class: 'runtime-state',
  },
  {
    id: 'hardcoded-player-anonymous',
    regex: /(?:playerId|DEFAULT_GAMEPLAY_PLAYER_ID)\s*(?::[^=]+)?=\s*['"]anonymous['"]/g,
    reason: 'Hardcoded anonymous player id: resolve deterministic anonymous identity instead.',
    class: 'runtime-state',
  },
  {
    id: 'hardcoded-world-seed',
    regex: /\bWORLD_SEED\s*(?::[^=]+)?=\s*['"][^'"]+['"]/g,
    reason: 'World seed should come from runtime config, URL, DB, or resolver input.',
    class: 'world-state',
  },
  {
    id: 'hardcoded-chunk-x-zero',
    regex: /\bchunkX\s*:\s*0\b|\bchunkX\s*=\s*0\b/g,
    reason: 'Chunk X must be derived from spawn/current position, not fixed to zero.',
    class: 'world-state',
  },
  {
    id: 'hardcoded-chunk-z-zero',
    regex: /\bchunkZ\s*:\s*0\b|\bchunkZ\s*=\s*0\b/g,
    reason: 'Chunk Z must be derived from spawn/current position, not fixed to zero.',
    class: 'world-state',
  },
  {
    id: 'hardcoded-biome-id',
    regex: /\bbiomeId\s*:\s*['"][^'"]+['"]|\bbiomeId\s*=\s*['"][^'"]+['"]/g,
    reason: 'Biome id should be derived from seed + chunk coordinates.',
    class: 'world-state',
  },
  {
    id: 'architect-fallback-name',
    regex: /\b(playerName|displayName|name)\s*(?::[^=]+)?=\s*[^;\n]*['"]Architect['"]/g,
    reason: 'Fallback names should pass through a deterministic identity/display resolver.',
    class: 'runtime-state',
  },
  {
    id: 'volatile-logic-date-now',
    regex: /\bDate\.now\s*\(/g,
    reason: 'Date.now() is forbidden in deterministic gameplay/runtime logic; use tick/manifest input.',
    class: 'volatile-call',
  },
  {
    id: 'volatile-logic-math-random',
    regex: /\bMath\.random\s*\(/g,
    reason: 'Math.random() is forbidden; use deterministic seeded hashing/RNG.',
    class: 'volatile-call',
  },
];

function isSourceFile(filePath) {
  return EXTENSIONS.has(path.extname(filePath));
}

function hasAllowMarker(line) {
  return ALLOW_MARKERS.some((marker) => line.includes(marker));
}

function isWarnPath(relPath) {
  return WARN_PATH_HINTS.some((hint) => relPath.includes(hint));
}

function isErrorPath(relPath) {
  return ERROR_PATH_HINTS.some((hint) => relPath.includes(hint));
}

function severityFor(relPath, pattern) {
  if (STRICT_ALL) return 'error';
  if (isWarnPath(relPath)) return 'warn';
  if (pattern.class === 'world-state') return 'error';
  if (pattern.class === 'runtime-state' && isErrorPath(relPath)) return 'error';
  if (pattern.class === 'volatile-call' && isErrorPath(relPath)) return 'error';
  return 'warn';
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

function maskComments(content) {
  let output = '';
  let inBlock = false;
  let inString = null;
  let escaped = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    const next = content[i + 1];

    if (inBlock) {
      if (ch === '*' && next === '/') {
        output += '  ';
        i += 1;
        inBlock = false;
      } else {
        output += ch === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (inString) {
      output += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === '/' && next === '*') {
      output += '  ';
      i += 1;
      inBlock = true;
      continue;
    }

    if (ch === '/' && next === '/') {
      output += '  ';
      i += 1;
      while (i + 1 < content.length && content[i + 1] !== '\n') {
        output += ' ';
        i += 1;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      output += ch;
      continue;
    }

    output += ch;
  }

  return output;
}

function auditFile(relPath) {
  const content = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const searchable = maskComments(content);
  const findings = [];

  for (const pattern of TOXIC_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(searchable)) !== null) {
      const line = lineNumberForIndex(searchable, match.index);
      const sourceLine = lineAt(content, line);
      if (hasAllowMarker(sourceLine)) continue;
      findings.push({
        file: relPath,
        line,
        id: pattern.id,
        reason: pattern.reason,
        match: match[0].trim(),
        severity: severityFor(relPath, pattern),
      });
    }
  }

  return findings;
}

function printFinding(finding) {
  const annotation = finding.severity === 'error' ? 'error' : 'warning';
  console.warn(`::${annotation} file=${finding.file},line=${finding.line},title=${finding.id}::${finding.reason}`);
  console.warn(`[${finding.severity.toUpperCase()}] ${finding.file}:${finding.line}`);
  console.warn(`  rule: ${finding.id}`);
  console.warn(`  why : ${finding.reason}`);
  console.warn(`  hit : ${finding.match}\n`);
}

console.log('=== ARELORIA: Stateless Determinism Hardcode Audit ===');
console.log('Scanning for hidden runtime state in source code...\n');

const files = DIRECTORIES_TO_SCAN.flatMap((dir) => walk(dir));
const findings = files.flatMap(auditFile);
const errors = findings.filter((finding) => finding.severity === 'error');
const warnings = findings.filter((finding) => finding.severity === 'warn');

if (findings.length === 0) {
  console.log('No toxic runtime hardcoding found by current rules.');
  process.exit(0);
}

for (const finding of errors) printFinding(finding);
for (const finding of warnings) printFinding(finding);

console.warn(`Audit complete: ${errors.length} error(s), ${warnings.length} warning(s), ${findings.length} total finding(s).`);
console.warn('Errors must be resolverized. Warnings should be reviewed, marked, or moved outside deterministic runtime paths.');

if (FAIL_MODE && errors.length > 0) process.exit(1);
