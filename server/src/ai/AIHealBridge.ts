/**
 * AIHealBridge.ts
 * Bridge between AI core and AutoHeal system.
 *
 * IMPORTANT: All report() calls are wrapped in try-catch to ensure
 * AutoHeal reporting failures never make AI processing fatal.
 * The AI core must always return a degraded fallback envelope, never throw.
 */

import type { IAutoHealBridge } from "../selfheal/AutoHeal.types.js";
import type { AIProcessResult } from "./AIService.types.js";

export class AIHealBridge {
  constructor(private readonly autoHeal: IAutoHealBridge) {}

  /**
   * Reports AI processing failure to AutoHeal.
   * Failures are absorbed - AutoHeal outage must not make AI processing fatal.
   */
  public async reportFailure(result: AIProcessResult): Promise<void> {
    try {
      await this.autoHeal.report({
        subsystem: "ai",
        severity: "error",
        code: "AI_PROCESS_FAILED",
        message: result.error ?? "AI process failed",
        traceId: result.traceId,
        logicalIndex: result.logicalIndex,
        agentId: result.agentId,
        inputHash: result.inputHash,
        outputHash: result.outputHash,
        metadata: result.metadata,
      });
    } catch (error) {
      // AutoHeal reporting failure must not propagate - AI processing must succeed
      console.error(
        JSON.stringify({
          service: "AIHealBridge",
          event: "REPORT_FAILURE_SUPPRESSED",
          error: error instanceof Error ? error.message : String(error),
          traceId: result.traceId,
          createdAt: Date.now(),
        })
      );
    }
  }

  /**
   * Reports AI safety block to AutoHeal.
   * Failures are absorbed - AutoHeal outage must not make AI processing fatal.
   */
  public async reportSafetyBlock(result: AIProcessResult): Promise<void> {
    try {
      await this.autoHeal.report({
        subsystem: "ai",
        severity: "warn",
        code: "AI_SAFETY_BLOCK",
        message: result.error ?? "AI safety filter blocked input",
        traceId: result.traceId,
        logicalIndex: result.logicalIndex,
        agentId: result.agentId,
        inputHash: result.inputHash,
        outputHash: result.outputHash,
        metadata: result.metadata,
      });
    } catch (error) {
      // AutoHeal reporting failure must not propagate - AI processing must succeed
      console.error(
        JSON.stringify({
          service: "AIHealBridge",
          event: "REPORT_SAFETY_BLOCK_SUPPRESSED",
          error: error instanceof Error ? error.message : String(error),
          traceId: result.traceId,
          createdAt: Date.now(),
        })
      );
    }
  }

  /**
   * Reports AI heal request to AutoHeal.
   * Failures are absorbed - AutoHeal outage must not make AI processing fatal.
   */
  public async reportHealRequest(result: AIProcessResult): Promise<void> {
    try {
      const heal = result.payload.decision.heal;

      await this.autoHeal.report({
        subsystem: "ai",
        severity: heal?.severity ?? "warn",
        code: heal?.code ?? "AI_HEAL_REQUEST",
        message: heal?.message ?? "AI requested AutoHeal",
        traceId: result.traceId,
        logicalIndex: result.logicalIndex,
        agentId: result.agentId,
        inputHash: result.inputHash,
        outputHash: result.outputHash,
        metadata: result.metadata,
      });
    } catch (error) {
      // AutoHeal reporting failure must not propagate - AI processing must succeed
      console.error(
        JSON.stringify({
          service: "AIHealBridge",
          event: "REPORT_HEAL_REQUEST_SUPPRESSED",
          error: error instanceof Error ? error.message : String(error),
          traceId: result.traceId,
          createdAt: Date.now(),
        })
      );
    }
  }
}