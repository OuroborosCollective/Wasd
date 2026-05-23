#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const issueNumber = String(process.env.ISSUE_NUMBER || '1071');

if (!repo) throw new Error('GITHUB_REPOSITORY is required');
if (!token) throw new Error('GITHUB_TOKEN is required');

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const publicRoot = join(root, 'apps/client-2d/public/2d-assets');
const stitchRoot = join(publicRoot, 'stitch');
const manifestPath = join(publicRoot, 'manifest.json');
const stitchManifestPath = join(stitchRoot, 'stitch-atlas-manifest.json');
const creditsDir = join(publicRoot, 'credits');
const workRoot = join(tmpdir(), `wasd-stitch-atlases-${Date.now()}`);
const extractRoot = join(workRoot, 'extract');
const zipRoot = join(workRoot, 'zips');

const categories = ['tilesets', 'characters', 'monsters', 'buildings', 'props', 'fx', 'ui'];

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'wasd-stitch-atlas-importer',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function slug(input, max = 96) {
  return String(input || 'asset')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
    .slice(0, max) || 'asset';
}

function listFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function categoryFor(text) {
  const hay = text.toLowerCase();
  if (/architektur|architecture|building|house|castle|wall|gate|roof|town|village/.test(hay)) return 'buildings';
  if (/boden|ground|tile|tiles|tileset|terrain|floor|road|path/.test(hay)) return 'tilesets';
  if (/vegetation|tree|trees|plant|forest|grass|bush/.test(hay)) return 'props';
  if (/deko|decor|decoration|object|prop|barrel|crate|furniture/.test(hay)) return 'props';
  if (/effect|effects|fx|spell|magic|combat|slash|hit|melee/.test(hay)) return 'fx';
  if (/character|charakter|wachen|guard|npc|samurai|mongolian|medieval/.test(hay)) return 'characters';
  return 'props';
}

function cultureFor(text) {
  const hay = text.toLowerCase();
  if (/samurai|japanese|japan/.test(hay)) return 'samurai';
  if (/mongol|mongolian|steppe/.test(hay)) return 'mongolian';
  if (/mittelalter|medieval|fantasy/.test(hay)) return 'medieval';
  return 'stitch';
}

function topicFor(text, category) {
  const hay = text.toLowerCase();
  if (/architektur|architecture|building|house|castle|wall|gate|roof/.test(hay)) return 'architecture';
  if (/boden|ground|tile|tiles|tileset|terrain|floor|road|path/.test(hay)) return 'ground_tiles';
  if (/vegetation|tree|trees|plant|forest|grass|bush/.test(hay)) return 'vegetation';
  if (/deko|decor|decoration|object|prop|barrel|crate|furniture/.test(hay)) return 'decor';
  if (/spell|magic|zauber/.test(hay)) return 'magic_fx';
  if (/combat|melee|nahkampf|slash|hit/.test(hay)) return 'combat_fx';
  if (/guard|wachen/.test(hay)) return 'guard';
  if (category === 'characters') return 'characters';
  return category.replace(/s$/, '');
}

function defaultDepthMetadata(category, topic) {
  if (category === 'buildings') {
    return { zHeight: 3, isoFootprint: { w: 144, h: 72 }, shadow: { w: 164, h: 42, alpha: 0.38 } };
  }
  if (category === 'props') {
    const treeLike = /vegetation|tree/.test(topic);
    return treeLike
      ? { zHeight: 2, isoFootprint: { w: 72, h: 36 }, shadow: { w: 88, h: 26, alpha: 0.34 } }
      : { zHeight: 1, isoFootprint: { w: 64, h: 28 }, shadow: { w: 72, h: 20, alpha: 0.32 } };
  }
  return {};
}

function ensureManifestShape(manifest) {
  manifest.version ??= 1;
  manifest.generatedAt = new Date().toISOString();
  manifest.basePath ??= '/2d-assets';
  manifest.sources ??= [];
  manifest.fallbacks ??= {};
  for (const category of categories) manifest[category] ??= {};
  return manifest;
}

