import type { LiveGameplayWorldSurface } from '../../gameplay/LiveGameplaySnapshotTypes.js';
import { createNpcLineageRuntime } from './createNpcLineageRuntime.js';
import { createLineageSurfaceModel } from './LineageSurfaceModel.js';
import { lineageSurfaceToWorldSurface } from './LineageWorldSurfaceAdapter.js';

let cachedRuntime: ReturnType<typeof createNpcLineageRuntime> | null = null;

function getRuntime(): ReturnType<typeof createNpcLineageRuntime> {
  if (!cachedRuntime) {
    cachedRuntime = createNpcLineageRuntime();
  }
  return cachedRuntime;
}

export function getNpcLineageWorldSurface(_playerId: string, logicalIndex: number): LiveGameplayWorldSurface {
  const runtime = getRuntime();
  const surface = createLineageSurfaceModel(runtime.registry, logicalIndex);
  return lineageSurfaceToWorldSurface(surface);
}

export function resetNpcLineageWorldSurfaceRuntimeForTests(): void {
  cachedRuntime = null;
}
