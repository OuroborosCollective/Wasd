import { describe, expect, it } from 'vitest';
import { createWorldHashSnapshot } from './WorldHashSnapshot.js';

const payload = {
  l: 123_000,
  k: 1000,
  r: 0,
} as any;

function player(id: string, x: number, health: number, skillXp: number) {
  return {
    id,
    position: { x, y: 0, z: 0 },
    health,
    maxHealth: 100,
    skills: { combat: { xp: skillXp, level: 7 } },
    equipment: { weaponId: 'shotgun:test' },
  };
}

describe('WorldHashSnapshot adversarial coverage', () => {
  it('is independent of entity input array order', () => {
    const alpha = player('player:alpha', 5, 100, 5000);
    const beta = player('player:beta', 70, 90, 3000);

    const forward = createWorldHashSnapshot({ tick: 100, payload, players: [alpha, beta] });
    const reverse = createWorldHashSnapshot({ tick: 100, payload, players: [beta, alpha] });

    expect(reverse.worldHash).toBe(forward.worldHash);
    expect(reverse.chunks).toEqual(forward.chunks);
  });

  it('changes when authoritative position changes even if vitals do not', () => {
    const baseline = createWorldHashSnapshot({
      tick: 100,
      payload,
      players: [player('player:alpha', 5, 100, 5000)],
    });
    const moved = createWorldHashSnapshot({
      tick: 100,
      payload,
      players: [player('player:alpha', 6, 100, 5000)],
    });

    expect(moved.worldHash).not.toBe(baseline.worldHash);
  });

  it('changes when nested progression data changes even if position and vitals do not', () => {
    const baseline = createWorldHashSnapshot({
      tick: 100,
      payload,
      players: [player('player:alpha', 5, 100, 5000)],
    });
    const progressed = createWorldHashSnapshot({
      tick: 100,
      payload,
      players: [player('player:alpha', 5, 100, 5001)],
    });

    expect(progressed.worldHash).not.toBe(baseline.worldHash);
  });

  it('changes when equipment changes even if position and vitals do not', () => {
    const baselinePlayer = player('player:alpha', 5, 100, 5000);
    const changedPlayer = {
      ...player('player:alpha', 5, 100, 5000),
      equipment: { weaponId: 'psy-focus:test' },
    };

    const baseline = createWorldHashSnapshot({ tick: 100, payload, players: [baselinePlayer] });
    const changed = createWorldHashSnapshot({ tick: 100, payload, players: [changedPlayer] });

    expect(changed.worldHash).not.toBe(baseline.worldHash);
  });

  it('binds the hash to the logical tick', () => {
    const entity = player('player:alpha', 5, 100, 5000);
    const tick100 = createWorldHashSnapshot({ tick: 100, payload, players: [entity] });
    const tick101 = createWorldHashSnapshot({ tick: 101, payload, players: [entity] });

    expect(tick101.worldHash).not.toBe(tick100.worldHash);
    expect(tick101.createdAtIso).toBe('deterministic-tick:101');
  });
});