function normalizeFrameName(raw, prefix) {
  const base = slug(raw.replace(/\.(png|webp|jpg|jpeg)$/i, ''), 96);
  return base.startsWith(prefix) ? base : `${prefix}_${base}`;
}

function patchSpritesheetJson(payload, imageName, framePrefix) {
  const cloned = JSON.parse(JSON.stringify(payload));
  cloned.frames ??= {};
  const frames = {};
  for (const [name, frame] of Object.entries(cloned.frames)) {
    frames[normalizeFrameName(name, framePrefix)] = {
      ...frame,
      rotated: false,
      trimmed: Boolean(frame.trimmed),
    };
  }
  cloned.frames = frames;
  cloned.meta = {
    ...(cloned.meta ?? {}),
    app: 'Areloria WASD Stitch generated atlas importer',
    image: imageName,
    scale: String(cloned.meta?.scale ?? '1'),
  };
  return cloned;
}

function synthesizeGridJson({ imageName, framePrefix, frameSize = 256, columns = 4, rows = 4 }) {
  const names = [
    'idle_01', 'idle_02',
    'walk_01', 'walk_02', 'walk_03', 'walk_04',
    'attack_01', 'attack_02', 'attack_03', 'attack_04',
    'death_01', 'death_02', 'death_03',
  ];
  const frames = {};
  names.forEach((name, index) => {
    const x = (index % columns) * frameSize;
    const y = Math.floor(index / columns) * frameSize;
    frames[`${framePrefix}_${name}`] = {
      frame: { x, y, w: frameSize, h: frameSize },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: frameSize, h: frameSize },
      sourceSize: { w: frameSize, h: frameSize },
      anchor: { x: 0.5, y: 0.9 },
    };
  });
  return {
    frames,
    animations: {
      [`${framePrefix}_idle`]: [`${framePrefix}_idle_01`, `${framePrefix}_idle_02`],
      [`${framePrefix}_walk`]: [`${framePrefix}_walk_01`, `${framePrefix}_walk_02`, `${framePrefix}_walk_03`, `${framePrefix}_walk_04`],
      [`${framePrefix}_attack`]: [`${framePrefix}_attack_01`, `${framePrefix}_attack_02`, `${framePrefix}_attack_03`, `${framePrefix}_attack_04`],
      [`${framePrefix}_death`]: [`${framePrefix}_death_01`, `${framePrefix}_death_02`, `${framePrefix}_death_03`],
    },
    meta: {
      app: 'Areloria WASD Stitch generated atlas importer',
      version: '1.0',
      image: imageName,
      format: 'RGBA8888',
      size: { w: columns * frameSize, h: rows * frameSize },
      scale: '1',
    },
  };
}

