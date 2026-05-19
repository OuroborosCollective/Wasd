#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'dist', 'build', '.turbo', '.cache', 'coverage']);
const findings = [];
const notes = [];

function frontendPackage(rel, json) {
  const name = String(json.name || '');
  return rel === 'client/package.json' || rel === 'portal/package.json' || rel.startsWith('apps/client-') || rel.startsWith('apps/portal') || name === '@wasd/client' || name === '@arelorian/client-2d' || name.includes('portal');
}
function loose(spec) { return /^[~^*]|latest|next|beta|alpha|rc/i.test(String(spec)); }
function check(rel, json, section, name, spec) {
  const frontend = frontendPackage(rel, json);
  if (frontend && name === 'vite' && spec !== '6.4.2') findings.push(`${rel} ${section}.vite should stay pinned to 6.4.2, found ${spec}`);
  if (frontend && name === '@vitejs/plugin-react' && spec !== '4.7.0') findings.push(`${rel} ${section}.@vitejs/plugin-react should stay pinned to 4.7.0, found ${spec}`);
  if (name === 'three' && spec !== '0.184.0') findings.push(`${rel} ${section}.three should stay pinned to 0.184.0, found ${spec}`);
  if (!frontend && (name === 'vite' || name === '@vitejs/plugin-react')) notes.push(`${rel} ${section}.${name}=${spec} is outside frontend lock scope`);
  if (['@babylonjs/core','@babylonjs/loaders','@babylonjs/materials','@babylonjs/havok','typescript','tsx','pnpm'].includes(name) && loose(spec)) notes.push(`${rel} ${section}.${name}=${spec} is advisory-loose`);
}
async function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!ignored.has(entry.name)) await walk(full, out); }
    else if (entry.isFile() && entry.name === 'package.json') out.push(full);
  }
  return out;
}
for (const file of await walk(root)) {
  const rel = path.relative(root, file);
  let json;
  try { json = JSON.parse(await readFile(file, 'utf8')); } catch (error) { findings.push(`${rel} invalid JSON: ${error.message}`); continue; }
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) for (const [name, spec] of Object.entries(json[section] || {})) check(rel, json, section, name, spec);
  for (const [name, spec] of Object.entries(json.pnpm?.overrides || {})) check(rel, json, 'pnpm.overrides', name, spec);
  for (const [name, spec] of Object.entries(json.pnpm?.resolutions || {})) check(rel, json, 'pnpm.resolutions', name, spec);
}
if (notes.length) { console.log('Runtime Version Lock advisories:'); for (const note of notes) console.log(`- ${note}`); }
if (findings.length) { console.warn('Runtime Version Lock advisory findings:'); for (const finding of findings) console.warn(`- ${finding}`); console.warn('Runtime Version Lock is advisory-only during recovery; deploy is not blocked.'); }
console.log('Runtime Version Lock completed.');
