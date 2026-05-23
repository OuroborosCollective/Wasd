#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const manifestPath = join(root, 'apps/client-2d/public/2d-assets/manifest.json');

function fail(message) {
  console.error(`[client-2d-assets] ${message}`);
  process.exitCode = 1;
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasSizePair(value) {
  return Boolean(value && isNumber(value.w) && isNumber(value.h) && value.w > 0 && value.h > 0);
}

function validateDepthEntry(category, id, entry) {
  if (!isNumber(entry.zHeight)) fail(`${category}.${id} is missing numeric zHeight`);
  if (!hasSizePair(entry.isoFootprint)) fail(`${category}.${id} is missing isoFootprint.w/h`);
  if (!hasSizePair(entry.shadow)) fail(`${category}.${id} is missing shadow.w/h`);
  if (entry.shadow && entry.shadow.alpha !== undefined && !isNumber(entry.shadow.alpha)) fail(`${category}.${id} has non-numeric shadow.alpha`);
}

if (!existsSync(manifestPath)) {
  fail(`manifest not found: ${manifestPath}`);
  process.exit(process.exitCode || 0);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const buildings = manifest.buildings ?? {};
const props = manifest.props ?? {};

for (const [id, entry] of Object.entries(buildings)) validateDepthEntry('buildings', id, entry);
for (const [id, entry] of Object.entries(props)) validateDepthEntry('props', id, entry);

if (!process.exitCode) {
  console.log(`[client-2d-assets] OK buildings=${Object.keys(buildings).length} props=${Object.keys(props).length}`);
}
