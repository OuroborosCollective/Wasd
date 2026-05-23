import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(repoRoot, 'apps/client-2d/public');
const manifestPath = path.join(publicRoot, '2d-assets/manifest.json');
const reportPath = path.join(publicRoot, '2d-assets/credits/are-asset-forge-report.json');

const GROUPS = ['tilesets', 'characters', 'monsters', 'buildings', 'props', 'fx', 'ui', 'weapons'];
const REQUIRED = [
  { group: 'buildings', role: 'house', fallback: 'house', pickable: true },
  { group: 'props', role: 'tree', fallback: 'tree', pickable: true },
  { group: 'tilesets', role: 'terrain', fallback: 'terrain', pickable: false },
  { group: 'characters', role: 'npc', fallback: 'npc', pickable: true },
];

function sha256Text(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function slug(value) {
  return String(value ?? 'asset')
    .toLowerCase()
    .replace(/[^a-z0-9_./-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'asset';
}

function toPublicFile(assetPath) {
  if (!assetPath || typeof assetPath !== 'string' || assetPath.startsWith('data:')) return null;
  const normalized = assetPath.replace(/^\/2d-assets\//, '2d-assets/').replace(/^2d-assets\//, '2d-assets/');
  return path.join(publicRoot, normalized);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function pngSize(filePath) {
  const buf = await readFile(filePath);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(sig)) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), sha256: crypto.createHash('sha256').update(buf).digest('hex') };
}

function inferRole(id, entry, groupName) {
  const hay = slug([id, entry.kind, entry.group, ...(entry.tags ?? [])].join(' '));
  if (/house|hut|building|architecture|wall|gate|roof/.test(hay)) return 'house';
  if (/tree|vegetation|forest|plant|bush/.test(hay)) return 'tree';
  if (/ground|terrain|tile|grass|road|path/.test(hay)) return 'terrain';
  if (/npc|guard|character|hero|enemy|monster/.test(hay)) return groupName === 'monsters' ? 'enemy' : 'npc';
  if (/decor|prop|barrel|crate|item|loot/.test(hay)) return 'prop';
  if (/fx|effect|magic|slash|hit/.test(hay)) return 'fx';
  if (/ui|icon|button/.test(hay)) return 'ui';
  return groupName.replace(/s$/, '') || 'unknown';
}

function depthFor(groupName, role, entry) {
  if (entry.zHeight || entry.isoFootprint || entry.shadow) return;
  if (groupName === 'buildings' || role === 'house') {
    entry.zHeight = 3;
    entry.isoFootprint = { w: 144, h: 72 };
    entry.shadow = { w: 164, h: 42, alpha: 0.38 };
    return;
  }
  if (groupName === 'props' && role === 'tree') {
    entry.zHeight = 2;
    entry.isoFootprint = { w: 72, h: 36 };
    entry.shadow = { w: 88, h: 26, alpha: 0.34 };
    return;
  }
  if (groupName === 'props') {
    entry.zHeight = 1;
    entry.isoFootprint = { w: 64, h: 28 };
    entry.shadow = { w: 72, h: 20, alpha: 0.32 };
  }
}

function pickableFor(groupName, role) {
  return ['house', 'tree', 'npc', 'enemy', 'item', 'prop'].includes(role) || ['buildings', 'characters', 'monsters'].includes(groupName);
}

function firstMatchingId(group, predicate) {
  return Object.entries(group ?? {}).find(([id, entry]) => predicate(id, entry))?.[0] ?? null;
}

async function main() {
  const manifest = await readJson(manifestPath);
  manifest.fallbacks ??= {};
  const report = { generatedAt: new Date().toISOString(), enriched: [], missing: [], warnings: [], quarantined: [] };

  for (const groupName of GROUPS) {
    const group = manifest[groupName];
    if (!group || typeof group !== 'object') continue;

    for (const [id, entry] of Object.entries(group)) {
      if (!entry || typeof entry !== 'object') continue;
      const role = inferRole(id, entry, groupName);
      entry.role ??= role;
      entry.pickable ??= pickableFor(groupName, role);
      entry.assetHash ??= sha256Text(`${groupName}:${id}:${entry.src ?? ''}:${entry.atlas ?? ''}`).slice(0, 16);
      entry.tags = Array.from(new Set(['are-forged', groupName, role, ...(entry.tags ?? [])].map(slug).filter(Boolean)));
      depthFor(groupName, role, entry);

      const srcPath = toPublicFile(entry.src);
      if (srcPath && !(await exists(srcPath))) {
        report.quarantined.push({ id, group: groupName, reason: 'missing src', src: entry.src });
        entry.quarantined = true;
      }

      if (srcPath && entry.src?.endsWith('.png')) {
        try {
          const size = await pngSize(srcPath);
          if (size) {
            entry.width ??= size.width;
            entry.height ??= size.height;
            entry.sha256 ??= size.sha256.slice(0, 16);
          }
        } catch (err) {
          report.warnings.push({ id, group: groupName, reason: `png metadata failed: ${err.message}` });
        }
      }

      const atlasPath = toPublicFile(entry.atlas);
      if (atlasPath && !(await exists(atlasPath))) {
        report.quarantined.push({ id, group: groupName, reason: 'missing atlas', atlas: entry.atlas });
        entry.quarantined = true;
      }

      report.enriched.push({ id, group: groupName, role: entry.role, pickable: entry.pickable, hash: entry.assetHash });
    }
  }

  for (const req of REQUIRED) {
    const current = manifest.fallbacks[req.fallback];
    const group = manifest[req.group] ?? {};
    if (!current || !group[current]) {
      const replacement = firstMatchingId(group, (id, entry) => inferRole(id, entry, req.group) === req.role);
      if (replacement) manifest.fallbacks[req.fallback] = replacement;
    }
    if (!manifest.fallbacks[req.fallback]) report.missing.push(req);
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[are-asset-forge] enriched=${report.enriched.length} missing=${report.missing.length} warnings=${report.warnings.length} quarantined=${report.quarantined.length}`);
  if (report.missing.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[are-asset-forge] failed', err);
  process.exit(1);
});
