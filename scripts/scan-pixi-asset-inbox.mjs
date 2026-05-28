#!/usr/bin/env node
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const inboxRoot = path.join(repoRoot, '.asset-inbox/pixi');
const maxFileSizeBytes = 250 * 1024 * 1024;
const allowedExtensions = new Set(['.zip', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.json', '.atlas', '.ogg', '.mp3', '.wav']);

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });

  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolute)));
    else files.push(absolute);
  }
  return files;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function main() {
  const errors = [];
  const warnings = [];
  const files = await listFiles(inboxRoot);
  const reportFiles = [];

  for (const file of files) {
    const relative = path.relative(inboxRoot, file);
    const extension = path.extname(file).toLowerCase();
    const info = await stat(file);

    if (!isInside(inboxRoot, file)) errors.push(`File escapes Pixi asset inbox: ${file}`);
    if (relative.includes('..')) errors.push(`Suspicious relative path in Pixi asset inbox: ${relative}`);
    if (!allowedExtensions.has(extension) && path.basename(file) !== '.gitkeep') errors.push(`Unsupported inbox file extension: ${relative}`);
    if (info.size > maxFileSizeBytes) errors.push(`Inbox file exceeds max size: ${relative}`);

    reportFiles.push({
      path: relative,
      extension: extension || null,
      sizeBytes: info.size,
      status: errors.length === 0 ? 'accepted-for-staging-review' : 'needs-review',
    });
  }

  if (files.length === 0) warnings.push('Pixi asset inbox is empty.');

  const report = {
    schemaVersion: '1.0.0',
    inbox: path.relative(repoRoot, inboxRoot),
    maxFileSizeBytes,
    allowedExtensions: [...allowedExtensions].sort(),
    fileCount: files.length,
    files: reportFiles,
    warnings,
    errors,
  };

  console.log(JSON.stringify(report, null, 2));

  if (errors.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
