import { describe, expect, it } from 'vitest';

import {
  ARE_SIMULATION_TICK_HZ,
  ARE_SIMULATION_TICK_MS,
  msToARETicks,
} from '@wasd/shared';

import { createWorldTickTimeAdapter } from '../core/WorldTickTimeAdapter.js';

describe('WorldTickTimeAdapter', () => {
  it('exposes canonical ARE cadence', () => {
    const adapter = createWorldTickTimeAdapter(() => 42);

    expect(adapter.tickHz).toBe(ARE_SIMULATION_TICK_HZ);
    expect(adapter.tickMs).toBe(ARE_SIMULATION_TICK_MS);
    expect(adapter.tickHz).toBe(10);
    expect(adapter.tickMs).toBe(100);
  });

  it('converts millisecond declarations into ARE ticks', () => {
    const adapter = createWorldTickTimeAdapter(() => 0);

    expect(adapter.cooldownTicks(1)).toBe(msToARETicks(1));
    expect(adapter.cooldownTicks(100)).toBe(1);
    expect(adapter.cooldownTicks(500)).toBe(5);
    expect(adapter.cooldownTicks(800)).toBe(8);
    expect(adapter.cooldownTicks(1000)).toBe(10);
    expect(adapter.cooldownTicks(3000)).toBe(30);
  });

  it('compares cooldowns with integer ticks only', () => {
    const adapter = createWorldTickTimeAdapter(() => 18);

    expect(adapter.hasCooldownElapsed(10, 800)).toBe(true);
    expect(adapter.hasCooldownElapsed(11, 800)).toBe(false);
  });

  it('sanitizes invalid tick input deterministically', () => {
    const adapter = createWorldTickTimeAdapter(() => Number.NaN);

    expect(adapter.nowTick()).toBe(0);
    expect(adapter.snapshot()).toEqual({
      tick: 0,
      tickHz: ARE_SIMULATION_TICK_HZ,
      tickMs: ARE_SIMULATION_TICK_MS,
    });
  });
});
