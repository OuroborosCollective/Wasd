import {
  ARE_SIMULATION_TICK_HZ,
  ARE_SIMULATION_TICK_MS,
  msToARETicks,
} from '@wasd/shared';

export interface WorldTickTimeAdapterSnapshot {
  readonly tick: number;
  readonly tickHz: typeof ARE_SIMULATION_TICK_HZ;
  readonly tickMs: typeof ARE_SIMULATION_TICK_MS;
}

export interface WorldTickTimeAdapter {
  readonly tickHz: typeof ARE_SIMULATION_TICK_HZ;
  readonly tickMs: typeof ARE_SIMULATION_TICK_MS;
  nowTick(): number;
  cooldownTicks(cooldownMs: number): number;
  hasCooldownElapsed(lastTick: number, cooldownMs: number): boolean;
  snapshot(): WorldTickTimeAdapterSnapshot;
}

/**
 * Adapter between WorldTick's authoritative integer tick counter and duration
 * declarations that still arrive as milliseconds from gameplay rules.
 *
 * This keeps WorldTick free from hidden `/ 100` assumptions while preserving
 * tick-authoritative simulation: all checks compare integer ticks only.
 */
export function createWorldTickTimeAdapter(readTick: () => number): WorldTickTimeAdapter {
  return Object.freeze({
    tickHz: ARE_SIMULATION_TICK_HZ,
    tickMs: ARE_SIMULATION_TICK_MS,

    nowTick(): number {
      const tick = readTick();
      if (!Number.isFinite(tick)) return 0;
      return Math.max(0, Math.trunc(tick));
    },

    cooldownTicks(cooldownMs: number): number {
      return msToARETicks(cooldownMs);
    },

    hasCooldownElapsed(lastTick: number, cooldownMs: number): boolean {
      const safeLastTick = Number.isFinite(lastTick) ? Math.trunc(lastTick) : 0;
      return this.nowTick() - safeLastTick >= this.cooldownTicks(cooldownMs);
    },

    snapshot(): WorldTickTimeAdapterSnapshot {
      return Object.freeze({
        tick: this.nowTick(),
        tickHz: ARE_SIMULATION_TICK_HZ,
        tickMs: ARE_SIMULATION_TICK_MS,
      });
    },
  });
}
