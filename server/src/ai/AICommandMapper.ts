/**
 * AICommandMapper.ts
 * Maps AI process results to command queue items.
 */

import type { AIProcessResult } from "./AIService.types.js";

export interface AICommandQueueItem {
  type: string;
  traceId: string;
  agentId: string;
  logicalIndex: number;
  payload: Record<string, unknown>;
}

export class AICommandMapper {
  public toCommand(result: AIProcessResult): AICommandQueueItem | null {
    if (!result.ok) return null;

    const command = result.payload.decision.command;
    if (!command) return null;

    return {
      type: command.type,
      traceId: result.traceId,
      agentId: result.agentId,
      logicalIndex: result.logicalIndex,
      payload: command.payload,
    };
  }
}