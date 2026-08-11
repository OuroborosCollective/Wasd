import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  JsonLayerPersistenceAdapter,
  resolveLayerStateFilePath,
} from '../JsonLayerPersistenceAdapter.js';
import {
  layersToCanonicalArray,
  canonicalArrayToLayers,
  normalizePersistedLayerState,
} from '../LayerPersistencePort.js';
import { createChunkKey, createStateHash, createTickId } from '../types.js';
import { createEmptyIARELogicLayers } from '../IARELogicLayers.js';

const ZERO_HASH = '0'.repeat(64);

function makeLayers(values: Partial<Record<string, number>> = {}) {
  const base = createEmptyIARELogicLayers();
  return { ...base, ...values } as typeof base;
}

describe('LayerPersistencePort helpers', () => {
  it('layersToCanonicalArray / canonicalArrayToLayers round-trip preserves all 13 layers', () => {
    const layers = makeLayers({
      ecology: 100 as any,
      market: 200 as any,
      cycles: 999 as any,
    });
    const arr = layersToCanonicalArray(layers);
    expect(arr).toHaveLength(13);
    const restored = canonicalArrayToLayers(arr);
    expect(restored).toEqual(layers);
  });

  it('canonicalArrayToLayers defaults missing layers to 0 (defensive)', () => {
    const restored = canonicalArrayToLayers([['ecology', 42 as any]]);
    expect(restored.ecology).toBe(42);
    expect(restored.market).toBe(0);
    expect(restored.cycles).toBe(0);
  });

  it('normalizePersistedLayerState returns null for corrupt input', () => {
    expect(normalizePersistedLayerState(null)).toBeNull();
    expect(normalizePersistedLayerState({ chunkKey: '1:1', tick: 1, deltaHash: 'bad' } as any)).toBeNull();
    expect(normalizePersistedLayerState({ tick: 1, deltaHash: ZERO_HASH } as any)).toBeNull();
  });

  it('normalizePersistedLayerState accepts valid records', () => {
    const normalized = normalizePersistedLayerState({
      chunkKey: createChunkKey(1, 1),
      tick: createTickId(5),
      deltaHash: createStateHash('a'.repeat(64)),
      schemaVersion: 1 as const,
      layers: [['ecology', 7 as any]],
    });
    expect(normalized).not.toBeNull();
    expect(normalized!.chunkKey).toBe('1:1');
    expect(normalized!.tick).toBe(5);
    expect(normalized!.layers[0]).toEqual(['ecology', 7]);
  });
});

