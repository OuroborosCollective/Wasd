import { describe, expect, it } from 'vitest';
import { normalizeWorldSurfaceSnapshot, WORLD_SURFACE_SCHEMA_VERSION } from './worldSurface';

describe('worldSurface', () => {
  it('normalizes missing input to empty surface', () => {
    const result = normalizeWorldSurfaceSnapshot(null);
    expect(result.groups).toHaveLength(0);
    expect(result.points).toHaveLength(0);
  });

  it('keeps server surface arrays as display-only data', () => {
    const result = normalizeWorldSurfaceSnapshot({
      schemaVersion: WORLD_SURFACE_SCHEMA_VERSION,
      tick: 7,
      groups: [{ id: 'h1' }],
      points: [{ id: 'n1' }],
    });

    expect(result.tick).toBe(7);
    expect(result.groups).toHaveLength(1);
    expect(result.points).toHaveLength(1);
  });
});
