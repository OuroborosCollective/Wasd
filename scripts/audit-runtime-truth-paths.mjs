#!/usr/bin/env node
/**
 * Runtime Truth Path Audit
 *
 * Protects the ARE runtime from fake truth paths:
 * - production/VPS builds must use Dockerfile.vps, not Dockerfile.prod
 * - portal smoke must pass the same prebuilt 2D marker/stamp that Dockerfile.vps verifies
 * - Shadow/telemetry UI may observe only; it must not dispatch gameplay actions or perform mutating HTTP calls
 * - known fake snapshot/demo truth tokens are blocked in runtime source paths
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const codeExt = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.json', '.yml', '.yaml']);
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.turbo']);

function rel(file) {
  return file.split(path.sep).join('/');
}

function absolute(file) {
  return path.join(root, file);
}

function read(file) {
  return readFileSync(absolute(file), 'utf8');
}

function fail(rule, message, hint) {
  errors.push({ rule, message, hint });
}

function warn(rule, message, hint) {
  warnings.push({ rule, message, hint });
}

function walk(dir, out = []) {
  const base = absolute(dir);
  if (!existsSync(base)) return out;
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(base, entry.name);
    const relative = rel(path.relative(root, full));
    if (entry.isDirectory()) walk(relative, out);
    else if (entry.isFile() && codeExt.has(path.extname(entry.name))) out.push(relative);
  }
  return out;
}

function grepFiles(dirs) {
  return dirs.flatMap((dir) => walk(dir));
}

function checkVpsDockerTruth() {
  if (!existsSync(absolute('Dockerfile.vps'))) {
    fail('vps-dockerfile', 'Dockerfile.vps is missing.', 'VPS/production builds for this project must use Dockerfile.vps.');
    return;
  }

  const workflowFiles = grepFiles(['.github/workflows']);
  for (const file of workflowFiles) {
    const text = read(file);
    if (text.includes('Dockerfile.prod')) {
      fail('vps-dockerfile', `${file} references Dockerfile.prod.`, 'Replace production/VPS Docker references with Dockerfile.vps.');
    }
  }

  const portalSmoke = '.github/workflows/portal-smoke.yml';
  if (!existsSync(absolute(portalSmoke))) {
    warn('portal-smoke', 'Portal smoke workflow is missing.', 'Keep a runtime route/Docker smoke workflow for /, /2d, /portal, and /apps.');
    return;
  }

  const text = read(portalSmoke);
  if (!/docker\s+build\s+[^\n]*-f\s+Dockerfile\.vps/s.test(text)) {
    fail('portal-smoke', 'Portal smoke does not build Dockerfile.vps.', 'The smoke workflow must validate the real VPS Dockerfile.');
  }
  if (!text.includes('CLIENT_2D_BUILD_SHA=smoke-test')) {
    fail('portal-smoke', 'Portal smoke does not pass the smoke client-2d build stamp into Dockerfile.vps.', 'Pass --build-arg CLIENT_2D_BUILD_SHA=smoke-test so Docker verifies the generated build-stamp.json.');
  }
  if (!text.includes('CLIENT_2D_MARKER=REAL_PIXI_CLIENT')) {
    fail('portal-smoke', 'Portal smoke does not pass the real client marker into Dockerfile.vps.', 'Pass --build-arg CLIENT_2D_MARKER=REAL_PIXI_CLIENT.');
  }
}

function checkShadowSideChannel() {
  const files = grepFiles(['frontend', 'apps', 'client']).filter((file) => /shadow|telemetry|duden/i.test(file));
  const mutatingFetch = /fetch\s*\([^)]*method\s*:\s*['\"](?:POST|PUT|PATCH|DELETE)['\"]/i;
  for (const file of files) {
    const text = read(file);
    if (text.includes('wasd:client-action')) {
      fail('shadow-side-channel', `${file} dispatches wasd:client-action.`, 'Shadow/telemetry UI may observe runtime data but must never create gameplay actions.');
    }
    if (mutatingFetch.test(text)) {
      fail('shadow-side-channel', `${file} appears to perform a mutating fetch.`, 'Shadow/telemetry UI must remain read-only unless a server-authoritative command path is explicitly installed.');
    }
  }
}

function checkFakeRuntimeTruthTokens() {
  const runtimeFiles = grepFiles(['server/src', 'apps/client-2d/src', 'client/src']).filter((file) => !file.includes('__tests__') && !file.includes('.test.'));
  const forbidden = [
    { token: 'fake snapshot', hint: 'Use a server-authored snapshot from tick/chunk/hash inputs.' },
    { token: 'mock truth', hint: 'Keep mocks in tests only, never in runtime paths.' },
    { token: 'demo kingdom', hint: 'Load governance/content from real game-data or server runtime sources.' },
    { token: 'placeholder governance', hint: 'Do not expose governance as runtime truth before a real state source exists.' },
  ];

  for (const file of runtimeFiles) {
    const text = read(file).toLowerCase();
    for (const rule of forbidden) {
      if (text.includes(rule.token)) {
        fail('fake-runtime-truth', `${file} contains forbidden runtime token "${rule.token}".`, rule.hint);
      }
    }
  }
}

checkVpsDockerTruth();
checkShadowSideChannel();
checkFakeRuntimeTruthTokens();

for (const finding of warnings) {
  console.warn(`RUNTIME TRUTH WARNING [${finding.rule}] ${finding.message}\n  Hint: ${finding.hint}`);
}

if (errors.length > 0) {
  console.error('\nRUNTIME TRUTH PATH AUDIT FAILED');
  for (const finding of errors) {
    console.error(`\n[${finding.rule}] ${finding.message}\n  Fix: ${finding.hint}`);
  }
  process.exit(1);
}

console.log('RUNTIME TRUTH PATH AUDIT OK: Dockerfile.vps, side-channel boundaries, and runtime truth tokens passed.');
