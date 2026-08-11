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

  it('benchmarks fast relational comparison vs localeCompare for sorting client model fields', () => {
    // Generate simulated items with distinct IDs/IDs with random patterns
    const itemCount = 2000;
    const originalItems: Array<{ id: string }> = [];
    for (let i = 0; i < itemCount; i++) {
      const paddedIndex = String(i).padStart(5, "0");
      const paddedHash = String((i * 12345) % 10000).padStart(5, "0");
      originalItems.push({
        id: `item_type_index_${paddedHash}_id_hash_val_${paddedIndex}`,
      });
    }

    // 1. Benchmark localeCompare sorting
    const itemsForLocaleCompare = [...originalItems];
    const t0 = performance.now();
    for (let loop = 0; loop < 20; loop++) {
      itemsForLocaleCompare.sort((a, b) => a.id.localeCompare(b.id));
    }
    const t1 = performance.now();
    const durationLocaleCompare = t1 - t0;

    // 2. Benchmark fast relational sorting
    const itemsForFastCompare = [...originalItems];
    const t2 = performance.now();
    for (let loop = 0; loop < 20; loop++) {
      itemsForFastCompare.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    }
    const t3 = performance.now();
    const durationFastCompare = t3 - t2;

    const speedup = durationLocaleCompare / durationFastCompare;

    console.log(`\n⚡ LiveGameplaySnapshot Sort Benchmark (${itemCount} items, 20 iterations):`);
    console.log(`  - localeCompare sort:    ${durationLocaleCompare.toFixed(4)}ms`);
    console.log(`  - fast relational sort:  ${durationFastCompare.toFixed(4)}ms`);
    console.log(`  - Speedup factor:        ${speedup.toFixed(2)}x faster`);

    // Verify both sorts yield the same order
    expect(itemsForFastCompare).toEqual(itemsForLocaleCompare);
  });
});
