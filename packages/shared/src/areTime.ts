/**
 * Canonical ARE simulation cadence shared by server, client and tooling.
 *
 * This module is intentionally pure. It defines duration conversion only;
 * actual simulation authority remains tick-based and must be supplied by the
 * authoritative world loop.
 */
export const ARE_SIMULATION_TICK_HZ = 10;
export const ARE_SIMULATION_TICK_MS = 1000 / ARE_SIMULATION_TICK_HZ;

export function msToARETicks(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 1;
  return Math.max(1, Math.ceil(ms / ARE_SIMULATION_TICK_MS));
}

export function areTicksToMs(ticks: number): number {
  if (!Number.isFinite(ticks) || ticks <= 0) return 0;
  return Math.trunc(ticks) * ARE_SIMULATION_TICK_MS;
}
