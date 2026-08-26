import { describe, expect, it } from 'vitest';
import {
  createDeterministicEvent,
  deterministicHash,
  stableSort,
  stableStringify,
} from '../DeterministicEventFactory.js';

describe('DeterministicEventFactory', () => {
  it('creates byte-identical event identity from identical canonical input', () => {
    const input = {
      type: 'combat.damage',
      actorId: 'player:7',
      targetId: 'npc:2',
      chunkKey: 'chunk:1:-4',
      data: { damageMilli: 180_937, critical: false },
    } as const;
    const context = { tick: 9001, localIndex: 3, stateHash: 'a'.repeat(64) } as const;

    const first = createDeterministicEvent(input, context);
    const second = createDeterministicEvent(
      {
        ...input,
        data: { critical: false, damageMilli: 180_937 },
      },
      context,
    );

    expect(second).toEqual(first);
    expect(first.logicalTimeMs).toBe(900_100);
    expect(first.dataHash).toBe(deterministicHash(stableStringify(input.data)));
  });

  it('changes identity when a causal tick or local index changes', () => {
    const input = { type: 'loot.roll', actorId: 'player:1', data: { item: 'ore' } } as const;
    const baseline = createDeterministicEvent(input, { tick: 10, localIndex: 0 });

    expect(createDeterministicEvent(input, { tick: 11, localIndex: 0 }).id).not.toBe(baseline.id);
    expect(createDeterministicEvent(input, { tick: 10, localIndex: 1 }).id).not.toBe(baseline.id);
  });

  it('sorts entity identifiers with binary ordering instead of locale collation', () => {
    const input = [
      { id: 'ä' },
      { id: 'a' },
      { id: 'Z' },
      { id: '2' },
      { id: '10' },
    ];

    expect(stableSort(input).map((entry) => entry.id)).toEqual(['10', '2', 'Z', 'a', 'ä']);
  });

  it('does not mutate the caller array while sorting', () => {
    const input = [{ id: 'b' }, { id: 'a' }];
    const sorted = stableSort(input);

    expect(sorted.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(input.map((entry) => entry.id)).toEqual(['b', 'a']);
  });
});
