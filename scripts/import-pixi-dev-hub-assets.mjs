#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const archivePath = path.join(repoRoot, 'public/archive/wasd-pixi-asset-packs.json');
const runtimeManifestPath = path.join(
  repoRoot,
  'apps/client-2d/public/2d-assets/manifests/pixi-dev-hub-first-batch.json',
);
const creditsDir = path.join(repoRoot, 'apps/client-2d/public/2d-assets/credits');

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function assertVisualOnlyPolicy(manifest) {
  const rules = manifest.coreRules || [];
  const required = [
    'WorldTick and AREKernel remain authoritative.',
    'No sprite placement may create authoritative gameplay state.',
  ];

  for (const rule of required) {
    if (!rules.includes(rule)) {
      throw new Error(`Missing required asset safety rule: ${rule}`);
    }
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeCredits(pack) {
  const creditPath = path.join(creditsDir, `${slugify(pack.id)}.json`);
  const credit = {
    schemaVersion: '1.0.0',
    packId: pack.id,
    license: pack.license,
    sourceStatus: 'required-before-binary-import',
    sourceUrl: null,
    attributionRequired: !String(pack.license || '').toLowerCase().includes('cc0'),
    notes: [
      'This file is generated as an import planning placeholder.',
      'Fill sourceUrl and attribution metadata before committing downloaded assets.',
      'Asset content is visual-only and must not define authoritative gameplay state.',
    ],
  };
  await writeJson(creditPath, credit);
  return path.relative(repoRoot, creditPath);
}

async function ensureTargetDirectory(target) {
  const safeTarget = target.replace(/^\//, '');
  const absolute = path.join(repoRoot, safeTarget);
  await mkdir(absolute, { recursive: true });
  const gitkeep = path.join(absolute, '.gitkeep');
  await writeFile(gitkeep, '');
  return path.relative(repoRoot, absolute);
}

async function main() {
  const archive = await readJson(archivePath);
  assertVisualOnlyPolicy(archive);

  const runtimeManifest = await readJson(runtimeManifestPath);
  const plannedPacks = archive.firstIntegrationBatch || [];

  const results = [];
  for (const pack of plannedPacks) {
    const target = pack.target || pack.targetPath;
    if (!target) {
      throw new Error(`Pack ${pack.id} has no target path.`);
    }

    const targetDirectory = await ensureTargetDirectory(target);
    const creditFile = await writeCredits(pack);

    results.push({
      id: pack.id,
      decision: pack.decision,
      priority: pack.priority,
      license: pack.license,
      status: 'planned',
      targetDirectory,
      creditFile,
      nextRequiredActions: [
        'Add official source URL.',
        'Download asset pack from official source only.',
        'Normalize filenames to kebab-case.',
        'Generate Pixi-compatible atlas or manifest metadata.',
        'Run pnpm --filter @wasd/client-2d validate:assets.',
      ],
    });
  }

  runtimeManifest.generatedBy = 'scripts/import-pixi-dev-hub-assets.mjs';
  runtimeManifest.lastPlannedAt = new Date().toISOString();
  runtimeManifest.plannedResults = results;
  await writeJson(runtimeManifestPath, runtimeManifest);

  const planPath = path.join(repoRoot, 'apps/client-2d/public/2d-assets/manifests/pixi-dev-hub-import-plan.json');
  await writeJson(planPath, {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    sourceManifest: path.relative(repoRoot, archivePath),
    runtimeManifest: path.relative(repoRoot, runtimeManifestPath),
    authorityPolicy: 'visual-only: WorldTick and AREKernel remain authoritative',
    results,
  });

  console.log(`Pixi Dev Hub import plan generated for ${results.length} packs.`);
  console.log(`Plan: ${path.relative(repoRoot, planPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
