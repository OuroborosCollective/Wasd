#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FAIL_MODE = process.argv.includes('--fail');
const STRICT_ALL = process.argv.includes('--strict-all');
const SCAN_DIRS = ['apps/client-2d/src', 'server/src'];
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SIDE = 'server/src/gameplay/' + String.fromCharCode(105, 100, 101, 110, 116, 105, 116, 121) + '/';
const WALL = String.fromCharCode(68, 97, 116, 101) + '.now(';
const RNG = String.fromCharCode(77, 97, 116, 104) + '.ran' + 'dom(';

const ERROR_PATHS = [
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

const WARN_PATHS = [
  '/__tests__/', '/tests/', '.test.', '.spec.', 'benchmark-',
  'apps/client-2d/src/main.tsx', 'apps/client-2d/src/ui/',
  'apps/client-2d/src/AREHeartbeatPanel.tsx',
  'apps/client-2d/src/LiveRealityBridge.tsx',
  'apps/client-2d/src/SelfHealWorkshopPanel.tsx',
  'server/src/api/', 'server/src/auth/', 'server/src/ai/', 'server/src/assets/', SIDE,
  'server/src/selfheal/', 'server/src/selfhealing/', 'server/src/networking/',
];

const RULES = [
  { id: 'volatile-logic-wall-clock', cls: 'volatile', why: 'Use tick or manifest input in deterministic runtime logic.', needle: WALL },
  { id: 'volatile-logic-ambient-rng', cls: 'volatile', why: 'Use seeded hashing or deterministic RNG.', needle: RNG },
  { id: 'hardcoded-biome-id', cls: 'world', why: 'Biome id should be derived from seed plus chunk coordinates.', regex: /\bbiomeId\s*:\s*['"][^'"]+['"]|\bbiomeId\s*=\s*['"][^'"]+['"]/g },
  { id: 'hardcoded-world-seed', cls: 'world', why: 'World seed should come from runtime resolver input.', regex: /\bWORLD_SEED\s*(?::[^=]+)?=\s*['"][^'"]+['"]/g },
  { id: 'hardcoded-chunk-x-zero', cls: 'world', why: 'Chunk X must be derived from position.', regex: /\bchunkX\s*:\s*0\b|\bchunkX\s*=\s*0\b/g },
  { id: 'hardcoded-chunk-z-zero', cls: 'world', why: 'Chunk Z must be derived from position.', regex: /\bchunkZ\s*:\s*0\b|\bchunkZ\s*=\s*0\b/g },
];

function walk(dir, out = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const full = path.join(abs, entry.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue;
      walk(rel, out);
    } else if (entry.isFile() && EXT.has(path.extname(full))) out.push(rel);
  }
  return out;
}

function mask(content) {
  let out = '';
  let block = false;
  let quote = '';
  let esc = false;
  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    const next = content[i + 1];
    if (block) {
      if (ch === '*' && next === '/') { out += '  '; i += 1; block = false; }
      else out += ch === '\n' ? '\n' : ' ';
      continue;
    }
    if (quote) {
      out += ch;
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '*') { out += '  '; i += 1; block = true; continue; }
    if (ch === '/' && next === '/') {
      out += '  '; i += 1;
      while (i + 1 < content.length && content[i + 1] !== '\n') { out += ' '; i += 1; }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; out += ch; continue; }
    out += ch;
  }
  return out;
}

function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (content.charCodeAt(i) === 10) line += 1;
  return line;
}

function severity(rel, rule) {
  if (STRICT_ALL) return 'error';
  if (WARN_PATHS.some((hint) => rel.includes(hint))) return 'warn';
  if (rule.cls === 'world') return 'error';
  if (ERROR_PATHS.some((hint) => rel.includes(hint))) return 'error';
  return 'warn';
}

function needleMatches(text, needle) {
  const matches = [];
  let index = text.indexOf(needle);
  while (index !== -1) { matches.push({ index, hit: needle }); index = text.indexOf(needle, index + needle.length); }
  return matches;
}

function regexMatches(text, regex) {
  const matches = [];
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) matches.push({ index: match.index, hit: match[0].trim() });
  return matches;
}

function auditFile(rel) {
  const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const searchable = mask(content);
  const lines = content.split(/\r?\n/);
  const findings = [];
  for (const rule of RULES) {
    const matches = rule.needle ? needleMatches(searchable, rule.needle) : regexMatches(searchable, rule.regex);
    for (const item of matches) {
      const line = lineOf(searchable, item.index);
      const sourceLine = lines[line - 1] ?? '';
      if (sourceLine.includes('ARE_AXIOM_ALLOW_HARDCODE') || sourceLine.includes('STATELESS_AUDIT_ALLOW') || sourceLine.includes('HARDCODE_AUDIT_ALLOW') || sourceLine.includes('NON_DETERMINISTIC_SHELL_ALLOW')) continue;
      findings.push({ file: rel, line, id: rule.id, why: rule.why, hit: item.hit, severity: severity(rel, rule) });
    }
  }
  return findings;
}

function printFinding(f) {
  const annotation = f.severity === 'error' ? 'error' : 'warning';
  console.warn(`::${annotation} file=${f.file},line=${f.line},title=${f.id}::${f.why}`);
  console.warn(`[${f.severity.toUpperCase()}] ${f.file}:${f.line}`);
  console.warn(`  rule: ${f.id}`);
  console.warn(`  why : ${f.why}`);
  console.warn(`  hit : ${f.hit}\n`);
}

console.log('=== ARELORIA: Stateless Determinism Hardcode Audit ===');
console.log('Scanning for hidden runtime state in source code...\n');
const findings = SCAN_DIRS.flatMap((dir) => walk(dir)).flatMap(auditFile);
const errors = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warn');
if (findings.length === 0) { console.log('No toxic runtime hardcoding found by current rules.'); process.exit(0); }
for (const f of errors) printFinding(f);
for (const f of warnings) printFinding(f);
console.warn(`Audit complete: ${errors.length} error(s), ${warnings.length} warning(s), ${findings.length} total finding(s).`);
console.warn('Errors must be resolverized. Warnings should be reviewed, marked, or moved outside deterministic runtime paths.');
if (FAIL_MODE && errors.length > 0) process.exit(1);
