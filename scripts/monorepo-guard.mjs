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

function extractYamlValue(yamlText, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Handle both "key: value" and "'key': value"
  const re = new RegExp(`(?:^|\\n)\\s*(?:'${escaped}'|${escaped})\\s*:\\s*([^\\n]+)`);
  const m = yamlText.match(re);
  if (!m) return null;
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}

function extractLockOverride(lockText, dep) {
  const escaped = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const marker = '\noverrides:\n';
  const start = lockText.indexOf(marker);
  if (start < 0) return null;
  const after = lockText.slice(start + marker.length);
  const end = after.search(/\n\S/);
  const block = end >= 0 ? after.slice(0, end) : after;
  const re = new RegExp(`^  (?:'${escaped}'|${escaped}):\\s*([^\\n]+)$`, 'm');
  const m = block.match(re);
  return (m?.[1] ?? null)?.trim().replace(/^['"]|['"]$/g, '') ?? null;
}

function checkRootOverrideConsistency() {
  const pkg = readJson('package.json');
  const lock = readFileSync('pnpm-lock.yaml', 'utf8');
  const dockerSync = readFileSync('scripts/sync-pnpm-lockfile-for-docker.py', 'utf8');
  const workspaceYaml = existsSync('pnpm-workspace.yaml') ? readFileSync('pnpm-workspace.yaml', 'utf8') : '';

  const rootDeps = new Set([
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.dependencies ?? {}),
  ]);

  // pnpm v11: overrides can be in pnpm-workspace.yaml
  const overrides = { ...(pkg.pnpm?.overrides ?? {}) };
  if (workspaceYaml) {
    // Basic extraction of all keys in the overrides: block
    const overridesMatch = workspaceYaml.match(/\noverrides:\n([\s\S]+?)(?:\n\S|$)/);
    if (overridesMatch) {
      const overridesBlock = overridesMatch[1];
      const lines = overridesBlock.split('\n');
      for (const line of lines) {
        const lineMatch = line.match(/^\s+(?:'([^']+)'|"([^"]+)"|([^:]+))\s*:\s*([^#\n]+)/);
        if (lineMatch) {
          const key = lineMatch[1] || lineMatch[2] || lineMatch[3].trim();
          const val = lineMatch[4].trim().replace(/^['"]|['"]$/g, '');
          overrides[key] = val;
        }
      }
    }
  }

  const resolutions = pkg.pnpm?.resolutions ?? {};

  for (const dep of rootDeps) {
    const pkgSpec = pkg.devDependencies?.[dep] ?? pkg.dependencies?.[dep] ?? null;
    const resolutionSpec = resolutions?.[dep] ?? null;
    const expectedSpec = resolutionSpec ?? pkgSpec;
    if (!expectedSpec) continue;

    const lockRootSpecifier = extractLockRootSpecifier(lock, dep);
    if (lockRootSpecifier && lockRootSpecifier !== expectedSpec) {
      fail(
        `Lockfile drift for ${dep}: pnpm-lock.yaml root importer has ${lockRootSpecifier}, package.json expects ${expectedSpec}.`,
        `Run pnpm install locally or update pnpm-lock.yaml so ${dep} uses ${expectedSpec}. This is a monorepo; root package.json and lockfile must agree before merge.`
      );
    }
  }

  for (const [dep, overrideSpec] of Object.entries(overrides)) {
    const lockOverride = extractLockOverride(lock, dep);
    if (lockOverride && lockOverride !== overrideSpec) {
      fail(
        `Lockfile override drift for ${dep}: pnpm-lock.yaml overrides has ${lockOverride}, package.json/overrides expects ${overrideSpec}.`,
        `Run pnpm install locally or update pnpm-lock.yaml overrides so ${dep} uses ${overrideSpec}. This is a monorepo; root package.json and lockfile overrides must agree before merge.`
      );
    }

    const dockerOverride = extractPythonOverride(dockerSync, dep);
    if (dockerOverride && dockerOverride !== overrideSpec) {
      fail(
        `Docker lockfile sync drift for ${dep}: sync-pnpm-lockfile-for-docker.py has ${dockerOverride}, package.json/overrides expects ${overrideSpec}.`,
        `Update scripts/sync-pnpm-lockfile-for-docker.py OVERRIDES.${dep} to ${overrideSpec}. Otherwise VPS Docker rewrites the lockfile during build and frozen install fails.`
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
    'Consider adding packageManager, e.g. pnpm@9.12.2 or the chosen repo-wide version. This makes agents and CI use one package manager version.'
  );
}

function checkVpsBuildTooling() {
  const dockerfile = existsSync('Dockerfile.vps') ? readFileSync('Dockerfile.vps', 'utf8') : '';
  const client2dPkg = existsSync('apps/client-2d/package.json') ? readJson('apps/client-2d/package.json') : null;
  const prebuild = client2dPkg?.scripts?.prebuild ?? '';

  if (prebuild.includes('extract-2d-weapon-pool') && !/apk add[^\n]*unzip/.test(dockerfile)) {
    fail(
      'Dockerfile.vps does not install unzip, but @wasd/client-2d prebuild extracts a ZIP asset pack.',
      'Add unzip to the builder apk line: RUN apk add --no-cache ... unzip. This is required before VPS deploy.'
    );
  }
}

function checkFrozenInstallDryRun() {
  try {
    execFileSync('pnpm', ['install', '--frozen-lockfile', '--ignore-scripts'], { stdio: 'pipe' });
  } catch (error) {
    const detail = error.stderr?.toString() || error.stdout?.toString() || error.message;
    fail(
      `pnpm frozen-lockfile validation failed.\n${detail}`,
      'This repo is a pnpm monorepo. package.json and pnpm-lock.yaml must be updated together. Run pnpm install and commit pnpm-lock.yaml, or align dependency versions manually.'
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
  console.error('This is a pnpm monorepo. Keep root package.json, workspace package.json files, pnpm-lock.yaml, Docker lockfile sync overrides, and VPS build tooling aligned.');
  for (const error of errors) {
    console.error(`\n- ${error.message}\n  Fix: ${error.hint}`);
  }
  process.exit(1);
}

console.log('MONOREPO GUARD OK: package/lockfile/Docker sync checks passed.');
