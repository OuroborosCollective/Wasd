import { normalizeLiveGameplaySnapshot, type LiveGameplaySnapshot } from './liveGameplaySnapshot';
import { EMPTY_WORLD_SURFACE_SNAPSHOT, normalizeWorldSurfaceSnapshot, type WorldSurfaceSnapshot } from './worldSurface';

export type LiveGameplaySnapshotWithWorldSurface = LiveGameplaySnapshot & {
  readonly worldSurface: WorldSurfaceSnapshot;
};

type WorldSurfaceInput = Partial<LiveGameplaySnapshot> & {
  readonly worldSurface?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeLiveGameplaySnapshotWithWorldSurface(input: WorldSurfaceInput | null | undefined): LiveGameplaySnapshotWithWorldSurface {
  const base = normalizeLiveGameplaySnapshot(input);
  const surface = isRecord(input) ? normalizeWorldSurfaceSnapshot(input.worldSurface) : EMPTY_WORLD_SURFACE_SNAPSHOT;
  return Object.freeze({ ...base, worldSurface: surface });
}
