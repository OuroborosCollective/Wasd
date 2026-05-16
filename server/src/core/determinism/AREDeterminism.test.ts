import { describe, expect, it } from 'vitest';
import { createARESeed, FixedAREClock, SeededARERng } from './AREDeterminism.js';

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
