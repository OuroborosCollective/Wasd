import { areTicksToMs, ARE_SIMULATION_TICK_HZ, ARE_SIMULATION_TICK_MS } from './areTime';

/**
 * Deterministic ARE clock helpers.
 *
 * Gameplay code must supply authoritative integer ticks. This helper only
 * converts those ticks to deterministic human-facing representations.
 * It never reads wall-clock time.
 */
export const AREClock = Object.freeze({
  tickHz: ARE_SIMULATION_TICK_HZ,
  tickMs: ARE_SIMULATION_TICK_MS,

  msFromTick(tick: number): number {
    return areTicksToMs(tick);
  },

  dateFromTick(tick: number): Date {
    return new Date(areTicksToMs(tick));
  },

  isoFromTick(tick: number): string {
    return new Date(areTicksToMs(tick)).toISOString();
  },
});

export type AREClockApi = typeof AREClock;
