/**
 * AIServiceSkillTool.ts
 * Skill tool wrapper for AI core execution.
 */

import type { AIProcessOptions, AIProcessResult } from "./AIService.types.js";
import type { AIService } from "./AIService.js";

export interface AIServiceSkillToolInput {
  prompt: string;
  options?: AIProcessOptions;
}

export interface AIServiceSkillToolOutput {
  ok: boolean;
  result: AIProcessResult;
}

export class AIServiceSkillTool {
  public readonly name = "arelogic.ai.real_process";

  public readonly description =
    "Runs the real deterministic ARELogic AI core with safety filtering and AutoHeal integration.";

  constructor(private readonly aiService: AIService) {}

  public async execute(
    input: AIServiceSkillToolInput
  ): Promise<AIServiceSkillToolOutput> {
    const result = await this.aiService.processStructured(input.prompt, {
      mode: "system",
      ...input.options,
    });

    return {
      ok: result.ok,
      result,
    };
  }
}