function findMatchingJson(jsonFiles, culture, topic, category, usedJson) {
  const needles = [culture, topic, category].filter(Boolean);
  let best = null;
  let bestScore = -1;
  for (const file of jsonFiles) {
    if (usedJson.has(file)) continue;
    const hay = slug(basename(file, '.json'));
    let score = 0;
    for (const n of needles) if (hay.includes(slug(n))) score += 2;
    if (category === 'buildings' && /architektur|architecture/.test(hay)) score += 5;
    if (topic === 'ground_tiles' && /boden|ground|kacheln|tiles/.test(hay)) score += 5;
    if (topic === 'vegetation' && /vegetation|tree/.test(hay)) score += 5;
    if (topic === 'decor' && /deko|decor/.test(hay)) score += 5;
    if (score > bestScore) {
      best = file;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

function priorityFor(category) {
  if (category === 'buildings') return 'gameplay';
  if (category === 'props' || category === 'tilesets' || category === 'fx') return 'gameplay';
  return 'draft';
}

async function main() {
  rmSync(workRoot, { recursive: true, force: true });
  mkdirSync(extractRoot, { recursive: true });
  mkdirSync(zipRoot, { recursive: true });
  mkdirSync(stitchRoot, { recursive: true });
  mkdirSync(creditsDir, { recursive: true });

  const issue = await gh(`/repos/${repo}/issues/${issueNumber}`);
  const comments = await gh(`/repos/${repo}/issues/${issueNumber}/comments?per_page=100`);
  const text = [issue.body || '', ...comments.map((c) => c.body || '')].join('\n');
  const urls = [...new Set([...text.matchAll(/https:\/\/github\.com\/user-attachments\/files\/[^\s)\]]+\.zip/gi)].map((m) => m[0]))];
  if (!urls.length) throw new Error(`No ZIP attachment URLs found on issue #${issueNumber}. Upload the Stitch ZIP files to this issue first.`);

  const rootManifest = ensureManifestShape(existsSync(manifestPath) ? readJson(manifestPath) : {});
  const stitchManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceIssue: Number(issueNumber),
    basePath: '/2d-assets/stitch',
    notes: [
      'Generated Stitch atlas packs imported with normalized names.',
      'Building, prop, vegetation, ground, and fx atlases are gameplay-ready manifest candidates.',
      'Character draft atlases are preserved but not used as generic fallbacks unless explicitly selected.',
    ],
    sources: [],
    atlases: {},
  };
  const provenance = [
    '# Stitch generated atlas provenance',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Source issue: #${issueNumber}`,
    '',
    'These atlas ZIPs were supplied by the project owner as generated project-owned design assets.',
    'The importer normalizes folder names, PNG names, JSON meta.image values, and Areloria manifest entries.',
    '',
    '## Import sources',
    '',
  ];

  let imported = 0;

  for (const [sourceIndex, url] of urls.entries()) {
    const rawZipName = decodeURIComponent(url.split('/').pop() || `stitch-pack-${sourceIndex + 1}.zip`);
    const zipName = rawZipName.replace(/[^a-zA-Z0-9_.() -]+/g, '_');
    const zipSlug = slug(zipName.replace(/\.zip$/i, ''), 72);
    const zipPath = join(zipRoot, `${String(sourceIndex + 1).padStart(2, '0')}_${zipSlug}.zip`);
    const targetExtract = join(extractRoot, zipSlug);
    mkdirSync(targetExtract, { recursive: true });

    console.log(`Downloading ${zipName}`);
    sh('curl', ['-L', '--fail', '--retry', '3', '--retry-delay', '2', '-A', 'wasd-stitch-atlas-importer', '-o', zipPath, url], { stdio: 'inherit' });
    console.log(`Extracting ${zipName}`);
    sh('unzip', ['-q', '-o', zipPath, '-d', targetExtract], { stdio: 'inherit' });

    stitchManifest.sources.push({ name: zipName, url, importedAs: zipSlug });
    rootManifest.sources.push({ name: zipName, url, importedAs: `stitch/${zipSlug}`, type: 'stitch-generated-atlas' });
    provenance.push(`- ${zipName}: ${url}`);

    const files = listFiles(targetExtract);
    const pngFiles = files.filter((file) => extname(file).toLowerCase() === '.png');
    const jsonFiles = files.filter((file) => extname(file).toLowerCase() === '.json');
    const usedJson = new Set();

    for (const pngFile of pngFiles) {
      const folder = basename(dirname(pngFile));
      const rel = relative(targetExtract, pngFile);
      const descriptor = `${folder} ${rel}`;
      const category = categoryFor(descriptor);
      const culture = cultureFor(descriptor);
      const topic = topicFor(descriptor, category);
      const atlasIdBase = slug(`stitch_${culture}_${topic}`, 72);
      let atlasId = atlasIdBase;
      let suffix = 2;
      while (stitchManifest.atlases[atlasId] || existsSync(join(stitchRoot, atlasId))) {
        atlasId = `${atlasIdBase}_${String(suffix).padStart(2, '0')}`;
        suffix++;
      }

      const atlasDir = join(stitchRoot, atlasId);
      mkdirSync(atlasDir, { recursive: true });
      const imageName = `${atlasId}.png`;
      const jsonName = `${atlasId}.json`;
      const imageRel = `stitch/${atlasId}/${imageName}`;
      const jsonRel = `stitch/${atlasId}/${jsonName}`;
      copyFileSync(pngFile, join(atlasDir, imageName));

      const matchingJson = findMatchingJson(jsonFiles, culture, topic, category, usedJson);
      let jsonPayload;
      let repair = 'meta-image-normalized';
      if (matchingJson) {
        usedJson.add(matchingJson);
        jsonPayload = patchSpritesheetJson(readJson(matchingJson), imageName, atlasId);
      } else if (topic === 'guard') {
        jsonPayload = synthesizeGridJson({ imageName, framePrefix: atlasId, frameSize: 256, columns: 4, rows: 4 });
        repair = 'synthesized-256-grid';
      } else {
        jsonPayload = { frames: {}, meta: { app: 'Areloria WASD Stitch generated atlas importer', image: imageName, scale: '1' } };
        repair = 'empty-json-placeholder';
      }
      writeFileSync(join(atlasDir, jsonName), JSON.stringify(jsonPayload, null, 2) + '\n');

      const entry = {
        src: `/2d-assets/${imageRel}`,
        atlas: `/2d-assets/${jsonRel}`,
        source: zipName,
        sourcePath: rel,
        license: 'Project-owned generated asset. See /2d-assets/credits/stitch-generated-atlas-provenance.md',
        kind: topic,
        group: culture,
        tags: ['stitch', culture, topic, category, priorityFor(category)],
        ...defaultDepthMetadata(category, topic),
      };
      if (category === 'tilesets') {
        entry.tileWidth = 256;
        entry.tileHeight = 256;
      }
      if (category === 'characters') {
        entry.frameWidth = topic === 'guard' ? 256 : 128;
        entry.frameHeight = topic === 'guard' ? 256 : 128;
        entry.tags.push('draft');
      }

      const includeInRootManifest = category !== 'characters' || topic === 'guard';
      if (includeInRootManifest) {
        rootManifest[category][atlasId] = entry;
      }

      stitchManifest.atlases[atlasId] = {
        id: atlasId,
        category,
        culture,
        topic,
        priority: priorityFor(category),
        png: imageRel,
        json: jsonRel,
        source: zipName,
        sourcePath: rel,
        repair,
        frameCount: Object.keys(jsonPayload.frames ?? {}).length,
      };
      imported++;
    }
  }

  rootManifest.fallbacks.house ||= Object.keys(rootManifest.buildings).find((id) => /architecture|building|house/.test(id)) || null;
  rootManifest.fallbacks.tree ||= Object.keys(rootManifest.props).find((id) => /vegetation|tree/.test(id)) || null;
  rootManifest.fallbacks.terrain ||= Object.keys(rootManifest.tilesets).find((id) => /ground|tile|terrain/.test(id)) || null;
  rootManifest.fallbacks.npc ||= Object.keys(rootManifest.characters).find((id) => /guard/.test(id)) || rootManifest.fallbacks.npc || null;

  writeFileSync(manifestPath, JSON.stringify(rootManifest, null, 2) + '\n');
  writeFileSync(stitchManifestPath, JSON.stringify(stitchManifest, null, 2) + '\n');
  writeFileSync(join(creditsDir, 'stitch-generated-atlas-provenance.md'), provenance.join('\n') + '\n');

  console.log(`Imported Stitch atlases: ${imported}`);
  console.log(`buildings=${Object.keys(rootManifest.buildings).length} props=${Object.keys(rootManifest.props).length} tilesets=${Object.keys(rootManifest.tilesets).length} fx=${Object.keys(rootManifest.fx).length} characters=${Object.keys(rootManifest.characters).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
