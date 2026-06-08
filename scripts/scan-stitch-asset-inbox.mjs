#!/usr/bin/env node
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const inbox = path.join(root, '.asset-inbox', 'stitch');
const maxBytes = 300 * 1024 * 1024;
const allowed = new Set(['.zip', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.json', '.html', '.css', '.txt', '.md']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

const problems = [];
const files = [];

for (const file of await walk(inbox)) {
  const info = await stat(file);
  const rel = path.relative(inbox, file).replaceAll(path.sep, '/');
  const ext = path.extname(file).toLowerCase();
  if (!allowed.has(ext) && path.basename(file) !== '.gitkeep') problems.push(`Unsupported file: ${rel}`);
  if (info.size > maxBytes) problems.push(`Oversized file: ${rel}`);
  files.push({ path: rel, extension: ext || null, sizeBytes: info.size });
}

const report = {
  schemaVersion: '1.0.0',
  inbox: '.asset-inbox/stitch',
  maxBytes,
  fileCount: files.length,
  files,
  problems,
};

console.log(JSON.stringify(report, null, 2));
if (problems.length) throw new Error('Stitch inbox scan failed');
