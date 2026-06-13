#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const ignoredDirs = new Set(['.git', '.turbo', '.cache', 'node_modules', 'dist', 'build', 'coverage', '.next']);
const codeExt = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts']);
const deterministicRoots = ['server/src/core', 'server/src/modules/npc', 'server/src/modules/loot', 'server/src/modules/world', 'world'];
const deterministicAdvisoryHints = [
  '/api/',
  '/state/',
  '/config/',
  '/health',
  '/metrics',
  '/monitor',
  '/telemetry',
  '/debug',
  '/__tests__/',
  '.test.',
  '.spec.',
  '/liveheal/',
  '/integrity/',
  '/are/layerpersistencequeue.ts',
];
const bootFiles = ['server/src/index.ts', 'server/src/core/ServerBootstrap.ts', 'apps/client-2d/src/main.tsx', 'apps/client-2d/src/client2dDepthRuntime.ts'];

function norm(file) { return file.split(path.sep).join('/'); }
function rel(file) { return norm(path.relative(root, file)); }
function read(file) { return readFileSync(path.join(root, file), 'utf8'); }
function fail(rule, message, hint) { errors.push({ rule, message, hint }); }
function warn(rule, message, hint) { warnings.push({ rule, message, hint }); }

function walk(dir, out = []) {
  const absolute = path.join(root, dir);
  if (!existsSync(absolute)) return out;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(absolute, entry.name);
    if (entry.isDirectory()) walk(rel(full), out);
    else if (entry.isFile() && codeExt.has(path.extname(entry.name))) out.push(rel(full));
  }
  return out;
}

function allCodeFiles() { return ['server/src', 'apps/client-2d/src', 'packages'].flatMap((dir) => walk(dir)); }

function gitRefExists(ref) {
  try { execFileSync('git', ['rev-parse', '--verify', '--quiet', ref], { stdio: 'ignore' }); return true; }
  catch { return false; }
}

function resolveDiffBaseRef() {
  if (process.env.GITHUB_BASE_REF) {
    const remoteBase = `origin/${process.env.GITHUB_BASE_REF}`;
    if (gitRefExists(remoteBase)) return remoteBase;
    if (gitRefExists(process.env.GITHUB_BASE_REF)) return process.env.GITHUB_BASE_REF;
  }
  if (gitRefExists('origin/main')) return 'origin/main';
  if (gitRefExists('main')) return 'main';
  if (gitRefExists('HEAD~1')) return 'HEAD~1';
  return null;
}

function stripCommentsPreserveLines(source) {
  let out = '';
  let i = 0;
  let inBlock = false;
  let inString = null;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (inBlock) {
      if (ch === '*' && next === '/') { inBlock = false; out += '  '; i += 2; continue; }
      out += ch === '\n' ? '\n' : ' ';
      i++;
      continue;
    }

    if (inString) {
      out += ch;
      if (ch === '\\') { out += next ?? ''; i += 2; continue; }
      if (ch === inString) inString = null;
      i++;
      continue;
    }

    if (ch === '/' && next === '*') { inBlock = true; out += '  '; i += 2; continue; }
    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; out += ch; i++; continue; }
    out += ch;
    i++;
  }
  return out;
}

