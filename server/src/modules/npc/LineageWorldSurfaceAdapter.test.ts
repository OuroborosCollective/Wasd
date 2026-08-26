import { describe, expect, it } from 'vitest';
import { lineageSurfaceToWorldSurface } from './LineageWorldSurfaceAdapter';
import type { LineageSurfaceModel } from './LineageSurfaceModel';

describe('LineageWorldSurfaceAdapter', () => {
  it('maps lineage houses and nodes to shared world surface groups and points', () => {
    const surface: LineageSurfaceModel = {
      schemaVersion: 'lineage-surface-model.v1',
      tick: 12,
      houses: [{ id: 'h1', title: 'House One', settlementId: 's1', population: 2, active: true }],
      nodes: [{ id: 'n1', lineageHash: 'abc', houseId: 'h1', settlementId: 's1', x: 1, y: 2, z: 3 }],
    };

    const world = lineageSurfaceToWorldSurface(surface);

    expect(world.schemaVersion).toBe('world-surface-model.v1');
    expect(world.tick).toBe(12);
    expect(world.groups).toHaveLength(1);
    expect(world.points).toHaveLength(1);
  });
});
