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
    forbidden: [
      ['active future/demo renderer import', 'DeterministicWorldIsoAppFuture'],
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
      ['publishes active world chunk evidence', 'activeWorldChunks'],
      ['publishes resolved world asset evidence', 'resolvedWorldAssets'],
      ['publishes missing world asset evidence', 'missingWorldAssets'],
      ['requires world projection before initialized state', 'runtime.worldProjectionReady === true'],
      ['forwards interaction through canonical client action event', 'wasd:client-action'],
    ],
    forbidden: [
      ['active future/demo renderer import', 'DeterministicWorldIsoAppFuture'],
      ['future renderer runtime snapshot contract', 'FutureRendererRuntimeSnapshot'],
      ['hardcoded Architect player identity', 'playerName="Architect"'],
      ['hardcoded HUD connected state', 'connected={true}'],
      ['hardcoded waiting network state', 'debugNetworkStatus="waiting"'],
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
      ['loads real merged asset manifest', 'loadAssetManifest'],
      ['loads server world projection provenance', 'loadServerWorldProjection'],
      ['mounts real asset world surface', 'LiveAssetWorldSurface'],
      ['resolves presentation binding', 'presentationFor'],
      ['supports runtime sprite/atlas loading', 'Assets.load'],
      ['reports server tick', 'serverTick'],
      ['reports world projection readiness', 'worldProjectionReady'],
      ['keeps renderer read-only', 'LiveAuthoritativeWorld2D'],
    ],
    forbidden: [
      ['local chunk generation', 'generateChunkScenePlan'],
      ['local future mobile movement bridge', '__wasd2dMove'],
      ['renderer-owned gameplay action send', 'sendPlayerAction'],
      ['local deterministic seed world simulation', 'deriveChunkBiome'],
      ['client-local production world seed constant', 'DEFAULT_WORLD_SEED'],
    ],
  },
  {
    path: 'apps/client-2d/src/world/LiveAssetWorldSurface.ts',
    checks: [
      ['uses canonical server projection schema', 'areloria.client2d-world-projection.v2'],
      ['requires presentation-only truth class', 'SERVER_SEEDED_STATIC_PRESENTATION'],
      ['uses authoritative 64-tile chunk constant', 'UNIFIED_CHUNK_SIZE_TILES'],
      ['uses 16-cell intra-chunk mesh constant', 'LEGACY_INTRACHUNK_MESH_TILES'],
      ['maps mesh scale explicitly', 'meshScaleTiles'],
      ['selects runtime chunk from authoritative chunk size', 'centerChunkX = Math.floor(tileX / this.projection.chunkSizeTiles)'],
      ['centers scaled mesh cells', 'meshCellCenterTile'],
      ['generates shared deterministic scene plan', 'generateChunkScenePlan'],
      ['binds terrain to manifest assets', 'bindTerrainWithContext'],
      ['binds roads to manifest assets', 'bindRoadWithContext'],
      ['binds buildings to manifest assets', 'bindBuildingWithContext'],
      ['binds props to manifest assets', 'bindPropWithContext'],
      ['suppresses generated NPC projection', 'Intentionally DO NOT render plan.npcs'],
    ],
    forbidden: [
      ['world shape fallback', 'new Graphics'],
      ['client-local production world seed constant', 'DEFAULT_WORLD_SEED'],
      ['legacy 16-tile runtime chunk field', 'readonly chunkTiles:'],
    ],
  },
  {
    path: 'server/src/api/healthRoutes.ts',
    checks: [
      ['exposes read-only world projection provenance', "router.get('/world-projection'"],
      ['uses canonical world seed resolver', 'resolveCanonicalWorldSeed()'],
      ['publishes unified runtime chunk size', 'UNIFIED_CHUNK_SIZE_TILES'],
      ['publishes intra-chunk mesh size', 'LEGACY_INTRACHUNK_MESH_TILES'],
      ['publishes projection as non-authoritative', 'gameplayAuthority: false'],
      ['publishes shared generator identity', "generator: 'OuroborosWorldDirectorV1'"],
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

const presentationPath = path.join(ROOT, 'game-data/visual/presentation_bindings.json');
if (!fs.existsSync(presentationPath)) {
  failures.push('game-data/visual/presentation_bindings.json: missing file');
} else {
  try {
    const presentation = JSON.parse(fs.readFileSync(presentationPath, 'utf8'));
    for (const kind of ['player', 'npc', 'loot']) {
      const binding = presentation?.fallbacks?.[kind]?.presentation2d;
      if (!binding) {
        failures.push(`presentation_bindings: missing ${kind} 2D fallback`);
        continue;
      }
      if (binding.kind !== 'asset_manifest') {
        failures.push(`presentation_bindings: ${kind} must use asset_manifest, got ${String(binding.kind)}`);
      }
      if (binding.kind === 'shape') {
        failures.push(`presentation_bindings: ${kind} production shape fallback forbidden`);
      }
    }
  } catch (error) {
    failures.push(`presentation_bindings: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
  }
}

if (failures.length > 0) {
  console.error('[client-2d-renderer-audit] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[client-2d-renderer-audit] ok: active 2D renderer uses live authority + server-seeded real asset projection');
