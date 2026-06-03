export const WORLD_TICK_HZ = 10 as const;
export const WORLD_TICK_MS = 100 as const;
export const WORLD_TICK_KAPPA = 1000 as const;
export const WORLD_TICK_CHUNK_SIZE = 64 as const;

export interface DeterministicTickPolicy {
  readonly hz: typeof WORLD_TICK_HZ;
  readonly tickMs: typeof WORLD_TICK_MS;
  readonly kappa: typeof WORLD_TICK_KAPPA;
  readonly chunkSize: typeof WORLD_TICK_CHUNK_SIZE;
  readonly maxCatchUpTicks: number;
  readonly maxTickDriftMs: number;
}

export const DEFAULT_DETERMINISTIC_TICK_POLICY: DeterministicTickPolicy = Object.freeze({
  hz: WORLD_TICK_HZ,
  tickMs: WORLD_TICK_MS,
  kappa: WORLD_TICK_KAPPA,
  chunkSize: WORLD_TICK_CHUNK_SIZE,
  maxCatchUpTicks: 5,
  maxTickDriftMs: 250,
});

export function assertDeterministicTickPolicy(policy: DeterministicTickPolicy): void {
  if (policy.hz !== WORLD_TICK_HZ) throw new Error(`WorldTick policy violation: expected ${WORLD_TICK_HZ}Hz, got ${policy.hz}Hz`);
  if (policy.tickMs !== WORLD_TICK_MS) throw new Error(`WorldTick policy violation: expected ${WORLD_TICK_MS}ms tick, got ${policy.tickMs}ms`);
  if (policy.kappa !== WORLD_TICK_KAPPA) throw new Error(`ARE policy violation: expected Kappa=${WORLD_TICK_KAPPA}, got ${policy.kappa}`);
  if (policy.chunkSize !== WORLD_TICK_CHUNK_SIZE) throw new Error(`Spatial policy violation: expected ${WORLD_TICK_CHUNK_SIZE} tile chunks, got ${policy.chunkSize}`);
  if (!Number.isInteger(policy.maxCatchUpTicks) || policy.maxCatchUpTicks < 0) throw new Error("WorldTick policy violation: maxCatchUpTicks must be a non-negative integer");
  if (!Number.isInteger(policy.maxTickDriftMs) || policy.maxTickDriftMs < 0) throw new Error("WorldTick policy violation: maxTickDriftMs must be a non-negative integer");
}

export function deterministicTickToTimeMs(tick: number, policy: DeterministicTickPolicy = DEFAULT_DETERMINISTIC_TICK_POLICY): number {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error(`Invalid deterministic tick: ${tick}`);
  assertDeterministicTickPolicy(policy);
  return tick * policy.tickMs;
}

export function deterministicTimeMsToTick(timeMs: number, policy: DeterministicTickPolicy = DEFAULT_DETERMINISTIC_TICK_POLICY): number {
  if (!Number.isSafeInteger(timeMs) || timeMs < 0) throw new Error(`Invalid deterministic timeMs: ${timeMs}`);
  assertDeterministicTickPolicy(policy);
  return Math.floor(timeMs / policy.tickMs);
}
