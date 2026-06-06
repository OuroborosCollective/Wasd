/**
 * AIHealBridge.ts
 * Bridge between AI core and AutoHeal system.
 */

import type { IAutoHealBridge } from "../selfheal/AutoHeal.types.js";
import type { AIProcessResult } from "./AIService.types.js";

export class AIHealBridge {
  constructor(private readonly autoHeal: IAutoHealBridge) {}

  public async reportFailure(result: AIProcessResult): Promise<void> {
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
  }

  public async reportSafetyBlock(result: AIProcessResult): Promise<void> {
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
  }

  public async reportHealRequest(result: AIProcessResult): Promise<void> {
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
  }
}