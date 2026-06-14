export const WORLD_SURFACE_SCHEMA_VERSION = 'world-surface-model.v1';

export interface WorldSurfaceSnapshot {
  readonly schemaVersion: typeof WORLD_SURFACE_SCHEMA_VERSION;
  readonly tick: number;
  readonly groups: readonly unknown[];
  readonly points: readonly unknown[];
}

export const EMPTY_WORLD_SURFACE_SNAPSHOT: WorldSurfaceSnapshot = Object.freeze({
  schemaVersion: WORLD_SURFACE_SCHEMA_VERSION,
  tick: 0,
  groups: Object.freeze([]),
  points: Object.freeze([]),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeWorldSurfaceSnapshot(input: unknown): WorldSurfaceSnapshot {
  if (!isRecord(input) || input.schemaVersion !== WORLD_SURFACE_SCHEMA_VERSION) return EMPTY_WORLD_SURFACE_SNAPSHOT;
  return Object.freeze({
    schemaVersion: WORLD_SURFACE_SCHEMA_VERSION,
    tick: Math.max(0, Math.floor(numberValue(input.tick))),
    groups: Object.freeze(Array.isArray(input.groups) ? [...input.groups] : []),
    points: Object.freeze(Array.isArray(input.points) ? [...input.points] : []),
  });
}
