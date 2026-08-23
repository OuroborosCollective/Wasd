/**
 * AIService.types.ts
 * Type definitions for the real deterministic AI core.
 */

import type { AREEnvelope, AREMode } from "../core/AREEnvelope.js";

export type AIServiceMode = AREMode;

export type AIActionType =
  | "say"
  | "diagnose"
  | "recommend"
  | "command_proposal"
  | "heal_request"
  | "reject"
  | "noop";

export interface AIProcessOptions {
  mode?: AIServiceMode;
  agentId?: string;
  traceId?: string;
  /**
   * Authoritative logical tick supplied by the caller. This is the only time
   * coordinate allowed to enter AI envelope identity or learning order.
   * Defaults to 0 for non-runtime authoring/diagnostic calls.
   */
  tickId?: number;
  logicalIndex?: number;
  kappa?: number;
  resonance?: number;
  timeoutMs?: number;
  maxInputLength?: number;
  allowLearning?: boolean;
  memoryScope?: string;
  metadata?: Record<string, unknown>;
}

export interface AISafetyDecision {
  allowed: boolean;
  severity: "info" | "warn" | "error" | "critical";
  reason: string;
  rulesApplied: string[];
  blockedTerms: string[];
  warnings: string[];
}

export interface AIReasonedDecision {
  action: AIActionType;
  confidence: number;
  intent: string;
  response: string;
  command?: {
    type: string;
    target?: string;
    payload: Record<string, unknown>;
  };
  heal?: {
    code: string;
    message: string;
    severity: "info" | "warn" | "error" | "critical";
  };
  facts: string[];
  risks: string[];
}

export interface AIProcessResultPayload {
  input: string;
  normalizedInput: string;
  decision: AIReasonedDecision;
  output: string;
  axiomHash: string;
  rulesApplied: string[];
  learningHints: string[];
}

export type AIProcessResult = AREEnvelope<AIProcessResultPayload>;

export interface IAIService {
  process(input: string, options?: AIProcessOptions): Promise<string>;

  processStructured(
    input: string,
    options?: AIProcessOptions
  ): Promise<AIProcessResult>;

  generateResponse(
    prompt: string,
    options?: AIProcessOptions
  ): Promise<string>;
}

export interface AILearningEvent {
  id: string;
  agentId: string;
  memoryScope: string;
  logicalIndex: number;
  inputHash: string;
  outputHash: string;
  intent: string;
  action: AIActionType;
  confidence: number;
  successScore: number;
  tags: string[];
  /**
   * Legacy field name retained for compatibility. Value is a deterministic
   * logical tick, never wall-clock milliseconds.
   */
  createdAt: number;
  metadata: Record<string, unknown>;
}