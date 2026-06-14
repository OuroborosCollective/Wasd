import type { LiveGameplayWorldSurface } from '../../gameplay/LiveGameplaySnapshotTypes.js';
import { createNpcLineageRuntime } from './createNpcLineageRuntime.js';
import { createLineageSurfaceModel } from './LineageSurfaceModel.js';
import { lineageSurfaceToWorldSurface } from './LineageWorldSurfaceAdapter.js';

export function getNpcLineageWorldSurface(_playerId: string, logicalIndex: number): LiveGameplayWorldSurface {
  const runtime = createNpcLineageRuntime();
  const surface = createLineageSurfaceModel(runtime.registry, logicalIndex);
  return lineageSurfaceToWorldSurface(surface);
}
