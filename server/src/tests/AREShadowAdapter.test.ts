import { beforeEach, describe, expect, it } from 'vitest';
import { ARE_CONFIG } from '../core/are/AREConfig';
import { AREReplayBuffer } from '../core/are/AREReplayBuffer';
import { AREShadowAdapter } from '../core/are/AREShadowAdapter';

describe('ARE-Logic: WorldTick shadow adapter', () => {
  let buffer: AREReplayBuffer;

  beforeEach(() => {
    buffer = new AREReplayBuffer(10);
    ARE_CONFIG.ENABLE_SHADOW_TICK = false;
  });

  it('does nothing when ENABLE_SHADOW_TICK is false', () => {
    const result = AREShadowAdapter.executeShadowTick({
      entityId: 'shadow_01',
      position: { x: 1.5 },
      velocity: { y: 2.0 },
      tick: 1,
      buffer,
    });

    expect(result).toEqual({ skipped: true, recorded: false });
    expect(buffer.latest('shadow_01')).toBeUndefined();
    expect(buffer.size).toBe(0);
  });

  it('processes the full ARE cycle and stores it in the buffer when enabled', () => {
    ARE_CONFIG.ENABLE_SHADOW_TICK = true;

    const result = AREShadowAdapter.executeShadowTick({
      entityId: 'shadow_02',
      position: { x: 1.25, y: 0 },
      velocity: { x: 1, y: 0 },
      tick: 100,
      buffer,
    });

    const entry = buffer.get(100, 'shadow_02');
    expect(result.skipped).toBe(false);
    expect(result.recorded).toBe(true);
    expect(result.stateHash).toBe(entry?.stateHash);
    expect(entry).toBeDefined();
    expect(entry?.tick).toBe(100);
    expect(Number.isInteger(entry?.payload.position.x)).toBe(true);
    expect(Number.isInteger(entry?.payload.velocity.x)).toBe(true);
  });

  it('accepts kappa field whitelisting for additional state', () => {
    ARE_CONFIG.ENABLE_SHADOW_TICK = true;

    AREShadowAdapter.executeShadowTick({
      entityId: 'shadow_03',
      position: { x: 0 },
      velocity: { x: 0 },
      tick: 101,
      buffer,
      additionalState: { stats: { manaRegen: 1.5, hp: 100 } },
      normalization: { kappaFields: ['stats.manaRegen'] },
    });

    const entry = buffer.get(101, 'shadow_03');
    expect((entry?.payload.stats as any).manaRegen).toBe(1500);
    expect((entry?.payload.stats as any).hp).toBe(100);
  });

  it('catches ARE errors and does not crash legacy execution', () => {
    ARE_CONFIG.ENABLE_SHADOW_TICK = true;

    expect(() => {
      AREShadowAdapter.executeShadowTick({
        entityId: 'shadow_04',
        position: { x: 'corrupt' },
        velocity: {},
        tick: 102,
        buffer,
      });
    }).not.toThrow();

    const result = AREShadowAdapter.executeShadowTick({
      entityId: 'shadow_04',
      position: { x: 'corrupt' },
      velocity: {},
      tick: 102,
      buffer,
    });

    expect(result.skipped).toBe(false);
    expect(result.recorded).toBe(false);
    expect(result.error).toBeDefined();
    expect(buffer.latest('shadow_04')).toBeUndefined();
  });
});
