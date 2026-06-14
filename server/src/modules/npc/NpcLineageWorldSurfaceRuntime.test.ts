import { describe, expect, it } from 'vitest';
import { getNpcLineageWorldSurface } from './NpcLineageWorldSurfaceRuntime';

describe('NpcLineageWorldSurfaceRuntime', () => {
  it('returns a shared world surface snapshot from lineage runtime replay', () => {
    const surface = getNpcLineageWorldSurface('player_test', 1234);

    expect(surface.schemaVersion).toBe('world-surface-model.v1');
    expect(surface.tick).toBe(1234);
    expect(Array.isArray(surface.groups)).toBe(true);
    expect(Array.isArray(surface.points)).toBe(true);
  });
});
