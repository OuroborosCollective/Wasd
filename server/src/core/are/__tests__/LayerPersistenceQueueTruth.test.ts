import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  LayerPersistenceQueue,
  createLayerPersistenceEvent,
  PERSISTENCE_CONSTANTS,
} from '../LayerPersistenceQueue.js';
import { JsonLayerPersistenceAdapter } from '../JsonLayerPersistenceAdapter.js';
import { createChunkKey, createStateHash } from '../types.js';
import { createEmptyIARELogicLayers } from '../IARELogicLayers.js';

const ZERO_HASH = '0'.repeat(64);

describe('LayerPersistenceQueue real-backend truth path (#2457)', () => {
  let dir: string;
  let filePath: string;
  let adapter: JsonLayerPersistenceAdapter;
  let queue: LayerPersistenceQueue;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'layer-queue-'));
    filePath = path.join(dir, 'data', 'layer-state.json');
    adapter = new JsonLayerPersistenceAdapter(filePath);
    queue = new LayerPersistenceQueue(adapter);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('does NOT fake-green without an adapter (degraded, failures counted)', async () => {
    const noAdapter = new LayerPersistenceQueue(null);
    noAdapter.enqueue(createLayerPersistenceEvent(
      createChunkKey(1, 1),
      1 as any,
      createEmptyIARELogicLayers(),
      createStateHash(ZERO_HASH),
    ));

    await noAdapter.flush();

    const stats = noAdapter.getStats();
    expect(stats.degraded).toBe(true);
    expect(stats.lastWriteConfirmed).toBe(false);
    expect(stats.failedEvents).toBe(1);
    expect(stats.flushedEvents).toBe(0);
    // Events preserved, not lost.
    expect(noAdapter.getQueueSize()).toBe(1);
  });

  it('flush writes through the real adapter and confirms the write', async () => {
    queue.enqueue(createLayerPersistenceEvent(
      createChunkKey(1, 1),
      7 as any,
      createEmptyIARELogicLayers(),
      createStateHash('a'.repeat(64)),
    ));

    await queue.flush();

    const stats = queue.getStats();
    expect(stats.flushedEvents).toBe(1);
    expect(stats.failedEvents).toBe(0);
    expect(stats.lastWriteConfirmed).toBe(true);
    expect(stats.degraded).toBe(false);
    expect(stats.driver).toBe('json');

    const readBack = await queue.loadChunkState(createChunkKey(1, 1));
    expect(readBack).not.toBeNull();
    expect(readBack!.chunkKey).toBe('1:1');
    expect(readBack!.tick).toBe(7);
  });

  it('a failing backend write increments failedEvents (not flushedEvents) and preserves events', async () => {
    const failingAdapter: JsonLayerPersistenceAdapter = {
      driverName: 'json',
      saveBatch: async () => { throw new Error('backend down'); },
      loadChunkState: async () => null,
    } as unknown as JsonLayerPersistenceAdapter;
    const failingQueue = new LayerPersistenceQueue(failingAdapter);

    failingQueue.enqueue(createLayerPersistenceEvent(
      createChunkKey(1, 1),
      1 as any,
      createEmptyIARELogicLayers(),
      createStateHash(ZERO_HASH),
    ));

    await expect(failingQueue.flush()).rejects.toThrow('backend down');

    const stats = failingQueue.getStats();
    expect(stats.failedEvents).toBe(1);
    expect(stats.flushedEvents).toBe(0);
    expect(stats.lastWriteConfirmed).toBe(false);
    expect(failingQueue.getQueueSize()).toBe(1); // events preserved
  });

  it('readback + rehydrate round-trip: Write -> Read -> identical layer values', async () => {
    const layers = { ...createEmptyIARELogicLayers(), ecology: 321 as any, market: 111 as any };
    queue.enqueue(createLayerPersistenceEvent(
      createChunkKey(4, 4),
      9 as any,
      layers,
      createStateHash('e'.repeat(64)),
    ));
    await queue.flush();

    const read = await queue.loadChunkState(createChunkKey(4, 4));
    expect(read).not.toBeNull();
    const restored = read!.layers.map(([name, v]) => [name, Number(v)]);
    expect(restored.find(([n]) => n === 'ecology')![1]).toBe(321);
    expect(restored.find(([n]) => n === 'market')![1]).toBe(111);
  });

  it('identical event batches produce deterministically identical persisted representation', async () => {
    const layers = { ...createEmptyIARELogicLayers(), cycles: 42 as any };
    const hash = createStateHash('f'.repeat(64));
    const batch = [createLayerPersistenceEvent(createChunkKey(1, 1), 3 as any, layers, hash)];

    await queue.flush();
    queue.enqueue(batch[0]);
    await queue.flush();
    const firstRead = await adapter.loadAllChunkStates!();

    // Fresh queue + adapter on a second file with the same batch.
    const filePath2 = path.join(dir, 'data2', 'layer-state.json');
    const adapter2 = new JsonLayerPersistenceAdapter(filePath2);
    const queue2 = new LayerPersistenceQueue(adapter2);
    queue2.enqueue(createLayerPersistenceEvent(createChunkKey(1, 1), 3 as any, layers, hash));
    await queue2.flush();
    const secondRead = await adapter2.loadAllChunkStates!();

    expect(secondRead).toEqual(firstRead);
  });

  it('retry of the same event does not duplicate persisted chunks', async () => {
    const layers = { ...createEmptyIARELogicLayers() };
    const hash = createStateHash('1'.repeat(64));
    const ev = createLayerPersistenceEvent(createChunkKey(2, 2), 1 as any, layers, hash);

    queue.enqueue(ev);
    await queue.flush();
    queue.enqueue(ev);
    await queue.flush();

    const all = await adapter.loadAllChunkStates!();
    expect(all.filter((s) => s.chunkKey === '2:2')).toHaveLength(1);
  });

  it('constructor default exposes driver name from env (json) and degraded=true until adapter set', () => {
    const q = new LayerPersistenceQueue();
    expect(q.getDriverName()).toBe('json');
    expect(q.isDegraded()).toBe(true);
  });

  it('setAdapter clears degraded state', () => {
    const q = new LayerPersistenceQueue();
    q.setAdapter(adapter);
    expect(q.isDegraded()).toBe(false);
    expect(q.getDriverName()).toBe('json');
  });

  it('PERSISTENCE_CONSTANTS still exported', () => {
    expect(PERSISTENCE_CONSTANTS.DEFAULT_FLUSH_INTERVAL_TICKS).toBe(300);
    expect(PERSISTENCE_CONSTANTS.MAX_QUEUE_SIZE).toBe(1000);
  });
});
