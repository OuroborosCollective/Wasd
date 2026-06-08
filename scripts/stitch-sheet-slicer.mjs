#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const repoRoot = process.cwd();
const assetRoot = path.join(repoRoot, 'apps/client-2d/public/2d-assets');
const gameManifestPath = path.join(assetRoot, 'game-assets/manifest.json');
const outputRoot = path.join(assetRoot, 'stitch-modules');
const outputManifestPath = path.join(outputRoot, 'manifest.json');
const sharp = await import('sharp').then((m) => m.default ?? m).catch(() => null);

const MIN_COMPONENT_W = 18;
const MIN_COMPONENT_H = 18;
const MIN_COMPONENT_AREA = 420;
const MAX_MODULES_PER_SHEET = 80;
const PAD = 5;

function slugify(value) {
  return String(value || 'asset')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'asset';
}

function hash12(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function hay(asset) {
  return [asset.id, asset.category, asset.kind, asset.culture, asset.sourcePath, ...(asset.tokens || []), ...(asset.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isAffixSymbol(asset) {
  return /\b(affix|crit|mana|strength|agility|cooldown|abklingzeit|resistance_icon|fire_resistance|ice_resistance|lightning_resistance|luck|life|dodge|damage|defense|poison|vampirismus)\b/.test(hay(asset));
}

function isSheetCandidate(asset) {
  if (asset.kind !== 'image' || asset.ext !== '.png' || !asset.src) return false;
  if (isAffixSymbol(asset)) return false;
  const w = asset.analysis?.width ?? 0;
  const h = asset.analysis?.height ?? 0;
  if (w < 384 || h < 384) return false;
  return /\b(sheet|assembly|modular|procedural|weapon|armor|npc|pet|mount|house|kingdom|dungeon|body|handles|pommels|sprite)\b/.test(hay(asset));
}

function bucketFor(asset) {
  const s = hay(asset);
  if (/\b(pet|companion|familiar|animal|cat|dog|wolf|fox|bird|dragonling)\b/.test(s)) return 'pets';
  if (/\b(mount|saddle|tactical gear)\b/.test(s)) return 'mounts';
  if (/\b(dungeon|crypt|cave|lair|floor tile|wall segment|environmental prop)\b/.test(s)) return 'dungeons';
  if (/\b(road|path|trail|street|bridge|cobble)\b/.test(s)) return 'roads';
  if (/\b(house|kingdom|building|wall|roof|door|castle|tower|gate)\b/.test(s)) return 'buildings';
  if (/\b(weapon|sword|axe|bow|staff|shield|handle|hilt|pommel|blade)\b/.test(s)) return 'weapons';
  if (/\b(armor|helmet|gauntlet|breastplate|plate|robe|body armor)\b/.test(s)) return 'armor';
  if (/\b(npc|person|character|knight|warrior|mage|rogue|archer)\b/.test(s)) return 'characters';
  return asset.category || 'misc';
}

function roleFor(asset, box) {
  const s = hay(asset);
  if (/\b(handle|hilt|grip|pommel|limb|leg|arm|head|helmet|gauntlet|wall|roof|door|gate|tower|section|segment|component|part)\b/.test(s)) return 'attachment';
  if (/\b(vfx|fx|magic|aura|rune|crest|gem|glow|emblem|prop|environmental)\b/.test(s)) return 'detail_fx';
  if (/\b(body|torso|core|base|blade|floor|tile|foundation|breastplate|armor assembly|weapon assembly|npc assembly|pet assembly|mount assembly)\b/.test(s)) return 'core';
  if (box.w > box.h * 1.7 || box.h > box.w * 1.7) return 'attachment';
  return 'core';
}

function fileFromSrc(src) {
  const rel = String(src).replace(/^\/2d-assets\//, '');
  return path.join(assetRoot, rel);
}

function borderBackground(data, width, height) {
  const samples = [];
  const take = (x, y) => {
    const i = (y * width + x) * 4;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  };
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 64))) {
    take(x, 0); take(x, height - 1);
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 64))) {
    take(0, y); take(width - 1, y);
  }
  const median = (idx) => samples.map((s) => s[idx]).sort((a, b) => a - b)[Math.floor(samples.length / 2)] ?? 0;
  return [median(0), median(1), median(2)];
}

function buildMask(data, width, height) {
  const bg = borderBackground(data, width, height);
  const mask = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const a = data[i + 3];
    const dr = data[i] - bg[0];
    const dg = data[i + 1] - bg[1];
    const db = data[i + 2] - bg[2];
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (a > 18 && dist > 26) mask[p] = 1;
  }
  return mask;
}

