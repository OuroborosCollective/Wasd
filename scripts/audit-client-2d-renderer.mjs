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
      ['consumes renderer runtime snapshot type', 'FutureRendererRuntimeSnapshot'],
      ['passes runtime snapshot callback', 'onRuntimeSnapshot'],
      ['bridges stitch HUD', 'ArelorianStitchHud'],
      ['publishes player debug position from runtime', 'debugPlayerPos={runtime.playerPos}'],
      ['publishes visible chunk count from runtime', 'debugVisibleChunks={runtime.visibleChunks}'],
      ['uses renderer initialized state for HUD online state', 'connected={runtime.initialized}'],
      ['keeps network debug waiting without a network source', 'debugNetworkStatus="waiting"'],
    ],
    forbidden: [
      ['hardcoded visible chunk count', 'const visibleChunks = 25'],
      ['hardcoded HUD connected state', 'connected={true}'],
      ['renderer status masquerading as network', 'connected={runtime.networkStatus === "connected"}'],
      ['renderer status passed as network debug', 'debugNetworkStatus={runtime.networkStatus}'],
    ],
  },
  {
    path: 'apps/client-2d/src/DeterministicWorldIsoAppFuture.tsx',
    checks: [
      ['exports runtime snapshot contract', 'FutureRendererRuntimeSnapshot'],
      ['exports renderer status in snapshot', 'rendererStatus'],
      ['accepts runtime snapshot callback', 'onRuntimeSnapshot'],
      ['stores current renderer phase in ref', 'phaseRef'],
      ['tracks active visible chunks separately', 'activeVisibleChunks'],
      ['computes active visible chunk keys', 'makeActiveVisibleChunkKeys'],
      ['emits current runtime snapshot', 'emitRuntimeSnapshot'],
      ['uses shared chunk planner', 'generateChunkScenePlan'],
      ['derives biome from chunk and seed', 'deriveChunkBiome'],
      ['keeps visible chunk radius', 'VIEW_RADIUS = 2'],
      ['streams chunks around player', 'streamChunks'],
      ['updates actor motion', 'actors.current.forEach'],
      ['registers mobile movement bridge', '__wasd2dMove'],
    ],
    forbidden: [
      ['reports cumulative loaded chunks as visible', 'visibleChunks: chunks.current.size'],
      ['reports renderer phase as network status', 'networkStatus:'],
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
  for (const [label, token] of entry.forbidden ?? []) {
    if (content.includes(token)) failures.push(`${entry.path}: forbidden ${label} (${token})`);
  }
}

if (failures.length > 0) {
  console.error('[client-2d-renderer-audit] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[client-2d-renderer-audit] ok');
