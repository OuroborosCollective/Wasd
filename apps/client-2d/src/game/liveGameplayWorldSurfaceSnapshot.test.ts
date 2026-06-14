import { describe, expect, it } from 'vitest';
import { normalizeLiveGameplaySnapshotWithWorldSurface } from './liveGameplayWorldSurfaceSnapshot';

describe('liveGameplayWorldSurfaceSnapshot', () => {
  it('defaults to empty world surface', () => {
    const snapshot = normalizeLiveGameplaySnapshotWithWorldSurface(null);
    expect(snapshot.worldSurface.schemaVersion).toBe('world-surface-model.v1');
    expect(snapshot.worldSurface.groups).toHaveLength(0);
    expect(snapshot.worldSurface.points).toHaveLength(0);
  });

  it('preserves server-authoritative surface payload', () => {
    const snapshot = normalizeLiveGameplaySnapshotWithWorldSurface({
      worldSurface: {
        schemaVersion: 'world-surface-model.v1',
        tick: 3,
        groups: [{ id: 'house_1' }],
        points: [{ id: 'lineage_1' }],
      },
    } as never);

    expect(snapshot.worldSurface.tick).toBe(3);
    expect(snapshot.worldSurface.groups).toHaveLength(1);
    expect(snapshot.worldSurface.points).toHaveLength(1);
  });
});
