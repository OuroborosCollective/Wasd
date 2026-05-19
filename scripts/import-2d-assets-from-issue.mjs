#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, copyFileSync, existsSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const issueNumber = String(process.env.ISSUE_NUMBER || '893');

if (!repo) throw new Error('GITHUB_REPOSITORY is required');
if (!token) throw new Error('GITHUB_TOKEN is required');

const root = process.cwd();
const outRoot = join(root, 'apps/client-2d/public/2d-assets');
const workRoot = join(tmpdir(), `wasd-2d-assets-${Date.now()}`);
const extractRoot = join(workRoot, 'extract');
const zipRoot = join(workRoot, 'zips');

const imageExts = new Set(['.png', '.webp', '.jpg', '.jpeg']);
const creditExts = new Set(['.txt', '.md', '.rtf', '.html', '.htm', '.pdf']);
const categories = ['tilesets', 'characters', 'monsters', 'buildings', 'props', 'fx', 'ui'];
const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceIssue: Number(issueNumber),
  basePath: '/2d-assets',
  sources: [],
  tilesets: {},
  characters: {},
  monsters: {},
  buildings: {},
  props: {},
  fx: {},
  ui: {},
  fallbacks: {},
};

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'wasd-2d-asset-importer',
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

function categoryFor(file, sourceName) {
  const hay = `${relative(extractRoot, file)} ${sourceName}`.toLowerCase();
  if (/monster|enemy|slime|wolf|skeleton|beast|creature/.test(hay)) return 'monsters';
  if (/character|chara|sprite|actor|player|npc|human|people|person|walk/.test(hay)) return 'characters';
  if (/door|house|building|wall|gate|roof|castle|shop|town/.test(hay)) return 'buildings';
  if (/effect|fx|magic|slash|hit|fire|heal|spell|animation/.test(hay)) return 'fx';
  if (/ui|icon|button|hud|window|frame|cursor/.test(hay)) return 'ui';
  if (/tile|tileset|mapchip|world|terrain|field|grass|road|dungeon|floor/.test(hay)) return 'tilesets';
  return 'props';
}

function singular(category) {
  return ({ tilesets: 'tileset', characters: 'character', monsters: 'monster', buildings: 'building', props: 'prop', fx: 'fx', ui: 'ui' })[category] || 'asset';
}

function uniqueTarget(category, id, ext) {
  let candidate = id;
  let n = 2;
  while (existsSync(join(outRoot, category, `${candidate}${ext}`))) {
    candidate = `${id}_${String(n).padStart(2, '0')}`;
    n++;
  }
  return candidate;
}

function addEntry(category, fileName, sourceName) {
  const src = `/2d-assets/${category}/${fileName}`;
  const base = { src, source: sourceName, license: 'See /2d-assets/credits/' };
  if (category === 'tilesets') return { ...base, tileWidth: 32, tileHeight: 32 };
  if (category === 'characters' || category === 'monsters') {
    return {
      ...base,
      frameWidth: 32,
      frameHeight: 32,
      animations: { idle_south: [0], walk_south: [0, 1, 2, 3], idle_west: [4], walk_west: [4, 5, 6, 7], idle_east: [8], walk_east: [8, 9, 10, 11], idle_north: [12], walk_north: [12, 13, 14, 15] },
    };
  }
  return base;
}

function chooseFallback(group, pattern) {
  const entries = Object.keys(group || {});
  return entries.find((id) => pattern.test(id)) || entries[0] || null;
}