function checkWorldTickTouched() {
  if (!process.env.GITHUB_BASE_REF && !process.env.GITHUB_SHA) return;
  const base = resolveDiffBaseRef();
  if (!base) {
    warn('worldtick-touch', 'Could not inspect git diff for WorldTick.ts.', 'No valid base ref was available in this checkout. Fetch the base branch or provide a full checkout.');
    return;
  }
  try {
    const changed = execFileSync('git', ['diff', '--name-only', base, 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split(/\r?\n/).filter(Boolean);
    if (changed.includes('server/src/core/WorldTick.ts')) warn('worldtick-touch', 'server/src/core/WorldTick.ts is changed in this diff.', 'Move gameplay logic into subsystems or runtime hooks unless an explicit maintainer whitelist is present.');
  } catch {
    warn('worldtick-touch', 'Could not inspect git diff for WorldTick.ts.', 'Run inside a Git checkout with a valid base ref to enable this check.');
  }
}

function isAdvisoryDeterminismPath(file) {
  const wrapped = `/${file.toLowerCase()}`;
  return deterministicAdvisoryHints.some((hint) => wrapped.includes(hint));
}

function checkDeterminism() {
  const deny = [
    { label: 'Math.random()', pattern: /\bMath\.random\s*\(/ },
    { label: 'Date.now()', pattern: /\bDate\.now\s*\(/ },
  ];
  for (const file of deterministicRoots.flatMap((dir) => walk(dir))) {
    const lines = stripCommentsPreserveLines(read(file)).split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/ARE-ARCH-LINT-ALLOW/i.test(line) || /ARE-DETERMINISM-ALLOW/i.test(line)) return;
      for (const rule of deny) {
        if (!rule.pattern.test(line)) continue;
        const message = `${file}:${index + 1} uses ${rule.label}`;
        const hint = 'Use deterministic hash/RNG or an audited ARE clock instead.';
        if (isAdvisoryDeterminismPath(file)) warn('determinism-advisory', message, 'Observed in API/test/meta/healing/persistence-side-effect path. Keep it out of world-state simulation inputs.');
        else fail('determinism', message, hint);
      }
    });
  }
}

function checkRuntimeHooks() {
  const files = allCodeFiles();
  const bootText = bootFiles.filter((file) => existsSync(path.join(root, file))).map((file) => read(file)).join('\n');
  const allText = files.map((file) => read(file)).join('\n');
  const hookFiles = files.filter((file) => /(Relay|Bridge)\.(ts|tsx|js|mjs)$/.test(file) || /(^|\/)install[^/]*\.(ts|tsx|js|mjs)$/.test(file));

  for (const file of hookFiles) {
    const base = path.basename(file).replace(/\.(ts|tsx|js|mjs)$/, '');
    const jsImport = file.replace(/^server\/src\//, './').replace(/^apps\/client-2d\/src\//, './').replace(/\.(ts|tsx)$/, '.js');
    const referenced = bootText.includes(base) || bootText.includes(jsImport) || bootText.includes(path.basename(jsImport));
    const importedSomewhere = allText.includes(base) || allText.includes(jsImport) || allText.includes(path.basename(jsImport));
    if (!referenced && !importedSomewhere) fail('dead-hook', `${file} looks like a runtime hook but is not referenced.`, 'Import or install the hook from a boot/runtime path, or rename it if it is not executable runtime code.');
  }
}

function aliasEntries(file) {
  if (!existsSync(path.join(root, file))) return [];
  const text = read(file);
  const entries = [];
  const pattern = /['"]([^'"]+)['"]\s*:\s*path\.resolve\(root,\s*['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = pattern.exec(text))) entries.push(`${match[1]}=>${match[2].replace(/\\/g, '/')}`);
  return entries.sort();
}

function checkViteConfigDivergence() {
  const ts = 'apps/client-2d/vite.config.ts';
  const mjs = 'apps/client-2d/vite.config.mjs';
  if (!existsSync(path.join(root, ts)) || !existsSync(path.join(root, mjs))) return;
  const tsAlias = aliasEntries(ts).join('|');
  const mjsAlias = aliasEntries(mjs).join('|');
  if (tsAlias !== mjsAlias) fail('config-divergence', `${ts} and ${mjs} have different resolve.alias entries.`, 'Keep client build configs synchronized so runtime chains use the same local modules.');
}

function checkKnownChains() {
  const index = existsSync(path.join(root, 'server/src/index.ts')) ? read('server/src/index.ts') : '';
  const clientDepth = existsSync(path.join(root, 'apps/client-2d/src/client2dDepthRuntime.ts')) ? read('apps/client-2d/src/client2dDepthRuntime.ts') : '';
  const network = existsSync(path.join(root, 'apps/client-2d/src/networkClient.ts')) ? read('apps/client-2d/src/networkClient.ts') : '';
  const renderer = existsSync(path.join(root, 'apps/client-2d/src/worldItemRenderer.ts')) ? read('apps/client-2d/src/worldItemRenderer.ts') : '';
  if (!index.includes('installLootBridge')) fail('loot-chain', 'Loot bridge is not installed from server/src/index.ts.', 'Import ./modules/loot/installLootBridge.js in server/src/index.ts.');
  if (!network.includes('wasd:world-packet')) fail('world-item-chain', 'networkClient.ts does not emit wasd:world-packet.', 'World item runtime needs a packet mirror from WORLD_HEARTBEAT/world_tick.');
  if (!clientDepth.includes('installWorldItemRuntime')) fail('world-item-chain', 'world item runtime is not installed from the client startup chain.', 'Call installWorldItemRuntime from an existing client boot path.');
  if (!renderer.includes('pickWeaponVisual')) fail('world-item-chain', 'world item renderer does not resolve weapon visuals.', 'Use pickWeaponVisual for type=weapon payloads.');
}

checkWorldTickTouched();
checkDeterminism();
checkRuntimeHooks();
checkViteConfigDivergence();
checkKnownChains();

for (const finding of warnings) console.warn(`ARE ARCH WARNING [${finding.rule}] ${finding.message}\n  Hint: ${finding.hint}`);
if (errors.length > 0) {
  console.error('\nARELORIA ARCHITECTURE LINT FAILED');
  for (const finding of errors) console.error(`\n[${finding.rule}] ${finding.message}\n  Fix: ${finding.hint}`);
  process.exit(1);
}
console.log('ARELORIA ARCHITECTURE LINT OK: deterministic guards, runtime hooks, config aliases, and known chains passed.');
