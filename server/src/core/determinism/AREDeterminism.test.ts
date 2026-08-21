import { describe, expect, it } from 'vitest';
import {
  createARESeed,
  deriveAREStatelessRandomDigest,
  FixedAREClock,
  SeededARERng,
  statelessAREFloat,
  statelessAREInt,
  type AREStatelessRandomKey,
} from './AREDeterminism.js';

describe('AREDeterminism primitives', () => {
  it('returns fixed time from FixedAREClock', () => {
    const clock = new FixedAREClock(123456);
    expect(clock.now()).toBe(123456);
    expect(clock.now()).toBe(123456);
  });

  it('replays the same RNG sequence for the same seed', () => {
    const left = new SeededARERng('combat|region-a|tick-10|player|npc');
    const right = new SeededARERng('combat|region-a|tick-10|player|npc');

    expect(Array.from({ length: 8 }, () => left.nextInt(1000)))
      .toEqual(Array.from({ length: 8 }, () => right.nextInt(1000)));
  });

  it('creates different RNG sequences for different seeds', () => {
    const left = new SeededARERng('loot|region-a|tick-10');
    const right = new SeededARERng('loot|region-a|tick-11');

    expect(Array.from({ length: 8 }, () => left.nextInt(1000)))
      .not.toEqual(Array.from({ length: 8 }, () => right.nextInt(1000)));
  });

  it('forks reproducibly by label', () => {
    const first = new SeededARERng('oracle|region-a').fork('vision');
    const second = new SeededARERng('oracle|region-a').fork('vision');

    expect(Array.from({ length: 4 }, () => first.nextFloat()))
      .toEqual(Array.from({ length: 4 }, () => second.nextFloat()));
  });

  it('builds stable seed strings from ordered parts', () => {
    expect(createARESeed(['combat', 'region-a', 10, 'player', 'npc']))
      .toBe('combat|region-a|10|player|npc');
  });
});

describe('stateless ARE randomness', () => {
  const baseKey: AREStatelessRandomKey = {
    worldSeed: 'areloria-main',
    tick: 4242,
    channel: 'combat',
    chunkKey: 'chunk:4:-2',
    actorId: 'player:alpha',
    targetId: 'npc:ork:7',
    actionId: 'intent:9f1c',
    lane: 'pellet',
    counter: 0,
  };

  it('returns the exact same digest and sample for the same canonical key', () => {
    const firstDigest = deriveAREStatelessRandomDigest(baseKey);
    const first = statelessAREFloat(baseKey);

    expect(deriveAREStatelessRandomDigest({ ...baseKey })).toBe(firstDigest);
    expect(statelessAREFloat({ ...baseKey })).toBe(first);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(1);
  });

  it('is independent of evaluation order across counters', () => {
    const counters = Array.from({ length: 32 }, (_, counter) => counter);
    const forward = new Map(counters.map((counter) => [
      counter,
      statelessAREFloat({ ...baseKey, counter }),
    ]));
    const reverse = new Map([...counters].reverse().map((counter) => [
      counter,
      statelessAREFloat({ ...baseKey, counter }),
    ]));

    for (const counter of counters) {
      expect(reverse.get(counter)).toBe(forward.get(counter));
    }
  });

  it('is unaffected by unrelated sequential RNG consumption', () => {
    const expected = statelessAREFloat({ ...baseKey, lane: 'critical', counter: 0 });
    const unrelated = new SeededARERng('unrelated-sequential-stream');
    Array.from({ length: 1000 }, () => unrelated.nextFloat());

    expect(statelessAREFloat({ ...baseKey, lane: 'critical', counter: 0 })).toBe(expected);
  });

  it('names independent decision lanes instead of sharing a hidden cursor', () => {
    const hit = statelessAREFloat({ ...baseKey, lane: 'hit', counter: 0 });
    const critical = statelessAREFloat({ ...baseKey, lane: 'critical', counter: 0 });
    const damageVariance = statelessAREFloat({ ...baseKey, lane: 'damage-variance', counter: 0 });

    expect(new Set([hit, critical, damageVariance]).size).toBe(3);
  });

  it('changes when a causal key dimension changes', () => {
    const baseline = deriveAREStatelessRandomDigest(baseKey);
    const variants = [
      { ...baseKey, tick: 4243 },
      { ...baseKey, chunkKey: 'chunk:5:-2' },
      { ...baseKey, actorId: 'player:beta' },
      { ...baseKey, targetId: 'npc:ork:8' },
      { ...baseKey, actionId: 'intent:9f1d' },
      { ...baseKey, lane: 'critical' },
      { ...baseKey, counter: 1 },
    ];

    for (const variant of variants) {
      expect(deriveAREStatelessRandomDigest(variant)).not.toBe(baseline);
    }
  });

  it('returns bounded deterministic integers', () => {
    const values = Array.from({ length: 128 }, (_, counter) =>
      statelessAREInt({ ...baseKey, lane: 'loot-index', counter }, 17),
    );

    expect(values.every((value) => Number.isInteger(value) && value >= 0 && value < 17)).toBe(true);
    expect(values).toEqual(Array.from({ length: 128 }, (_, counter) =>
      statelessAREInt({ ...baseKey, lane: 'loot-index', counter }, 17),
    ));
  });

  it('fails closed for invalid counters and integer ranges', () => {
    expect(() => statelessAREFloat({ ...baseKey, counter: -1 })).toThrow(/counter/);
    expect(() => statelessAREFloat({ ...baseKey, counter: 1.5 })).toThrow(/counter/);
    expect(() => statelessAREInt(baseKey, 0)).toThrow(/maxExclusive/);
    expect(() => statelessAREInt(baseKey, Number.MAX_SAFE_INTEGER + 1)).toThrow(/maxExclusive/);
  });
});
