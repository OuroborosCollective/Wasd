#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const required = [
  {
    path: 'apps/client-2d/src/DeterministicWorldIsoApp.tsx',
    checks: [
      ['routes through HUD bridge', 'DeterministicWorldIsoAppHudBridge'],
    ],
  },
  {
    path: 'apps/client-2d/src/DeterministicWorldIsoAppHudBridge.tsx',
    checks: [
      ['imports future renderer', 'DeterministicWorldIsoAppFuture'],
      ['bridges stitch HUD', 'ArelorianStitchHud'],
      ['publishes player debug position', 'debugPlayerPos'],
      ['publishes visible chunk count', 'debugVisibleChunks'],
    ],
  },
  {
    path: 'apps/client-2d/src/DeterministicWorldIsoAppFuture.tsx',
    checks: [
      ['uses shared chunk planner', 'generateChunkScenePlan'],
      ['derives biome from chunk and seed', 'deriveChunkBiome'],
      ['keeps visible chunk radius', 'VIEW_RADIUS = 2'],
      ['streams chunks around player', 'streamChunks'],
      ['updates actor motion', 'actors.current.forEach'],
      ['registers mobile movement bridge', '__wasd2dMove'],
    ],
  },
  {
    path: 'apps/client-2d/src/world/renderChunkScenePlanFixed.ts',
    checks: [
      ['has atlas frame crop helper', 'textureFrame'],
      ['uses Pixi rectangle crop', 'new Rectangle'],
      ['exports fixed renderer', 'renderChunkScenePlanFixed'],
    ],
  },
];

const failures = [];

for (const entry of required) {
  const filePath = path.join(ROOT, entry.path);
  if (!fs.existsSync(filePath)) {
    failures.push(`${entry.path}: missing file`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.trim() === 'x') failures.push(`${entry.path}: placeholder content`);
  for (const [label, token] of entry.checks) {
    if (!content.includes(token)) failures.push(`${entry.path}: missing ${label} (${token})`);
  }
}

if (failures.length > 0) {
  console.error('[client-2d-renderer-audit] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[client-2d-renderer-audit] ok');
