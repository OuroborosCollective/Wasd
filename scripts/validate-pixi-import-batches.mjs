#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const batchDir = path.join(repoRoot, 'docs/archive/import-batches');

const requiredStringFields = [
  'schemaVersion',
  'batchId',
  'packId',
  'sourceUrl',
  'license',
  'licenseUrl',
  'targetFolder',
  'status',
];

const requiredBooleanFields = [
  'sourceVerified',
  'downloadAllowlisted',
];

const requiredSafetyFlags = [
  'visualOnly',
  'noWorldTickChanges',
  'noAREKernelChanges',
  'noServerRegistryChanges',
  'noNetworkingChanges',
  'noBinaryAssetsInThisCommit',
];

async function findJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function requireString(batch, field, errors, file) {
  if (typeof batch[field] !== 'string' || batch[field].trim().length === 0) {
    errors.push(`${file}: missing or empty string field: ${field}`);
  }
}

function requireBoolean(batch, field, errors, file) {
  if (typeof batch[field] !== 'boolean') {
    errors.push(`${file}: missing boolean field: ${field}`);
  }
}

function requireStringArray(batch, field, errors, file) {
  if (!Array.isArray(batch[field]) || batch[field].length === 0 || batch[field].some((value) => typeof value !== 'string' || value.trim().length === 0)) {
    errors.push(`${file}: missing non-empty string array field: ${field}`);
  }
}

function validateBatch(batch, file) {
  const errors = [];

  for (const field of requiredStringFields) requireString(batch, field, errors, file);
  for (const field of requiredBooleanFields) requireBoolean(batch, field, errors, file);

  requireStringArray(batch, 'requiredCommands', errors, file);
  requireStringArray(batch, 'blockedUntil', errors, file);
  requireStringArray(batch, 'runtimeManifestFiles', errors, file);
  requireStringArray(batch, 'creditFiles', errors, file);

  if (!batch.safety || typeof batch.safety !== 'object' || Array.isArray(batch.safety)) {
    errors.push(`${file}: missing safety object`);
  } else {
    for (const flag of requiredSafetyFlags) {
      if (batch.safety[flag] !== true) errors.push(`${file}: safety.${flag} must be true`);
    }
  }

  if (typeof batch.targetFolder === 'string' && !batch.targetFolder.startsWith('apps/client-2d/public/2d-assets/')) {
    errors.push(`${file}: targetFolder must stay inside apps/client-2d/public/2d-assets`);
  }

  if (typeof batch.sourceUrl === 'string' && !batch.sourceUrl.startsWith('https://')) {
    errors.push(`${file}: sourceUrl must be https`);
  }

  return errors;
}

async function main() {
  const files = await findJsonFiles(batchDir);
  const errors = [];
  const checked = [];

  for (const absoluteFile of files) {
    const relativeFile = path.relative(repoRoot, absoluteFile);
    let batch;
    try {
      batch = JSON.parse(await readFile(absoluteFile, 'utf8'));
    } catch (error) {
      errors.push(`${relativeFile}: invalid JSON: ${error.message}`);
      continue;
    }

    checked.push(relativeFile);
    errors.push(...validateBatch(batch, relativeFile));
  }

  const report = {
    schemaVersion: '1.0.0',
    checkedCount: checked.length,
    checked,
    errors,
  };

  console.log(JSON.stringify(report, null, 2));

  if (errors.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
