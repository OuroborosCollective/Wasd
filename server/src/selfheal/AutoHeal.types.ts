/**
 * AutoHeal.types.ts
 * Type definitions for AutoHeal integration with AI core.
 */

export type AutoHealSeverity =
  | "info"
  | "warn"
  | "error"
  | "critical";

export type AutoHealSubsystem =
  | "ai"
  | "npc"
  | "swarm"
  | "watchdog"
  | "persistence"
  | "worldtick"
  | "unknown";

export interface AutoHealSignal {
  subsystem: AutoHealSubsystem;
  severity: AutoHealSeverity;
  code: string;
  message: string;
  traceId: string;
  logicalIndex: number;
  agentId?: string;
  inputHash?: string;
  outputHash?: string;
  metadata: Record<string, unknown>;
}

export interface IAutoHealBridge {
  report(signal: AutoHealSignal): Promise<void>;
}