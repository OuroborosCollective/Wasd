export const AUTHORITATIVE_WORLD_TICK_HZ = 10 as const;
export const AUTHORITATIVE_WORLD_TICK_MS = 100 as const;
export const AUTHORITATIVE_WORLD_TICK_KAPPA = 1000 as const;
export const AUTHORITATIVE_WORLD_CHUNK_SIZE = 64 as const;
export const AUTHORITATIVE_WORLD_HEARTBEAT_TICKS = 10 as const;

export interface AuthoritativeWorldTickPolicy {
  readonly hz: typeof AUTHORITATIVE_WORLD_TICK_HZ;
  readonly tickMs: typeof AUTHORITATIVE_WORLD_TICK_MS;
  readonly kappa: typeof AUTHORITATIVE_WORLD_TICK_KAPPA;
  readonly chunkSize: typeof AUTHORITATIVE_WORLD_CHUNK_SIZE;
  readonly heartbeatTicks: typeof AUTHORITATIVE_WORLD_HEARTBEAT_TICKS;
}

export const AUTHORITATIVE_WORLD_TICK_POLICY: AuthoritativeWorldTickPolicy = Object.freeze({
  hz: AUTHORITATIVE_WORLD_TICK_HZ,
  tickMs: AUTHORITATIVE_WORLD_TICK_MS,
  kappa: AUTHORITATIVE_WORLD_TICK_KAPPA,
  chunkSize: AUTHORITATIVE_WORLD_CHUNK_SIZE,
  heartbeatTicks: AUTHORITATIVE_WORLD_HEARTBEAT_TICKS,
});

export function assertAuthoritativeWorldTickPolicy(policy: AuthoritativeWorldTickPolicy = AUTHORITATIVE_WORLD_TICK_POLICY): void {
  if (policy.hz !== AUTHORITATIVE_WORLD_TICK_HZ) throw new Error(`WorldTick policy violation: expected ${AUTHORITATIVE_WORLD_TICK_HZ}Hz, got ${policy.hz}Hz`);
  if (policy.tickMs !== AUTHORITATIVE_WORLD_TICK_MS) throw new Error(`WorldTick policy violation: expected ${AUTHORITATIVE_WORLD_TICK_MS}ms, got ${policy.tickMs}ms`);
  if (policy.kappa !== AUTHORITATIVE_WORLD_TICK_KAPPA) throw new Error(`ARE policy violation: expected Kappa=${AUTHORITATIVE_WORLD_TICK_KAPPA}, got ${policy.kappa}`);
  if (policy.chunkSize !== AUTHORITATIVE_WORLD_CHUNK_SIZE) throw new Error(`Spatial policy violation: expected chunk size ${AUTHORITATIVE_WORLD_CHUNK_SIZE}, got ${policy.chunkSize}`);
  if (policy.heartbeatTicks !== AUTHORITATIVE_WORLD_HEARTBEAT_TICKS) throw new Error(`Heartbeat policy violation: expected ${AUTHORITATIVE_WORLD_HEARTBEAT_TICKS} ticks, got ${policy.heartbeatTicks}`);
}

export function worldTickToMs(tick: number): number {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error(`Invalid world tick: ${tick}`);
  return tick * AUTHORITATIVE_WORLD_TICK_MS;
}

export function isHeartbeatTick(tick: number): boolean {
  if (!Number.isSafeInteger(tick) || tick < 0) return false;
  return tick % AUTHORITATIVE_WORLD_HEARTBEAT_TICKS === 0;
}