function connectedComponents(mask, width, height) {
  const seen = new Uint8Array(mask.length);
  const components = [];
  const qx = [];
  const qy = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (!mask[start] || seen[start]) continue;
      let head = 0;
      qx.length = 0; qy.length = 0;
      qx.push(x); qy.push(y); seen[start] = 1;
      let minX = x, minY = y, maxX = x, maxY = y, count = 0;
      while (head < qx.length) {
        const cx = qx[head];
        const cy = qy[head++];
        count++;
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
        const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (mask[ni] && !seen[ni]) { seen[ni] = 1; qx.push(nx); qy.push(ny); }
        }
      }
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      if (w >= MIN_COMPONENT_W && h >= MIN_COMPONENT_H && count >= MIN_COMPONENT_AREA) {
        components.push({ x: minX, y: minY, w, h, area: count });
      }
    }
  }
  return components;
}

function mergeNearBoxes(boxes) {
  const sorted = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x);
  const out = [];
  for (const box of sorted) {
    const hit = out.find((b) => !(box.x > b.x + b.w + 8 || box.x + box.w + 8 < b.x || box.y > b.y + b.h + 8 || box.y + box.h + 8 < b.y));
    if (hit) {
      const x1 = Math.min(hit.x, box.x); const y1 = Math.min(hit.y, box.y);
      const x2 = Math.max(hit.x + hit.w, box.x + box.w); const y2 = Math.max(hit.y + hit.h, box.y + box.h);
      hit.x = x1; hit.y = y1; hit.w = x2 - x1; hit.h = y2 - y1; hit.area += box.area;
    } else out.push({ ...box });
  }
  return out;
}

function cleanBoxes(boxes, width, height) {
  return mergeNearBoxes(boxes)
    .filter((b) => b.w < width * 0.92 && b.h < height * 0.92)
    .filter((b) => b.area / (b.w * b.h) > 0.015)
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, MAX_MODULES_PER_SHEET)
    .map((b) => ({
      x: Math.max(0, b.x - PAD),
      y: Math.max(0, b.y - PAD),
      w: Math.min(width - Math.max(0, b.x - PAD), b.w + PAD * 2),
      h: Math.min(height - Math.max(0, b.y - PAD), b.h + PAD * 2),
      area: b.area,
    }));
}

async function sliceAsset(asset) {
  const input = fileFromSrc(asset.originalSrc || asset.src);
  const image = sharp(input).ensureAlpha();
  const meta = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const mask = buildMask(data, info.width, info.height);
  const boxes = cleanBoxes(connectedComponents(mask, info.width, info.height), info.width, info.height);
  const bucket = bucketFor(asset);
  const sheetSlug = slugify(asset.sourcePath?.split('/').filter(Boolean).at(-2) || asset.id);
  const sheetOut = path.join(outputRoot, bucket, sheetSlug);
  await mkdir(sheetOut, { recursive: true });

  const modules = [];
  let index = 1;
  for (const box of boxes) {
    const role = roleFor(asset, box);
    const id = `stitch_${bucket}_${sheetSlug}_${role}_${String(index).padStart(3, '0')}_${hash12(`${asset.id}:${box.x}:${box.y}:${box.w}:${box.h}`)}`;
    const filename = `${id}.png`;
    const outPath = path.join(sheetOut, filename);
    await sharp(input).extract({ left: box.x, top: box.y, width: box.w, height: box.h }).png().toFile(outPath);
    modules.push({
      id,
      sourceAssetId: asset.id,
      sourcePath: asset.sourcePath,
      bucket,
      sheet: sheetSlug,
      role,
      moduleIndex: index,
      bbox: { x: box.x, y: box.y, width: box.w, height: box.h },
      src: `/2d-assets/stitch-modules/${bucket}/${sheetSlug}/${filename}`,
      width: box.w,
      height: box.h,
    });
    index++;
  }
  return { asset, width: meta.width, height: meta.height, modules };
}

async function main() {
  if (!sharp) throw new Error('sharp is required for Stitch sheet slicing');
  const manifest = JSON.parse(await readFile(gameManifestPath, 'utf8'));
  const candidates = (manifest.assets || []).filter(isSheetCandidate);
  const sheets = [];
  const modules = [];
  for (const asset of candidates) {
    const result = await sliceAsset(asset);
    sheets.push({ id: asset.id, sourcePath: asset.sourcePath, moduleCount: result.modules.length, width: result.width, height: result.height });
    modules.push(...result.modules);
    console.log(`[stitch-slicer] ${asset.id}: ${result.modules.length} modules`);
  }
  const out = {
    version: 1,
    generatedAt: new Date(0).toISOString(),
    deterministic: true,
    contract: 'Everything except affix symbols is sliced into reusable modules when sheet-like source images are detected.',
    sourceManifest: '/2d-assets/game-assets/manifest.json',
    sheetCount: sheets.length,
    moduleCount: modules.length,
    sheets,
    modules,
  };
  await mkdir(outputRoot, { recursive: true });
  await writeFile(outputManifestPath, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`[stitch-slicer] wrote ${modules.length} modules from ${sheets.length} sheets`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
