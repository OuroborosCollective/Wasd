/**
 * MiniMax.types.ts
 * Type definitions for MiniMax-M2.7 integration.
 * 
 * MiniMax is used as the autonomous AI agent for:
 * - Bug detection and fixing
 * - System optimization
 * - ARELogic determinism verification
 * - NPC civilization health monitoring
 * - User experience improvements
 */

export interface MiniMaxConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
}

export interface MiniMaxSystemContext {
  service: string;
  mode: string;
  agentId: string;
  traceId: string;
  logicalIndex: number;
  kappa: number;
  resonance: number;
  timestamp: number;
  subsystem: MiniMaxSubsystem;
  areDeterminismLevel: number;
}

export type MiniMaxSubsystem =
  | "ai_core"
  | "npc_brain"
  | "swarm_agent"
  | "world_tick"
  | "autoheal"
  | "persistence"
  | "combat"
  | "inventory"
  | "quest"
  | "dialogue"
  | "trade"
  | "security"
  | "watchdog"
  | "ui_rendering"
  | "network"
  | "unknown";

export interface MiniMaxReport {
  type: MiniMaxReportType;
  severity: "debug" | "info" | "warn" | "error" | "critical";
  code: string;
  message: string;
  context: MiniMaxSystemContext;
  data: Record<string, unknown>;
  stackTrace?: string;
  affectedComponents: string[];
  suggestedFix?: string;
}

export type MiniMaxReportType =
  | "bug"
  | "error"
  | "warning"
  | "performance_issue"
  | "determinism_violation"
  | "security_issue"
  | "ui_issue"
  | "logic_error"
  | "integration_error"
  | "npc_behavior_anomaly"
  | "world_state_corruption";

export interface MiniMaxCommand {
  action: MiniMaxAction;
  target?: string;
  payload: Record<string, unknown>;
  priority: "low" | "medium" | "high" | "critical";
  reason: string;
}

export type MiniMaxAction =
  | "fix_bug"
  | "optimize_code"
  | "verify_determinism"
  | "fix_ui"
  | "fix_npc_behavior"
  | "fix_integration"
  | "create_pr"
  | "create_issue"
  | "run_tests"
  | "analyze_logs"
  | "monitor_system";

export interface MiniMaxResponse {
  ok: boolean;
  action: MiniMaxAction;
  result: string;
  commands: MiniMaxCommand[];
  analysis: MiniMaxAnalysis;
  createdAt: number;
}

export interface MiniMaxAnalysis {
  rootCause: string;
  affectedFiles: string[];
  effort: "low" | "medium" | "high";
  risk: "low" | "medium" | "high";
  confidence: number;
  similarIssues: string[];
}

export interface MiniMaxHealthStatus {
  overall: "healthy" | "degraded" | "critical";
  subsystems: Record<MiniMaxSubsystem, {
    status: "ok" | "warning" | "error";
    lastCheck: number;
    issues: string[];
  }>;
  determinismScore: number;
  autonomousHealth: number;
}

export interface MiniMaxNPCReport {
  npcId: string;
  civilizationId: string;
  behaviorAnomalies: string[];
  performanceMetrics: {
    decisionLatency: number;
    memoryUsage: number;
    actionSuccessRate: number;
  };
  suggestedFixes: string[];
}

export interface MiniMaxUISReport {
  component: string;
  usabilityScore: number;
  issues: string[];
  suggestedOptimizations: string[];
  affectedUsers: number;
}

export const MINIMAX_DEFAULTS: MiniMaxConfig = {
  apiKey: "",
  baseUrl: "https://api.minimax.chat/v1",
  model: "MiniMax-M2.7",
  maxTokens: 8192,
  temperature: 0.3,
  enabled: false,
};

export const DETERMINISM_LEVELS = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
} as const;