describe('JsonLayerPersistenceAdapter', () => {
  let dir: string;
  let filePath: string;
  let adapter: JsonLayerPersistenceAdapter;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'layer-persist-'));
    filePath = path.join(dir, 'data', 'layer-state.json');
    adapter = new JsonLayerPersistenceAdapter(filePath);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes a real file (not a no-op) and reads it back identically', async () => {
    const layers = makeLayers({ ecology: 123 as any, conflict: 77 as any });
    const hash = createStateHash('a'.repeat(64));
    await adapter.saveBatch([
      {
        chunkKey: createChunkKey(1, 1),
        tick: 42 as any,
        deltaHash: hash,
        schemaVersion: 1 as const,
        layers: layersToCanonicalArray(layers),
      },
    ]);

    // Real file must exist on disk.
    await expect(access(filePath)).resolves.toBeUndefined();

    const loaded = await adapter.loadChunkState(createChunkKey(1, 1));
    expect(loaded).not.toBeNull();
    expect(loaded!.chunkKey).toBe('1:1');
    expect(loaded!.tick).toBe(42);
    expect(loaded!.deltaHash).toBe(hash);
    expect(canonicalArrayToLayers(loaded!.layers)).toEqual(layers);
  });

  it('keeps the newest tick per chunk (no stale overwrite)', async () => {
    const layersA = makeLayers({ ecology: 1 as any });
    const layersB = makeLayers({ ecology: 99 as any });
    const hash = createStateHash('b'.repeat(64));

    await adapter.saveBatch([
      { chunkKey: createChunkKey(1, 1), tick: 1 as any, deltaHash: createStateHash(ZERO_HASH), schemaVersion: 1 as const, layers: layersToCanonicalArray(layersA) },
      { chunkKey: createChunkKey(1, 1), tick: 5 as any, deltaHash: hash, schemaVersion: 1 as const, layers: layersToCanonicalArray(layersB) },
    ]);

    const loaded = await adapter.loadChunkState(createChunkKey(1, 1));
    expect(loaded!.tick).toBe(5);
    expect(canonicalArrayToLayers(loaded!.layers).ecology).toBe(99);
  });

  it('produces a deterministically sorted on-disk representation (canonical)', async () => {
    const layers = makeLayers({ ecology: 50 as any });

    // Write chunks in reverse key order.
    await adapter.saveBatch([
      { chunkKey: createChunkKey(9, 9), tick: 1 as any, deltaHash: createStateHash(ZERO_HASH), schemaVersion: 1 as const, layers: layersToCanonicalArray(layers) },
      { chunkKey: createChunkKey(1, 1), tick: 1 as any, deltaHash: createStateHash(ZERO_HASH), schemaVersion: 1 as const, layers: layersToCanonicalArray(layers) },
      { chunkKey: createChunkKey(5, 5), tick: 1 as any, deltaHash: createStateHash(ZERO_HASH), schemaVersion: 1 as const, layers: layersToCanonicalArray(layers) },
    ]);

    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as { chunks: { chunkKey: string }[] };
    const keys = parsed.chunks.map((c) => c.chunkKey);
    expect(keys).toEqual([...keys].sort());
  });

  it('loadAllChunkStates returns all persisted chunks sorted', async () => {
    const layers = makeLayers();
    await adapter.saveBatch([
      { chunkKey: createChunkKey(2, 2), tick: 1 as any, deltaHash: createStateHash(ZERO_HASH), schemaVersion: 1 as const, layers: layersToCanonicalArray(layers) },
      { chunkKey: createChunkKey(1, 1), tick: 1 as any, deltaHash: createStateHash(ZERO_HASH), schemaVersion: 1 as const, layers: layersToCanonicalArray(layers) },
    ]);

    const all = await adapter.loadAllChunkStates!();
    expect(all.map((s) => s.chunkKey)).toEqual(['1:1', '2:2']);
  });

  it('health reports ok=true and driver=json', async () => {
    const result = await adapter.health!();
    expect(result.ok).toBe(true);
    expect(result.driver).toBe('json');
  });

  it('returns null for a chunk that was never persisted', async () => {
    const loaded = await adapter.loadChunkState(createChunkKey(0, 0));
    expect(loaded).toBeNull();
  });

  it('survives corrupt JSON (fail-closed empty read)', async () => {
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, 'not json at all {{{', 'utf8');

    const loaded = await adapter.loadChunkState(createChunkKey(1, 1));
    expect(loaded).toBeNull();
  });

  it('identical event batch produces identical persisted representation', async () => {
    const layers = makeLayers({ ecology: 7 as any });
    const events = [
      { chunkKey: createChunkKey(1, 1), tick: 1 as any, deltaHash: createStateHash('c'.repeat(64)), schemaVersion: 1 as const, layers: layersToCanonicalArray(layers) },
      { chunkKey: createChunkKey(2, 2), tick: 1 as any, deltaHash: createStateHash('d'.repeat(64)), schemaVersion: 1 as const, layers: layersToCanonicalArray(makeLayers({ market: 3 as any })) },
    ];

    await adapter.saveBatch(events);
    const rawA = await readFile(filePath, 'utf8');

    // Fresh adapter on a fresh file with the same batch must match byte-for-byte.
    const filePathB = path.join(dir, 'data-b', 'layer-state.json');
    const adapterB = new JsonLayerPersistenceAdapter(filePathB);
    await adapterB.saveBatch(events);
    const rawB = await readFile(filePathB, 'utf8');

    expect(rawA).toBe(rawB);
  });
});

describe('resolveLayerStateFilePath', () => {
  afterEach(() => {
    delete process.env.LAYER_STATE_FILE;
  });

  it('honors LAYER_STATE_FILE env var', () => {
    process.env.LAYER_STATE_FILE = '/tmp/custom-layer-state.json';
    expect(resolveLayerStateFilePath()).toBe('/tmp/custom-layer-state.json');
  });
});
