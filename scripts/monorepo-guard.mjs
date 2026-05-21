#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const errors = [];
const warnings = [];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message, hint) {
  errors.push({ message, hint });
}

function warn(message, hint) {
  warnings.push({ message, hint });
}

function extractPythonOverride(scriptText, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`"${escaped}"\\s*:\\s*"([^"]+)"`);
  return scriptText.match(re)?.[1] ?? null;
}

function extractLockRootSpecifier(lockText, dep) {
  const escaped = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const depRe = new RegExp(`\\n      '${escaped}':\\n        specifier: ([^\\n]+)|\\n      ${escaped}:\\n        specifier: ([^\\n]+)`);
  const m = lockText.match(depRe);
  return (m?.[1] ?? m?.[2] ?? null)?.replace(/^['"]|['"]$/g, '') ?? null;
}

function extractYamlOverride(yamlText, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`['"]?${escaped}['"]?\\s*:\\s*['"]?([^'"]\\S+)['"]?`);
  const m = yamlText.match(re);
  return m?.[1] ?? null;
}

function checkRootOverrideConsistency() {
  const pkg = readJson('package.json');
  const workspaceFile = existsSync('pnpm-workspace.yaml') ? readFileSync('pnpm-workspace.yaml', 'utf8') : '';
  const lock = readFileSync('pnpm-lock.yaml', 'utf8');
  const dockerSync = readFileSync('scripts/sync-pnpm-lockfile-for-docker.py', 'utf8');

  const watched = new Set([
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.pnpm?.overrides ?? {}),
    ...Object.keys(pkg.pnpm?.resolutions ?? {}),
    "packageManager",
    '@types/react', '@types/react-dom', '@types/node', 'typescript', 'zod', 'three',
    '@babylonjs/core', '@babylonjs/materials', '@babylonjs/loaders', 'react', 'socket.io-client', 'pg'
  ]);

  for (const dep of watched) {
    const pkgSpec = pkg.devDependencies?.[dep] ?? pkg.dependencies?.[dep] ?? null;
    let overrideSpec = pkg.pnpm?.overrides?.[dep] ?? pkg.pnpm?.resolutions?.[dep] ?? pkgSpec;

    const workspaceSpec = extractYamlOverride(workspaceFile, dep);
    if (workspaceSpec) {
        overrideSpec = workspaceSpec;
    }

    if (!overrideSpec) continue;

    const lockRootSpecifier = extractLockRootSpecifier(lock, dep);
    if (lockRootSpecifier && lockRootSpecifier !== overrideSpec) {
      fail(
        `Lockfile drift for ${dep}: pnpm-lock.yaml root importer has ${lockRootSpecifier}, package.json/workspace expects ${overrideSpec}.`,
        `Run pnpm install locally or update pnpm-lock.yaml so ${dep} uses ${overrideSpec}.`
      );
    }

    const dockerOverride = extractPythonOverride(dockerSync, dep);
    if (dockerOverride && dockerOverride !== overrideSpec) {
      fail(
        `Docker lockfile sync drift for ${dep}: sync-pnpm-lockfile-for-docker.py has ${dockerOverride}, package.json/workspace expects ${overrideSpec}.`,
        `Update scripts/sync-pnpm-lockfile-for-docker.py OVERRIDES.${dep} to ${overrideSpec}.`
      );
    }
  }
}

function checkWorkspacePackageVersions() {
  const root = readJson('package.json');
  const rootPackageManager = root.packageManager ?? null;
  if (rootPackageManager) return;
  warn(
    'Root package.json has no packageManager field.',
    'Consider adding packageManager, e.g. pnpm@9.12.2.'
  );
}

function checkVpsBuildTooling() {
  const dockerfile = existsSync('Dockerfile.vps') ? readFileSync('Dockerfile.vps', 'utf8') : '';
  const client2dPkg = existsSync('apps/client-2d/package.json') ? readJson('apps/client-2d/package.json') : null;
  const prebuild = client2dPkg?.scripts?.prebuild ?? '';

  if (prebuild.includes('extract-2d-weapon-pool') && !/apk add[^\n]*unzip/.test(dockerfile)) {
    fail(
      'Dockerfile.vps does not install unzip, but @wasd/client-2d prebuild extracts a ZIP asset pack.',
      'Add unzip to the builder apk line.'
    );
  }
}

function checkFrozenInstallDryRun() {
  try {
    execFileSync('pnpm', ['install', '--frozen-lockfile', '--ignore-scripts'], { stdio: 'pipe' });
  } catch (error) {
    fail(
      'pnpm frozen-lockfile validation failed.',
      'Run pnpm install and commit pnpm-lock.yaml.'
    );
  }
}

checkRootOverrideConsistency();
checkWorkspacePackageVersions();
checkVpsBuildTooling();

if (process.env.MONOREPO_GUARD_RUN_PNPM === '1') {
  checkFrozenInstallDryRun();
}

for (const warning of warnings) {
  console.warn(`MONOREPO GUARD WARNING: ${warning.message}\n  Hint: ${warning.hint}`);
}

if (errors.length > 0) {
  console.error('\nMONOREPO GUARD FAILED');
  for (const error of errors) {
    console.error(`\n- ${error.message}\n  Fix: ${error.hint}`);
  }
  process.exit(1);
}

console.log('MONOREPO GUARD OK: package/lockfile/Docker sync checks passed.');
