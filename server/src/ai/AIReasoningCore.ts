/**
 * AIReasoningCore.ts
 * Core reasoning engine that applies decision rules.
 */

import type { AIReasonedDecision, AIServiceMode } from "./AIService.types.js";
import { AIDecisionRules } from "./AIDecisionRules.js";

export class AIReasoningCore {
  private readonly rules = new AIDecisionRules();

  public async reason(input: string, mode: AIServiceMode): Promise<AIReasonedDecision> {
    return this.rules.decide(input, mode);
  }
}