async function main() {
  rmSync(workRoot, { recursive: true, force: true });
  mkdirSync(zipRoot, { recursive: true });
  mkdirSync(extractRoot, { recursive: true });
  mkdirSync(outRoot, { recursive: true });
  for (const c of categories) mkdirSync(join(outRoot, c), { recursive: true });
  mkdirSync(join(outRoot, 'credits'), { recursive: true });

  const issue = await gh(`/repos/${repo}/issues/${issueNumber}`);
  const comments = await gh(`/repos/${repo}/issues/${issueNumber}/comments?per_page=100`);
  const text = [issue.body || '', ...comments.map((c) => c.body || '')].join('\n');
  const urls = [...new Set([...text.matchAll(/https:\/\/github\.com\/user-attachments\/files\/[^\s)\]]+\.zip/gi)].map((m) => m[0]))];
  if (!urls.length) throw new Error(`No ZIP attachment URLs found on issue #${issueNumber}`);

  const sourceLines = ['# 2D asset import sources', '', `Generated: ${new Date().toISOString()}`, `Issue: #${issueNumber}`, ''];

  for (const [index, url] of urls.entries()) {
    const sourceNameRaw = decodeURIComponent(url.split('/').pop() || `asset-pack-${index + 1}.zip`);
    const sourceName = sourceNameRaw.replace(/\.zip$/i, '');
    const sourceSlug = slug(sourceName, 60);
    const zipPath = join(zipRoot, `${String(index + 1).padStart(2, '0')}_${sourceSlug}.zip`);
    const targetExtract = join(extractRoot, sourceSlug);
    mkdirSync(targetExtract, { recursive: true });

    console.log(`Downloading ${sourceNameRaw}`);
    sh('curl', ['-L', '--fail', '--retry', '3', '--retry-delay', '2', '-A', 'wasd-2d-asset-importer', '-o', zipPath, url], { stdio: 'inherit' });
    console.log(`Extracting ${sourceNameRaw}`);
    sh('unzip', ['-q', '-o', zipPath, '-d', targetExtract], { stdio: 'inherit' });

    manifest.sources.push({ name: sourceNameRaw, url, importedAs: sourceSlug });
    sourceLines.push(`- ${sourceNameRaw}: ${url}`);

    for (const file of listFiles(targetExtract)) {
      const ext = extname(file).toLowerCase();
      const rel = relative(targetExtract, file);
      const fileBase = basename(file, ext);
      const low = `${rel} ${sourceName}`.toLowerCase();

      if (creditExts.has(ext) && /(license|licence|readme|credit|terms|eula|copyright)/i.test(low)) {
        const creditName = `${sourceSlug}_${slug(basename(file, ext), 60)}${ext}`;
        copyFileSync(file, join(outRoot, 'credits', creditName));
        continue;
      }

      if (!imageExts.has(ext)) continue;
      const category = categoryFor(file, sourceName);
      const baseId = uniqueTarget(category, `${singular(category)}_${slug(fileBase, 72)}`, ext);
      const fileName = `${baseId}${ext}`;
      copyFileSync(file, join(outRoot, category, fileName));
      manifest[category][baseId] = addEntry(category, fileName, sourceNameRaw);
    }
  }

  manifest.fallbacks.terrain = chooseFallback(manifest.tilesets, /grass|field|world|terrain|outside|base|tile/);
  manifest.fallbacks.player = chooseFallback(manifest.characters, /player|hero|human|male|adventurer|character|chara/);
  manifest.fallbacks.npc = Object.keys(manifest.characters).find((id) => id !== manifest.fallbacks.player) || manifest.fallbacks.player || null;
  manifest.fallbacks.monster = chooseFallback(manifest.monsters, /slime|wolf|monster|enemy/);
  manifest.fallbacks.house = chooseFallback(manifest.buildings, /house|building|shop|door|gate/);
  manifest.fallbacks.tree = chooseFallback(manifest.props, /tree|wood|plant|nature/) || chooseFallback(manifest.buildings, /tree|wood|plant|nature/);

  writeFileSync(join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(outRoot, 'credits', 'source-issue-893.md'), sourceLines.join('\n') + '\n');

  const counts = categories.map((c) => `${c}: ${Object.keys(manifest[c]).length}`).join(', ');
  console.log(`2D asset import complete: ${counts}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
