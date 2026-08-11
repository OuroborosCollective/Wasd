import { describe, it, expect } from 'vitest';
import { RuntimeWorldBrainStatePort } from '../WorldBrainRuntimePort.js';
import { createChunkKey, createStateHash } from '../types.js';
import { layersToCanonicalArray, type PersistedLayerState } from '../LayerPersistencePort.js';
import { createEmptyIARELogicLayers } from '../IARELogicLayers.js';

const ZERO_HASH = '0'.repeat(64);

function fakePersisted(chunkKey: ReturnType<typeof createChunkKey>, tick: number, layers: ReturnType<typeof createEmptyIARELogicLayers>): PersistedLayerState {
  return {
    chunkKey,
    tick: tick as any,
    deltaHash: createStateHash('a'.repeat(64)),
    schemaVersion: 1 as const,
    layers: layersToCanonicalArray(layers),
  };
}

describe('RuntimeWorldBrainStatePort rehydrate (#2457)', () => {
  it('registerChunk seeds canonically when no readback provider is set', () => {
    const port = new RuntimeWorldBrainStatePort({ worldSeed: 42 });
    port.registerChunk(createChunkKey(1, 1));
    const layers = port.readChunkLayers(createChunkKey(1, 1));
    expect(layers).not.toBeNull();
  });

  it('rehydrateChunk applies real persisted state over the canonical seed', async () => {
    const persisted = fakePersisted(
      createChunkKey(1, 1),
      99,
      { ...createEmptyIARELogicLayers(), ecology: 777 as any },
    );
    const port = new RuntimeWorldBrainStatePort({
      worldSeed: 42,
      readback: async () => persisted,
    });
    port.registerChunk(createChunkKey(1, 1));

    const applied = await port.rehydrateChunk(createChunkKey(1, 1));
    expect(applied).toBe(true);

    const layers = port.readChunkLayers(createChunkKey(1, 1));
    expect(layers!.ecology).toBe(777);
  });

  it('rehydrateChunk returns false when no persisted state exists (seed stays)', async () => {
    const port = new RuntimeWorldBrainStatePort({
      worldSeed: 42,
      readback: async () => null,
    });
    port.registerChunk(createChunkKey(2, 2));
    const applied = await port.rehydrateChunk(createChunkKey(2, 2));
    expect(applied).toBe(false);
    const layers = port.readChunkLayers(createChunkKey(2, 2));
    expect(layers).not.toBeNull(); // canonical seed present
  });

  it('rehydrateAll restores multiple chunks from real persisted data', async () => {
    const port = new RuntimeWorldBrainStatePort({ worldSeed: 42 });
    const persisted = [
      fakePersisted(createChunkKey(1, 1), 5, { ...createEmptyIARELogicLayers(), market: 50 as any }),
      fakePersisted(createChunkKey(2, 2), 5, { ...createEmptyIARELogicLayers(), conflict: 88 as any }),
    ];
    const count = await port.rehydrateAll(async () => persisted);
    expect(count).toBe(2);
    expect(port.readChunkLayers(createChunkKey(1, 1))!.market).toBe(50);
    expect(port.readChunkLayers(createChunkKey(2, 2))!.conflict).toBe(88);
  });

  it('setReadbackProvider can be set after construction', async () => {
    const port = new RuntimeWorldBrainStatePort({ worldSeed: 42 });
    port.setReadbackProvider(async (key) => key === '1:1' ? fakePersisted(createChunkKey(1, 1), 1, createEmptyIARELogicLayers()) : null);
    port.registerChunk(createChunkKey(1, 1));
    const applied = await port.rehydrateChunk(createChunkKey(1, 1));
    expect(applied).toBe(true);
  });
});
