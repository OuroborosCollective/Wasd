import { describe, expect, it } from 'vitest';
import { ARECycle } from '../core/are/ARECycle';
import { AREPayloadFactory } from '../core/are/AREPayload';
import { AREReplayBuffer } from '../core/are/AREReplayBuffer';

function createPayload(id = 'replay_entity_01') {
  const genesis = AREPayloadFactory.createNormalized(id, { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
  return ARECycle.processCycle(genesis);
}

describe('ARE-Logic: replay ring buffer', () => {
  it('records tick-indexed payload entries outside the entity payload', () => {
    const buffer = new AREReplayBuffer(5);
    const payload = createPayload();
    const entry = buffer.record(1, payload);

    expect(entry.tick).toBe(1);
    expect(entry.entityId).toBe('replay_entity_01');
    expect(entry.stateHash).toBe(payload.stateHash);
    expect(entry.payload).toBe(payload);
    expect((payload as any).history).toBeUndefined();
    expect((payload as any).replay).toBeUndefined();
  });

  it('retrieves entries by tick and entity id', () => {
    const buffer = new AREReplayBuffer(5);
    const payload = createPayload('entity_lookup');
    buffer.record(12, payload);

    expect(buffer.get(12, 'entity_lookup')?.payload).toBe(payload);
    expect(buffer.get(13, 'entity_lookup')).toBeUndefined();
  });

  it('evicts oldest entries when capacity is exceeded', () => {
    const buffer = new AREReplayBuffer(2);
    const a = createPayload('a');
    const b = createPayload('b');
    const c = createPayload('c');

    buffer.record(1, a);
    buffer.record(2, b);
    buffer.record(3, c);

    expect(buffer.size).toBe(2);
    expect(buffer.get(1, 'a')).toBeUndefined();
    expect(buffer.get(2, 'b')).toBeDefined();
    expect(buffer.get(3, 'c')).toBeDefined();
  });

  it('replaces duplicate tick/entity entries instead of bloating state', () => {
    const buffer = new AREReplayBuffer(5);
    const first = createPayload('same');
    const second = ARECycle.processCycle(first);

    buffer.record(10, first);
    buffer.record(10, second);

    expect(buffer.size).toBe(1);
    expect(buffer.get(10, 'same')?.payload).toBe(second);
  });

  it('returns latest entries globally and per entity', () => {
    const buffer = new AREReplayBuffer(5);
    const a1 = createPayload('a');
    const b1 = createPayload('b');
    const a2 = ARECycle.processCycle(a1);

    buffer.record(1, a1);
    buffer.record(2, b1);
    buffer.record(3, a2);

    expect(buffer.latest()?.tick).toBe(3);
    expect(buffer.latest('a')?.tick).toBe(3);
    expect(buffer.latest('b')?.tick).toBe(2);
  });

  it('freezes entries and snapshot arrays', () => {
    const buffer = new AREReplayBuffer(5);
    const entry = buffer.record(1, createPayload());
    const snapshot = buffer.snapshot();

    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => {
      (entry as any).tick = 999;
    }).toThrow(TypeError);
  });

  it('rejects invalid capacity and invalid ticks', () => {
    expect(() => new AREReplayBuffer(0)).toThrow('[ARE-Replay]');
    const buffer = new AREReplayBuffer(1);
    expect(() => buffer.record(-1, createPayload())).toThrow('[ARE-Replay]');
    expect(() => buffer.record(1.5, createPayload())).toThrow('[ARE-Guard]');
  });
});
