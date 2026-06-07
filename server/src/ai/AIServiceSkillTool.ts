/**
 * AIServiceSkillTool.ts
 * Deterministic skill tool wrapper for real AI core execution.
 *
 * The intelligence stays inside AIService.processStructured().
 * This wrapper makes tool execution strict, traceable, non-fatal and
 * ARELogic-compliant for agent/tool runtimes.
 */

import { ARE_CONSTANTS } from "../core/AREEnvelope.js";
import type {
  AIProcessOptions,
  AIProcessResult,
  AIServiceMode,
} from "./AIService.types.js";
import type { AIService } from "./AIService.js";

export interface AIServiceSkillToolInput {
  prompt: string;
  options?: AIProcessOptions;
}

export interface AIServiceSkillToolMeta {
  name: string;
  version: string;
  deterministic: true;
  mode: AIServiceMode;
  traceId: string;
  axiom: "ARELOGIC_KAPPA_1000";
}

export interface AIServiceSkillToolOutput {
  ok: boolean;
  result: AIProcessResult;
  tool: AIServiceSkillToolMeta;
}

export interface AIServiceSkillToolConfig {
  maxPromptLength?: number;
  defaultAgentId?: string;
  defaultMemoryScope?: string;
  defaultTimeoutMs?: number;
  strictInput?: boolean;
}

const DEFAULT_MAX_PROMPT_LENGTH = 24_000;
const DEFAULT_TIMEOUT_MS = 2_500;
const TOOL_VERSION = "2.1.0";

