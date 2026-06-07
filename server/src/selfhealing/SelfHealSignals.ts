/**
 * SELF HEAL SIGNALS
 *
 * Typed signal contracts for SelfHeal system monitoring.
 * All signals are deterministic and traceable.
 *
 * Rules:
 * - SelfHeal may observe runtime
 * - SelfHeal must not create random gameplay outcomes
 * - Repairs must produce hashable logs
 * - Patch logs must be deterministic from signal + before + after
 * - If repair is unsafe, report degraded mode instead of mutating
 */

export type SelfHealSignal =
  | "BOOT_CONFIG_MISSING"
  | "CLIENT_ASSET_MISSING"
  | "WORLD_TICK_DRIFT"
  | "PERSISTENCE_WRITE_FAILED"
  | "REDIS_UNAVAILABLE"
  | "ARE_INVARIANT_VIOLATION"
  | "SNAPSHOT_COMPOSITION_FAILED"
  | "GLB_ASSET_INVALID"
  | "ENTRYPOINT_CONTRACT_DRIFT";

export interface SelfHealSignalEnvelope {
  readonly signal: SelfHealSignal;
  readonly subsystem: string;
  readonly logicalIndex: number;
  readonly severity: "info" | "warn" | "error" | "critical";
  readonly message: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}