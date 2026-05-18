#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const targets = [
  'server/src/core',
  'server/src/modules',
  'server/src/services',
  'packages/shared/src',
].map((p) => path.join(repoRoot, p));

const deny = [
  { pattern: /\bMath\.random\s*\(/, label: 'Math.random()' },
  { pattern: /\bDate\.now\s*\(/, label: 'Date.now()' },
  { pattern: /\bnew\s+Date\s*\(/, label: 'new Date()' },
  { pattern: /\bcrypto\.randomUUID\s*\(/, label: 'crypto.randomUUID()' },
];

const allowComment = /ARE-DETERMINISM-ALLOW/;
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const findings = [];

async function walk(dir) {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', '.turbo', '.cache'].includes(entry.name)) continue;
      await walk(full);
      continue;
    }
    if (!entry.isFile() || !extensions.has(path.extname(entry.name))) continue;
    const content = await readFile(full, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (allowComment.test(line)) return;
      for (const rule of deny) {
        if (rule.pattern.test(line)) {
          findings.push({ file: path.relative(repoRoot, full), line: index + 1, label: rule.label, text: line.trim().slice(0, 180) });
        }
      }
    });
  }
}

for (const target of targets) await walk(target);

if (findings.length) {
  console.error('ARE Determinism Gate failed. Forbidden nondeterministic runtime calls found:');
  for (const f of findings) console.error(`- ${f.file}:${f.line} ${f.label} :: ${f.text}`);
  console.error('\nUse a seeded deterministic clock/RNG or add ARE-DETERMINISM-ALLOW only outside runtime logic with a clear reason.');
  process.exit(1);
}

console.log(`ARE Determinism Gate passed across ${targets.map((t) => path.relative(repoRoot, t)).join(', ')}`);