function stableHash(input: string): string {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizePrompt(input: unknown): string {
  if (typeof input !== "string") return "";

  return input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function normalizeToken(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 96);

  return normalized || fallback;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

export class AIServiceSkillTool {
  public readonly name = "arelogic.ai.real_process";

  public readonly version = TOOL_VERSION;

  public readonly description =
    "Runs the real deterministic ARELogic AI core with safety filtering, structured output and AutoHeal integration.";

  private readonly maxPromptLength: number;
  private readonly defaultAgentId: string;
  private readonly defaultMemoryScope: string;
  private readonly defaultTimeoutMs: number;
  private readonly strictInput: boolean;

  constructor(
    private readonly aiService: AIService,
    config: AIServiceSkillToolConfig = {}
  ) {
    this.maxPromptLength = this.clampInt(
      config.maxPromptLength ?? DEFAULT_MAX_PROMPT_LENGTH,
      1,
      64_000
    );
    this.defaultAgentId = normalizeToken(config.defaultAgentId, "ai-skill-tool");
    this.defaultMemoryScope = normalizeToken(
      config.defaultMemoryScope,
      "arelogic.ai.real_process"
    );
    this.defaultTimeoutMs = this.clampInt(
      config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
      50,
      30_000
    );
    this.strictInput = config.strictInput ?? true;
  }

  public async execute(
    input: AIServiceSkillToolInput
  ): Promise<AIServiceSkillToolOutput> {
    const normalizedPrompt = normalizePrompt(input?.prompt);
    const options = input?.options ?? {};
    const traceId = this.createTraceId(normalizedPrompt, options);
    const tool = this.createToolMeta(traceId);

    const validationError = this.validateInput(normalizedPrompt);

    if (validationError) {
      return {
        ok: false,
        result: this.createFallbackResult(validationError, normalizedPrompt, traceId),
        tool,
      };
    }

    try {
      const result = await this.aiService.processStructured(normalizedPrompt, {
        ...options,
        mode: "system",
        agentId: normalizeToken(options.agentId, this.defaultAgentId),
        traceId,
        kappa: ARE_CONSTANTS.KAPPA_INVARIANT,
        memoryScope: normalizeToken(options.memoryScope, this.defaultMemoryScope),
        timeoutMs: this.clampInt(
          options.timeoutMs ?? this.defaultTimeoutMs,
          50,
          30_000
        ),
        maxInputLength: this.clampInt(
          options.maxInputLength ?? this.maxPromptLength,
          1,
          64_000
        ),
        metadata: {
          deterministic: true,
          skillTool: this.name,
          skillToolVersion: this.version,
          autoHealLinked: true,
          safetyBoundary: "AIService.processStructured",
          ...(options.metadata ?? {}),
        },
      });

      return {
        ok: Boolean(result.ok),
        result,
        tool: this.createToolMeta(result.traceId || traceId),
      };
    } catch (error) {
      return {
        ok: false,
        result: this.createFallbackResult(
          `AIServiceSkillTool execution failed: ${this.errorToString(error)}`,
          normalizedPrompt,
          traceId
        ),
        tool,
      };
    }
  }

  /** Compatibility alias for runtimes that call invoke(). */
  public async invoke(
    input: AIServiceSkillToolInput
  ): Promise<AIServiceSkillToolOutput> {
    return this.execute(input);
  }

  /** Compatibility alias for runtimes that call run(). */
  public async run(
    input: AIServiceSkillToolInput
  ): Promise<AIServiceSkillToolOutput> {
    return this.execute(input);
  }

  public getManifest() {
    return Object.freeze({
      name: this.name,
      version: this.version,
      description: this.description,
      deterministic: true,
      mode: "system" as const,
      axiom: "ARELOGIC_KAPPA_1000" as const,
      inputSchema: {
        type: "object",
        required: ["prompt"],
        additionalProperties: false,
        properties: {
          prompt: {
            type: "string",
            minLength: 1,
            maxLength: this.maxPromptLength,
          },
          options: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
      outputSchema: {
        type: "object",
        required: ["ok", "result", "tool"],
        properties: {
          ok: { type: "boolean" },
          result: { type: "object" },
          tool: {
            type: "object",
            required: [
              "name",
              "version",
              "deterministic",
              "mode",
              "traceId",
              "axiom",
            ],
            properties: {
              name: { type: "string" },
              version: { type: "string" },
              deterministic: { const: true },
              mode: { const: "system" },
              traceId: { type: "string" },
              axiom: { const: "ARELOGIC_KAPPA_1000" },
            },
          },
        },
      },
    });
  }

  private validateInput(prompt: string): string | null {
    if (!prompt) {
      return "Prompt is empty.";
    }

    if (prompt.length > this.maxPromptLength) {
      return `Prompt exceeds max length of ${this.maxPromptLength} characters.`;
    }

    if (this.strictInput && /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(prompt)) {
      return "Prompt contains forbidden control characters.";
    }

    return null;
  }

  private createTraceId(prompt: string, options: AIProcessOptions): string {
    const optionSeed = JSON.stringify(stableValue({
      agentId: options.agentId ?? this.defaultAgentId,
      logicalIndex: options.logicalIndex ?? ARE_CONSTANTS.DEFAULT_LOGICAL_INDEX,
      memoryScope: options.memoryScope ?? this.defaultMemoryScope,
      mode: "system",
      kappa: ARE_CONSTANTS.KAPPA_INVARIANT,
      metadata: options.metadata ?? {},
    }));

    return `are-ai-tool-${stableHash(`${prompt}|${optionSeed}`)}`;
  }

  private createToolMeta(traceId: string): AIServiceSkillToolMeta {
    return Object.freeze({
      name: this.name,
      version: this.version,
      deterministic: true,
      mode: "system",
      traceId,
      axiom: "ARELOGIC_KAPPA_1000",
    });
  }

  private createFallbackResult(
    error: string,
    normalizedPrompt: string,
    traceId: string
  ): AIProcessResult {
    const startedAt = Date.now();
    const safeInput = normalizedPrompt.slice(0, this.maxPromptLength);
    const inputHash = stableHash(safeInput);
    const output =
      "Degradierter AI-SkillTool-Fallback: Anfrage wurde sicher abgefangen.";
    const outputHash = stableHash(output);

    return Object.freeze({
      ok: false,
      mode: "system" as const,
      agentId: this.defaultAgentId,
      traceId,
      createdAt: startedAt,
      logicalIndex: ARE_CONSTANTS.DEFAULT_LOGICAL_INDEX,
      kappa: ARE_CONSTANTS.KAPPA_INVARIANT,
      resonance: ARE_CONSTANTS.DEFAULT_RESONANCE,
      inputHash,
      outputHash,
      durationMs: Date.now() - startedAt,
      payload: {
        input: safeInput,
        normalizedInput: safeInput,
        decision: {
          action: "heal_request" as const,
          confidence: 1,
          intent: "skill_tool_safe_degraded_fallback",
          response: output,
          heal: {
            code: "AI_SKILL_TOOL_DEGRADED_FALLBACK",
            message: error,
            severity: "warn" as const,
          },
          facts: [] as string[],
          risks: ["skill-tool-input-rejected", "recovered-by-fallback"],
        },
        output,
        axiomHash: stableHash(`skill-tool-fallback:${traceId}:${inputHash}:${error}`),
        rulesApplied: [
          "SKILL-TOOL-INPUT-VALIDATION",
          "ARE-KAPPA-INVARIANT",
          "DEGRADED-FALLBACK",
        ],
        learningHints: [] as string[],
      },
      error,
      warnings: ["AI skill tool entered degraded fallback mode."],
      metadata: {
        deterministic: true,
        realCore: false,
        degraded: true,
        autoHealLinked: true,
        skillTool: this.name,
        skillToolVersion: this.version,
      },
    });
  }

  private clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, Math.trunc(value)));
  }

  private errorToString(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown AIServiceSkillTool failure";
    }
  }
}
