#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';

const repoRoot = process.cwd();
const assetRoot = path.join(repoRoot, 'apps/client-2d/public/2d-assets');
const defaultZipPath = path.join(assetRoot, 'incoming/kenney-ui-pack/kenney_ui-pack.zip');
const targetDir = path.join(assetRoot, 'ui/kenney-ui-pack');
const creditsPath = path.join(assetRoot, 'credits/kenney-ui-pack.json');
const generatedManifestPath = path.join(assetRoot, 'manifests/generated/kenney-ui-pack.json');
const sourceMetadataPath = path.join(repoRoot, 'docs/archive/pixi-first-batch-source-metadata.json');
const downloadAllowlistPath = path.join(repoRoot, 'docs/archive/pixi-first-batch-download-allowlist.json');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const includeFonts = args.includes('--include-fonts');
const zipPath = readArg('--zip') || defaultZipPath;

const allowedExtensions = new Set(['.png', '.svg', '.ogg', '.txt']);
if (includeFonts) allowedExtensions.add('.ttf');

function readArg(name) {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) return args[exactIndex + 1];
  const prefix = `${name}=`;
  return args.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeZipPath(filePath) {
  return filePath
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .map((part, index, parts) => {
      const extension = path.extname(part);
      if (index === parts.length - 1 && extension) {
        return `${slugify(path.basename(part, extension))}${extension.toLowerCase()}`;
      }
      return slugify(part);
    })
    .join('/');
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function assertInside(root, candidate) {
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside ${root}: ${candidate}`);
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function indexById(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function requireKenneyUiGates(sourceMetadata, downloadAllowlist) {
  const metadata = indexById(sourceMetadata.packs).get('kenney-ui-pack');
  const allowlist = indexById(downloadAllowlist.allowedPacks).get('kenney-ui-pack');
  const failures = [];

  if (!metadata) failures.push('missing kenney-ui-pack source metadata');
  if (!allowlist) failures.push('missing kenney-ui-pack allowlist entry');
  if (metadata?.sourceVerified !== true) failures.push('sourceVerified must be true');
  if (allowlist?.importAllowed !== true) failures.push('importAllowed must be true');
  if (!metadata?.downloadUrl) failures.push('source metadata downloadUrl is required');
  if (!allowlist?.downloadUrl) failures.push('allowlist downloadUrl is required');
  if (metadata?.sourceUrl !== allowlist?.sourceUrl) failures.push('sourceUrl drift between metadata and allowlist');
  if (metadata?.licenseUrl !== allowlist?.licenseUrl) failures.push('licenseUrl drift between metadata and allowlist');
  if (metadata?.downloadUrl !== allowlist?.downloadUrl) failures.push('downloadUrl drift between metadata and allowlist');

  if (allowlist?.archiveSha256) {
    // The actual ZIP digest is checked after reading the archive.
  }

  if (failures.length > 0) {
    throw new Error(`Kenney UI Pack source/allowlist gate failed:\n- ${failures.join('\n- ')}`);
  }

  return { metadata, allowlist };
}

function readUInt16(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function findEndOfCentralDirectory(buffer) {
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32(buffer, offset) === 0x06054b50) return offset;
  }
  throw new Error('Invalid ZIP: end of central directory not found');
}

function parseZip(buffer) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = readUInt16(buffer, eocdOffset + 10);
  const centralDirectoryOffset = readUInt32(buffer, eocdOffset + 16);
  let cursor = centralDirectoryOffset;
  const entries = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(buffer, cursor) !== 0x02014b50) {
      throw new Error(`Invalid ZIP: central directory entry ${index} is corrupt`);
    }

    const method = readUInt16(buffer, cursor + 10);
    const compressedSize = readUInt32(buffer, cursor + 20);
    const uncompressedSize = readUInt32(buffer, cursor + 24);
    const fileNameLength = readUInt16(buffer, cursor + 28);
    const extraLength = readUInt16(buffer, cursor + 30);
    const commentLength = readUInt16(buffer, cursor + 32);
    const localHeaderOffset = readUInt32(buffer, cursor + 42);
    const fileName = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString('utf8');

    entries.push({ fileName, method, compressedSize, uncompressedSize, localHeaderOffset });
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function extractEntry(buffer, entry) {
  const localOffset = entry.localHeaderOffset;
  if (readUInt32(buffer, localOffset) !== 0x04034b50) {
    throw new Error(`Invalid ZIP: local header corrupt for ${entry.fileName}`);
  }

  const fileNameLength = readUInt16(buffer, localOffset + 26);
  const extraLength = readUInt16(buffer, localOffset + 28);
  const dataOffset = localOffset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataOffset, dataOffset + entry.compressedSize);

  if (entry.method === 0) return compressed;
  if (entry.method === 8) return inflateRawSync(compressed);
  throw new Error(`Unsupported ZIP compression method ${entry.method} for ${entry.fileName}`);
}

async function main() {
  const [sourceMetadata, downloadAllowlist] = await Promise.all([
    readJson(sourceMetadataPath),
    readJson(downloadAllowlistPath),
  ]);
  const { metadata, allowlist } = requireKenneyUiGates(sourceMetadata, downloadAllowlist);

  const archive = await readFile(zipPath);
  const archiveSha256 = sha256(archive);
  if (allowlist.archiveSha256 && archiveSha256 !== allowlist.archiveSha256) {
    throw new Error(`Kenney UI Pack archive SHA256 mismatch: expected ${allowlist.archiveSha256}, got ${archiveSha256}`);
  }

  const zipEntries = parseZip(archive);
  const imported = [];
  const skipped = [];

  for (const entry of zipEntries) {
    const isDirectory = entry.fileName.endsWith('/');
    const extension = path.extname(entry.fileName).toLowerCase();
    const normalizedPath = normalizeZipPath(entry.fileName);

    if (isDirectory || !allowedExtensions.has(extension)) {
      skipped.push({
        sourcePath: entry.fileName,
        reason: isDirectory ? 'directory' : `extension-not-imported-by-default:${extension || 'none'}`,
      });
      continue;
    }

    const targetPath = path.join(targetDir, normalizedPath);
    assertInside(targetDir, targetPath);

    const payload = extractEntry(archive, entry);
    if (payload.length !== entry.uncompressedSize) {
      throw new Error(`ZIP size mismatch for ${entry.fileName}`);
    }

    imported.push({
      sourcePath: entry.fileName,
      path: toPosix(path.relative(repoRoot, targetPath)),
      extension,
      bytes: payload.length,
      sha256: sha256(payload),
    });

    if (!isDryRun) {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, payload);
    }
  }

  imported.sort((a, b) => a.path.localeCompare(b.path));
  skipped.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));

  const credit = {
    schemaVersion: '1.0.0',
    packId: 'kenney-ui-pack',
    license: metadata.license,
    licenseName: metadata.licenseName,
    sourceStatus: 'source-verified',
    sourceUrl: metadata.sourceUrl,
    downloadUrl: metadata.downloadUrl,
    licenseUrl: metadata.licenseUrl,
    attributionRequired: false,
    binaryImportStatus: 'imported-from-official-zip',
    archiveSha256,
    notes: [
      'Generated by scripts/import-kenney-ui-pack.mjs.',
      'Visual-only UI assets for client-2d HUD, skillbar, inventory panels, mobile UI and admin UI.',
      'WorldTick, AREKernel, networking and server registries remain authoritative and untouched.',
    ],
  };

  const manifest = {
    schemaVersion: '1.0.0',
    packId: 'kenney-ui-pack',
    sourceUrl: metadata.sourceUrl,
    downloadUrl: metadata.downloadUrl,
    license: metadata.license,
    licenseUrl: metadata.licenseUrl,
    authorityPolicy: 'visual-only: WorldTick and AREKernel remain authoritative',
    archive: {
      fileName: path.basename(zipPath),
      sha256: archiveSha256,
      bytes: archive.length,
      entryCount: zipEntries.length,
    },
    targetDirectory: toPosix(path.relative(repoRoot, targetDir)),
    importedCount: imported.length,
    skippedCount: skipped.length,
    imported,
    skipped,
  };

  if (!isDryRun) {
    await writeJson(creditsPath, credit);
    await writeJson(generatedManifestPath, manifest);
  }

  console.log(JSON.stringify({
    mode: isDryRun ? 'dry-run' : 'write',
    archiveSha256,
    importedCount: imported.length,
    skippedCount: skipped.length,
    targetDirectory: toPosix(path.relative(repoRoot, targetDir)),
    creditsPath: toPosix(path.relative(repoRoot, creditsPath)),
    generatedManifestPath: toPosix(path.relative(repoRoot, generatedManifestPath)),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
