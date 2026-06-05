/**
 * ARE HEARTBEAT UTILITIES
 * 
 * Pure functions for ARE heartbeat snapshot generation.
 * These functions are deterministic and do not depend on
 * external state or modules.
 * 
 * Rules:
 * - No Math.random()
 * - No Date.now() for simulation values
 * - kappa is exactly 1000 (invariant)
 * - replayHash is deterministic from stable input
 */

/**
 * ARE Heartbeat Response shape
 */
export interface AREHeartbeatResponse {
  tickId: number;
  kappa: 1000;
  observerCount: number;
  replayHash: string;
  serverTick: number;
  heartbeatStatus: "live";
}

/**
 * Deterministic hash function for replay hash generation.
 * Uses FNV-1a variant for stable cross-platform results.
 */
export function stableHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Create an ARE heartbeat snapshot from stable input values.
 * All values are deterministic and traceable to server state.
 */
export function createAREHeartbeatSnapshot(input: {
  tickId: number;
  observerCount: number;
  worldSeed?: string;
}): AREHeartbeatResponse {
  const kappa = 1000 as const;
  // Use world seed from env or fallback to deterministic default
  const seed = input.worldSeed ?? process.env.WORLD_SEED ?? "areloria";
  
  // Deterministic replay hash from stable input
  const hashInput = `${seed}|tick=${input.tickId}|kappa=${kappa}|observers=${input.observerCount}`;
  const replayHash = stableHash(hashInput);

  return {
    tickId: input.tickId,
    kappa,
    observerCount: input.observerCount,
    replayHash,
    serverTick: input.tickId,
    heartbeatStatus: "live",
  };
}