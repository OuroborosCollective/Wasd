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
      ['imports live authoritative renderer', 'LiveAuthoritativeWorld2D'],
      ['consumes live renderer runtime snapshot type', 'Live2DRuntimeSnapshot'],
      ['passes runtime snapshot callback', 'onRuntimeSnapshot={setRuntime}'],
      ['bridges stitch HUD', 'ArelorianStitchHud'],
      ['reads normalized live runtime state', 'useLiveRuntimeState'],
      ['publishes server/live player debug position', 'debugPlayerPos={playerPos}'],
      ['publishes real network debug status', 'debugNetworkStatus={live.networkStatus}'],
      ['publishes server tick readback', 'debugServerTick={live.serverTick ?? runtime.serverTick}'],
      ['forwards interaction through canonical client action event', 'wasd:client-action'],
    ],
    forbidden: [
      ['active future/demo renderer import', 'DeterministicWorldIsoAppFuture'],
      ['future renderer runtime snapshot contract', 'FutureRendererRuntimeSnapshot'],
      ['hardcoded Architect player identity', 'playerName="Architect"'],
      ['hardcoded HUD connected state', 'connected={true}'],
      ['hardcoded waiting network state', 'debugNetworkStatus="waiting"'],
      ['local generated visible chunk contract', 'runtime.visibleChunks'],
    ],
  },
  {
    path: 'apps/client-2d/src/LiveAuthoritativeWorld2D.tsx',
    checks: [
      ['uses live network client', 'createClient'],
      ['consumes authoritative heartbeat', 'WORLD_HEARTBEAT'],
      ['consumes world tick', 'world_tick'],
      ['normalizes live server summary', 'liveSummary'],
      ['loads shared Studio presentation feed', '/api/mcp/presentation-config'],
      ['resolves presentation binding', 'presentationFor'],
      ['supports runtime sprite/atlas loading', 'Assets.load'],
      ['reports server tick', 'serverTick'],
      ['keeps renderer read-only', 'LiveAuthoritativeWorld2D'],
    ],
    forbidden: [
      ['local chunk generation', 'generateChunkScenePlan'],
      ['local future mobile movement bridge', '__wasd2dMove'],
      ['renderer-owned gameplay action send', 'sendPlayerAction'],
      ['local deterministic seed world simulation', 'deriveChunkBiome'],
    ],
  },
  {
    path: 'apps/client-2d/src/main.tsx',
    checks: [
      ['mounts canonical network gameplay bridge', 'LiveGameplayNetworkBridge'],
      ['mounts live reality bridge', 'LiveRealityBridge'],
      ['mounts world heartbeat monitor', 'WorldHeartMonitor'],
      ['mounts deterministic world shell', 'DeterministicWorldIsoApp'],
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

console.log('[client-2d-renderer-audit] ok: active 2D renderer is a live server-authoritative projection');
