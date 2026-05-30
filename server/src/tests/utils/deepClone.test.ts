import { describe, it, expect } from 'vitest';
import { deepClone } from '../../utils/deepClone.js';

describe('deepClone benchmark and parity', () => {
  const sampleObject = {
    id: 'player_123',
    name: 'Bolt',
    level: 42,
    health: 100,
    maxHealth: 100,
    position: { x: 10.5, y: 0, z: -20.1 },
    inventory: [
      { id: 'item_1', amount: 5, meta: { rarity: 'rare' } },
      { id: 'item_2', amount: 1, meta: { rarity: 'legendary' } },
    ],
    lastLogin: new Date('2024-01-01T12:00:00Z'),
    skills: {
      fireball: { level: 5, cooldown: 0 },
      blink: { level: 2, cooldown: 1000 },
    },
    flags: { isNew: false, hasBuster: true },
    meta: undefined,
    func: () => {},
    nanValue: NaN,
    infValue: Infinity,
    arrayWithUnusual: [undefined, () => {}, NaN, Infinity],
  };

  it('maintains parity with JSON.parse(JSON.stringify())', () => {
    const jsonResult = JSON.parse(JSON.stringify(sampleObject));
    const cloneResult = deepClone(sampleObject);

    expect(cloneResult).toEqual(jsonResult);
    expect(new Date(cloneResult.lastLogin).toISOString()).toBe(new Date('2024-01-01T12:00:00Z').toISOString());
    expect(cloneResult.meta).toBeUndefined();
    expect(cloneResult.func).toBeUndefined();
    expect(cloneResult.nanValue).toBeNull();
    expect(cloneResult.arrayWithUnusual[0]).toBeNull();
  });

  it('is faster than JSON.parse(JSON.stringify())', () => {
    const iterations = 10000;

    const startJson = performance.now();
    for (let i = 0; i < iterations; i++) {
      JSON.parse(JSON.stringify(sampleObject));
    }
    const endJson = performance.now();
    const jsonTime = endJson - startJson;

    const startClone = performance.now();
    for (let i = 0; i < iterations; i++) {
      deepClone(sampleObject);
    }
    const endClone = performance.now();
    const cloneTime = endClone - startClone;

    console.log(`JSON.parse(JSON.stringify): ${jsonTime.toFixed(2)}ms`);
    console.log(`deepClone: ${cloneTime.toFixed(2)}ms`);
    console.log(`Improvement: ${(jsonTime / cloneTime).toFixed(2)}x`);

    expect(cloneTime).toBeLessThan(jsonTime);
  });
});
