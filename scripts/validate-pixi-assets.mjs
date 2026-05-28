#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const assetRoot = path.join(repoRoot, 'apps/client-2d/public/2d-assets');
const manifestDir = path.join(assetRoot, 'manifests');
const creditsDir = path.join(assetRoot, 'credits');
const archivePath = path.join(repoRoot, 'public/archive/wasd-pixi-asset-packs.json');
const sourceMetadataPath = path.join(repoRoot, 'docs/archive/pixi-first-batch-source-metadata.json');
const downloadAllowlistPath = path.join(repoRoot, 'docs/archive/pixi-first-batch-download-allowlist.json');

const allowedBinaryExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.ogg',
  '.mp3',
  '.wav',
  '.json',
  '.atlas',
]);

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });

  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolute)));
    } else {
      files.push(absolute);
    }
  }
  return files;
}

function indexById(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function assertInsideAssetRoot(filePath, errors) {
  const relative = path.relative(assetRoot, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    errors.push(`Asset path escapes 2D asset root: ${filePath}`);
  }
}

function isBlockedPack(pack, metadata, blockedById) {
  return Boolean(
    blockedById.has(pack.id)
    || metadata?.sourceVerified === false
    || metadata?.binaryImportStatus === 'blocked-until-source-verified',
  );
}

function isAllowedIncomingArchive(relative, extension) {
  return relative.startsWith('incoming/') && extension === '.zip';
}

function isAllowedPackDocumentation(relative, extension) {
  return relative.startsWith('ui/kenney-ui-pack/') && extension === '.txt';
}

function assertUrlDrift(pack, metadata, allowlist, errors) {
  if (!metadata) {
    errors.push(`Missing source metadata for pack ${pack.id}`);
    return;
  }

  if (!allowlist) {
    errors.push(`Missing download allowlist entry for pack ${pack.id}`);
    return;
  }

  if (metadata.sourceUrl !== allowlist.sourceUrl) {
    errors.push(`sourceUrl drift for ${pack.id}: metadata does not match allowlist`);
  }

  if (metadata.licenseUrl !== allowlist.licenseUrl) {
    errors.push(`licenseUrl drift for ${pack.id}: metadata does not match allowlist`);
  }

  if (metadata.downloadUrl && allowlist.downloadUrl && metadata.downloadUrl !== allowlist.downloadUrl) {
    errors.push(`downloadUrl drift for ${pack.id}: metadata does not match allowlist`);
  }

  if (allowlist.importAllowed !== true) {
    errors.push(`Pack ${pack.id} is not importAllowed in allowlist`);
  }
}

async function main() {
  const errors = [];
  const archive = await readJson(archivePath);
  const sourceMetadata = await readJson(sourceMetadataPath);
  const downloadAllowlist = await readJson(downloadAllowlistPath);
  const sourceById = indexById(sourceMetadata.packs);
  const allowlistById = indexById(downloadAllowlist.allowedPacks);
  const blockedById = new Set((downloadAllowlist.blockedPacks || []).map((pack) => pack.id));
  const importablePacks = [];
  const intentionallyBlockedPacks = [];

  for (const pack of archive.firstIntegrationBatch || []) {
    if (pack.decision === 'reject') continue;
    const metadata = sourceById.get(pack.id);
    if (isBlockedPack(pack, metadata, blockedById)) {
      intentionallyBlockedPacks.push(pack.id);
      continue;
    }
    importablePacks.push(pack);
    assertUrlDrift(pack, metadata, allowlistById.get(pack.id), errors);
  }

  const files = await listFiles(assetRoot);
  const manifestFiles = files.filter((file) => path.relative(manifestDir, file).startsWith('..') === false);
  const creditFiles = files.filter((file) => path.relative(creditsDir, file).startsWith('..') === false);
  const creditSlugs = new Set(creditFiles.map((file) => path.basename(file, '.json')));

  for (const file of files) {
    assertInsideAssetRoot(file, errors);
    const relative = path.relative(assetRoot, file);
    const extension = path.extname(file).toLowerCase();

    if (relative.startsWith('manifests/') || relative.startsWith('credits/') || path.basename(file) === '.gitkeep') {
      continue;
    }

    if (isAllowedIncomingArchive(relative, extension) || isAllowedPackDocumentation(relative, extension)) {
      continue;
    }

    if (!allowedBinaryExtensions.has(extension)) {
      errors.push(`Unsupported asset extension: ${relative}`);
    }
  }

  for (const pack of importablePacks) {
    const target = String(pack.target || pack.targetPath || '').replace(/^\//, '');
    if (!target) {
      errors.push(`Pack ${pack.id} has no target path`);
      continue;
    }

    const targetRelativeToAssetRoot = path.relative(assetRoot, path.join(repoRoot, target));
    if (targetRelativeToAssetRoot.startsWith('..') || path.isAbsolute(targetRelativeToAssetRoot)) {
      errors.push(`Pack ${pack.id} target escapes asset root: ${target}`);
    }

    const packFiles = files.filter((file) => path.relative(path.join(repoRoot, target), file).startsWith('..') === false);
    const hasBinaryFiles = packFiles.some((file) => path.basename(file) !== '.gitkeep');
    if (hasBinaryFiles && !creditSlugs.has(slugify(pack.id))) {
      errors.push(`Pack ${pack.id} has asset files but no generated credit JSON`);
    }
  }

  if (manifestFiles.length === 0) {
    errors.push('No Pixi asset manifest files found.');
  }

  if (errors.length > 0) {
    console.error('Pixi asset validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    `Pixi asset validation passed for ${files.length} files, ${importablePacks.length} importable packs, and ${intentionallyBlockedPacks.length} intentionally blocked packs.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
