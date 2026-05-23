import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(repoRoot, 'apps/client-2d/public');
const manifestPath = path.join(publicRoot, '2d-assets/manifest.json');

const GROUPS = ['tilesets', 'characters', 'monsters', 'buildings', 'props', 'fx', 'ui', 'weapons'];

function toPublicPath(assetPath) {
  if (!assetPath || typeof assetPath !== 'string') return null;
  const normalized = assetPath.replace(/^\/2d-assets\//, '2d-assets/').replace(/^2d-assets\//, '2d-assets/');
  return path.join(publicRoot, normalized);
}

function firstFrameFromAtlas(atlas) {
  const frames = Object.entries(atlas?.frames ?? {})
    .filter(([, payload]) => payload?.frame)
    .sort(([a], [b]) => a.localeCompare(b));
  return frames[0]?.[1]?.frame ?? null;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function main() {
  const manifest = await readJson(manifestPath);
  let enriched = 0;

  for (const groupName of GROUPS) {
    const group = manifest[groupName];
    if (!group || typeof group !== 'object') continue;

    for (const [id, entry] of Object.entries(group)) {
      if (!entry || typeof entry !== 'object' || !entry.atlas) continue;
      const atlasPath = toPublicPath(entry.atlas);
      if (!atlasPath) continue;

      try {
        const atlas = await readJson(atlasPath);
        const frame = firstFrameFromAtlas(atlas);
        if (!frame) continue;

        entry.frame = {
          x: Number(frame.x),
          y: Number(frame.y),
          w: Number(frame.w),
          h: Number(frame.h),
        };
        entry.width = entry.width ?? Number(frame.w);
        entry.height = entry.height ?? Number(frame.h);
        enriched += 1;
      } catch (err) {
        console.warn(`[stitch-frame-enrich] skipped ${id}: ${err.message}`);
      }
    }
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[stitch-frame-enrich] enriched ${enriched} atlas-backed entries in ${path.relative(repoRoot, manifestPath)}`);
}

main().catch((err) => {
  console.error('[stitch-frame-enrich] failed', err);
  process.exit(1);
});
