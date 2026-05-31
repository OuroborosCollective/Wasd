#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();

const criticalRoots = [
  'server/src/core/systems',
  'server/src/core/watchdogs',
  'server/src/modules/brain',
  'server/src/modules/loot',
  'server/src/modules/warfront',
  'server/src/modules/oracle',
  'server/src/modules/farming',
  'server/src/modules/growth',
  'server/src/modules/genealogy',
  'server/src/modules/monster',
  'server/src/modules/npc',
  'server/src/modules/gameplay',
];

const criticalFilePatterns = [
  /^server\/src\/core\/[^/]+Watchdog\.[cm]?[tj]sx?$/,
];

const excludedPaths = [
  '/__tests__/',
  '/tests/',
  '/test/',
  '/dist/',
  '/build/',
  '/coverage/',
  '/node_modules/',
];

const telemetryPaths = [
  'server/src/core/api/',
  'server/src/core/logger/',
  'server/src/core/liveheal/',
  'server/src/core/integrity/',
  'server/src/core/telemetry/',
  'server/src/modules/warfront/WarfrontCombatTelemetry.ts',
];

const blockedPatterns = [
  { name: 'Math.random', regex: /\bMath\.random\s*\(/g },
  { name: 'Date.now', regex: /\bDate\.now\s*\(/g },
  { name: 'new Date', regex: /\bnew\s+Date\s*\(/g },
  { name: 'randomUUID', regex: /\brandomUUID\s*\(/g },
];

const allowedMarker = '@are-determinism-allow';
const telemetryMarker = '@are-telemetry-side-channel';
const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs']);

function hasSourceExtension(file) {
  return [...sourceExtensions].some((extension) => file.endsWith(extension));
}

function normalize(file) {
  return file.split('\\').join('/');
}

function isExcluded(file) {
  const normalized = normalize(file);
  return excludedPaths.some((part) => normalized.includes(part))
    || telemetryPaths.some((part) => normalized.includes(part));
}

async function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = normalize(`/${relative(root, full)}`);
    if (entry.isDirectory()) {
      if (isExcluded(rel)) continue;
      files.push(...await walk(full));
      continue;
    }
    if (entry.isFile() && hasSourceExtension(full) && !isExcluded(rel)) files.push(full);
  }
  return files;
}

async function listCriticalFilesFromPatterns() {
  const coreDir = join(root, 'server/src/core');
  const files = await walk(coreDir);
  return files.filter((file) => {
    const rel = normalize(relative(root, file));
    return criticalFilePatterns.some((pattern) => pattern.test(rel));
  });
}

function lineNumberForOffset(content, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (content.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function lineAt(content, lineNumber) {
  return content.split(/\r?\n/)[lineNumber - 1] || '';
}

function markerAllowed(content, lineNumber) {
  const lines = content.split(/\r?\n/);
  const previous = lines[lineNumber - 2] || '';
  const current = lines[lineNumber - 1] || '';
  return previous.includes(allowedMarker) || current.includes(allowedMarker)
    || previous.includes(telemetryMarker) || current.includes(telemetryMarker);
}

const files = new Set();
for (const criticalRoot of criticalRoots) {
  for (const file of await walk(join(root, criticalRoot))) {
    files.add(file);
  }
}
for (const file of await listCriticalFilesFromPatterns()) {
  files.add(file);
}

const findings = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const pattern of blockedPatterns) {
    pattern.regex.lastIndex = 0;
    for (const match of content.matchAll(pattern.regex)) {
      const line = lineNumberForOffset(content, match.index || 0);
      if (markerAllowed(content, line)) continue;
      findings.push({
        file: relative(root, file),
        line,
        pattern: pattern.name,
        code: lineAt(content, line).trim(),
      });
    }
  }
}

if (findings.length > 0) {
  console.error('ARE determinism gate failed. Non-deterministic calls found in simulation-critical paths.');
  console.error('Use AREClock/ARERng, or move runtime telemetry into a telemetry side-channel path.');
  console.error('');
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} ${finding.pattern} :: ${finding.code}`);
  }
  process.exit(1);
}

console.log(`ARE determinism gate passed. Scanned ${files.size} simulation file(s). Telemetry side-channel paths are excluded by policy.`);
