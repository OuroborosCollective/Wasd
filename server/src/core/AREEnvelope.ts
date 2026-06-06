/**
 * AREEnvelope.ts
 * ARE (Areloria) Envelope type for deterministic AI core operations.
 * All AI operations return a structured AREEnvelope to ensure
 * deterministic behavior and traceable operations.
 */

export type AREMode =
  | "deterministic"
  | "npc"
  | "swarm"
  | "system"
  | "creative"
  | "diagnostic"
  | "heal";

export type ARESeverity =
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "critical";

export interface AREEnvelope<T = unknown> {
  ok: boolean;
  mode: AREMode;
  agentId: string;
  traceId: string;
  createdAt: number;
  logicalIndex: number;
  kappa: number;
  resonance: number;
  inputHash: string;
  outputHash: string;
  durationMs: number;
  payload: T;
  error?: string;
  warnings: string[];
  metadata: Record<string, unknown>;
}

export const ARE_CONSTANTS = {
  KAPPA_INVARIANT: 1000,
  DEFAULT_LOGICAL_INDEX: 0,
  DEFAULT_RESONANCE: 1,
  MAX_RESONANCE: 1_000_000,
} as const;