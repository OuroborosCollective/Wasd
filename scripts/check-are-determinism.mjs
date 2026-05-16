#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const criticalRoots = [
  'packages/core-logic/src',
  'server/src/core',
  'server/src/modules/loot',
  'server/src/modules/warfront',
  'server/src/modules/oracle',
];

const blockedPatterns = [
  { name: 'Math.random', regex: /\bMath\.random\s*\(/g },
  { name: 'Date.now', regex: /\bDate\.now\s*\(/g },
  { name: 'new Date', regex: /\bnew\s+Date\s*\(/g },
];

const allowedMarker = '@are-determinism-allow';
const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs']);

function hasSourceExtension(file) {
  return [...sourceExtensions].some((extension) => file.endsWith(extension));
}

async function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['dist', 'build', 'coverage', 'node_modules', '__tests__', 'tests', 'test'].includes(entry.name)) continue;
      files.push(...await walk(full));
      continue;
    }
    if (entry.isFile() && hasSourceExtension(full)) files.push(full);
  }
  return files;
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

function isAllowed(content, lineNumber) {
  const lines = content.split(/\r?\n/);
  const previous = lines[lineNumber - 2] || '';
  const current = lines[lineNumber - 1] || '';
  return previous.includes(allowedMarker) || current.includes(allowedMarker);
}

const files = [];
for (const criticalRoot of criticalRoots) {
  files.push(...await walk(join(root, criticalRoot)));
}

const findings = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const pattern of blockedPatterns) {
    pattern.regex.lastIndex = 0;
    for (const match of content.matchAll(pattern.regex)) {
      const line = lineNumberForOffset(content, match.index || 0);
      if (isAllowed(content, line)) continue;
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
  console.error('ARE determinism gate failed. Non-deterministic time/random calls found in ARE-critical paths.');
  console.error('Use injected deterministic clock/RNG, or add a reviewed @are-determinism-allow marker for non-simulation code.');
  console.error('');
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} ${finding.pattern} :: ${finding.code}`);
  }
  process.exit(1);
}

console.log(`ARE determinism gate passed. Scanned ${files.length} file(s) across ${criticalRoots.length} critical root(s).`);
