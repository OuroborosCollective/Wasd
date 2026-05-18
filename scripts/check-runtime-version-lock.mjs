#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.turbo', '.cache', 'coverage']);

const exactLocks = new Map([
  ['vite', '6.4.2'],
  ['@vitejs/plugin-react', '4.7.0'],
  ['three', '0.184.0'],
]);

const blockedMajors = new Map([
  ['vite', 7],
  ['@vitejs/plugin-react', 5],
]);

const advisoryCritical = new Set([
  '@babylonjs/core',
  '@babylonjs/loaders',
  '@babylonjs/materials',
  '@babylonjs/havok',
  'typescript',
  'tsx',
  'pnpm',
]);

const findings = [];
const advisories = [];

function parseMajor(spec) {
  const match = String(spec).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function checkSpecifier(pkgPath, section, name, spec) {
  if (exactLocks.has(name)) {
    const expected = exactLocks.get(name);
    if (spec !== expected) {
      findings.push(`${pkgPath} ${section}.${name} must be pinned to ${expected}, found ${spec}`);
    }
  }

  if (blockedMajors.has(name)) {
    const major = parseMajor(spec);
    const blocked = blockedMajors.get(name);
    if (major !== null && major >= blocked) {
      findings.push(`${pkgPath} ${section}.${name} uses blocked major ${spec}; stay below ${blocked}.x until the frontend pipeline is migrated.`);
    }
  }

  if (advisoryCritical.has(name) && /^[~^*]|latest|next|beta|alpha|rc/i.test(String(spec))) {
    advisories.push(`${pkgPath} ${section}.${name} is not exact (${spec}). Advisory only for now; pin during the next lockfile maintenance window.`);
  }
}

async function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) await walk(full, out);
    } else if (entry.isFile() && entry.name === 'package.json') {
      out.push(full);
    }
  }
  return out;
}

const packageFiles = await walk(repoRoot);
for (const file of packageFiles) {
  const rel = path.relative(repoRoot, file);
  let json;
  try {
    json = JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    findings.push(`${rel} is not valid JSON: ${err.message}`);
    continue;
  }

  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = json[section] ?? {};
    for (const [name, spec] of Object.entries(deps)) checkSpecifier(rel, section, name, spec);
  }

  const overrides = json.pnpm?.overrides ?? {};
  for (const [name, spec] of Object.entries(overrides)) checkSpecifier(rel, 'pnpm.overrides', name, spec);

  const resolutions = json.pnpm?.resolutions ?? {};
  for (const [name, spec] of Object.entries(resolutions)) checkSpecifier(rel, 'pnpm.resolutions', name, spec);
}

if (advisories.length) {
  console.log('Runtime Version Lock advisories:');
  for (const advisory of advisories) console.log(`- ${advisory}`);
}

if (findings.length) {
  console.error('Runtime Version Lock failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('Runtime Version Lock passed: Vite, React plugin, and Three stay pinned to known-stable versions.');
