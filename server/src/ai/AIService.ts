/**
 * AIService.ts
 * Real deterministic ARELogic AI Core for Arelorian WASD.
 *
 * This is NOT a mere facade - it implements:
 * - Rule-based reasoning engine
 * - Safety filtering before execution
 * - Stable hash generation (FNV-1a)
 * - ARE invariant enforcement (kappa=1000, no direct world mutation)
 * - AutoHeal integration for failures, safety blocks, and heal requests
 * - MiniMax integration for autonomous system health monitoring
 * - Degraded fallback instead of fatal crashes
 * - Legacy API backward compatibility (process, generateResponse)
 * - New structured API (processStructured with AREEnvelope output)
 * - Local learning store
 *
 * Time rule:
 * - Gameplay/AI identity uses only explicit logical tick + logical index.
 * - Monotonic process time is used only for duration/timeout observability.
 * - Wall clock never enters trace ids, hashes, learning order or envelopes.
 */

import { performance } from "node:perf_hooks";
import { ARE_CONSTANTS } from "../core/AREEnvelope.js";
import { AutoHealBridge } from "../selfheal/AutoHealBridge.js";
import type { IAutoHealBridge } from "../selfheal/AutoHeal.types.js";
import { AIReasoningCore } from "./AIReasoningCore.js";
import { AISafetyFilter } from "./AISafetyFilter.js";
import { AIHealBridge } from "./AIHealBridge.js";
import { MiniMaxClient } from "./MiniMaxClient.js";
import {
  AILocalLearningStore,
  type IAILocalLearningStore,
} from "./AILocalLearningStore.js";
import {
  type AIProcessOptions,
  type AIProcessResult,
  type IAIService,
} from "./AIService.types.js";

export class AIService implements IAIService {
  private static readonly DEFAULT_TIMEOUT_MS = 2_500;
  private static readonly DEFAULT_MAX_INPUT_LENGTH = 8_000;
  private static readonly DEFAULT_AGENT_ID = "ai-core";

  private readonly safety = new AISafetyFilter();
  private readonly reasoning = new AIReasoningCore();
  private readonly healBridge: AIHealBridge;
  private readonly miniMax: MiniMaxClient;

  constructor(
    private readonly learningStore: IAILocalLearningStore = new AILocalLearningStore(),
    autoHeal: IAutoHealBridge = new AutoHealBridge()
  ) {
    this.healBridge = new AIHealBridge(autoHeal);
    this.miniMax = new MiniMaxClient({
      apiKey: process.env.MINIMAX_API_KEY ?? "",
      enabled: process.env.MINIMAX_ENABLED === "true",
    });
  }

  /**
   * Legacy API: Process input and return string output.
   * @deprecated Use processStructured for full AREEnvelope result.
   */
  public async process(
    input: string,
    options: AIProcessOptions = {}
  ): Promise<string> {
    const result = await this.processStructured(input, options);

    if (!result.ok) {
      return `Axiom gesichert: degradierter Fallback aktiv. Grund: ${
        result.error ?? "unbekannt"
      }`;
    }

    return result.payload.output;
  }

  /**
   * Legacy API: Generate response for swarm agents.
   * @deprecated Use processStructured for full AREEnvelope result.
   */
  public async generateResponse(
    prompt: string,
    options: AIProcessOptions = {}
  ): Promise<string> {
    return this.process(prompt, {
      mode: "swarm",
      ...options,
    });
  }

  /**
   * Main structured API: Process input and return AREEnvelope result.
   * This is the primary method for AI core operations.
   */
  public async processStructured(
    input: string,
    options: AIProcessOptions = {}
  ): Promise<AIProcessResult> {
    const measurementStartedAt = performance.now();

    const mode = options.mode ?? "deterministic";
    const agentId = this.normalizeAgentId(options.agentId ?? AIService.DEFAULT_AGENT_ID);
    const tickId = this.normalizeTickId(options.tickId);
    const logicalIndex = this.normalizeLogicalIndex(options.logicalIndex);
    const kappa = this.normalizeKappa(options.kappa);
    const resonance = this.normalizeResonance(options.resonance);

    const maxInputLength = this.clampInt(
      options.maxInputLength ?? AIService.DEFAULT_MAX_INPUT_LENGTH,
      1,
      64_000
    );

    const timeoutMs = this.clampInt(
      options.timeoutMs ?? AIService.DEFAULT_TIMEOUT_MS,
      50,
      30_000
    );

    let normalizedInput = "";
    let traceId = options.traceId ?? "";

    try {
      normalizedInput = this.normalizeInput(input, maxInputLength);

      const inputHash = this.stableHash(normalizedInput);
      if (!traceId) {
        traceId = this.createTraceId(
          agentId,
          mode,
          tickId,
          logicalIndex,
          kappa,
          resonance,
          inputHash
        );
      }

      const safety = this.safety.evaluate(normalizedInput, mode);

      if (!safety.allowed) {
        const result = this.createFailureResult({
          mode,
          agentId,
          traceId,
          createdTick: tickId,
          measurementStartedAt,
          logicalIndex,
          kappa,
          resonance,
          normalizedInput,
          inputHash,
          error: safety.reason,
          warnings: safety.warnings,
          rulesApplied: safety.rulesApplied,
          metadata: {
            safety,
            blockedTerms: safety.blockedTerms,
            timeAuthority: "tick",
            tickId,
            ...options.metadata,
          },
        });

        await this.healBridge.reportSafetyBlock(result);

        // External diagnostic side-channel only; never part of deterministic result.
        await this.miniMax.reportBug(
          "AI_SAFETY_BLOCK",
          safety.reason,
          "ai_core",
          { blockedTerms: safety.blockedTerms, rulesApplied: safety.rulesApplied }
        );

        return result;
      }

      const decision = await this.withTimeout(
        this.reasoning.reason(normalizedInput, mode),
        timeoutMs,
        `AI reasoning timeout after ${timeoutMs}ms`
      );

      const output = this.buildOutput(decision.response, decision.confidence);
      const outputHash = this.stableHash(output);

      const axiomHash = this.stableHash(
        [
          mode,
          agentId,
          tickId,
          logicalIndex,
          kappa,
          resonance,
          inputHash,
          outputHash,
          decision.action,
          decision.intent,
        ].join(":")
      );

      const result: AIProcessResult = Object.freeze({
        ok: true,
        mode,
        agentId,
        traceId,
        // AREEnvelope keeps the historical property name. The value is a logical tick.
        createdAt: tickId,
        logicalIndex,
        kappa,
        resonance,
        inputHash,
        outputHash,
        durationMs: this.measureDurationMs(measurementStartedAt),
        payload: {
          input,
          normalizedInput,
          decision,
          output,
          axiomHash,
          rulesApplied: safety.rulesApplied,
          learningHints: this.createLearningHints(normalizedInput, decision.intent, mode),
        },
        warnings: safety.warnings,
        metadata: {
          deterministic: true,
          realCore: true,
          timeAuthority: "tick",
          tickId,
          durationAuthority: "monotonic_side_channel",
          allowLearning: options.allowLearning ?? false,
          memoryScope: options.memoryScope ?? mode,
          ...options.metadata,
        },
      });

      if (decision.action === "heal_request") {
        await this.healBridge.reportHealRequest(result);

        // External recovery side-channel only.
        const heal = decision.heal;
        await this.miniMax.reportBug(
          heal?.code ?? "AI_HEAL_REQUEST",
          heal?.message ?? "AI requested AutoHeal",
          "ai_core",
          { intent: decision.intent, confidence: decision.confidence, risks: decision.risks }
        );
      }

      if (options.allowLearning) {
        await this.learningStore.record({
          id: `learn_${axiomHash}`,
          agentId,
          memoryScope: options.memoryScope ?? mode,
          logicalIndex,
          inputHash,
          outputHash,
          intent: decision.intent,
          action: decision.action,
          confidence: decision.confidence,
          successScore: result.ok ? 1 : 0,
          tags: [mode, decision.intent, decision.action],
          // Legacy field name; deterministic tick, never wall clock.
          createdAt: tickId,
          metadata: result.metadata,
        });
      }

      this.log("info", "AI core processed", {
        mode,
        agentId,
        traceId,
        tickId,
        logicalIndex,
        kappa,
        resonance,
        inputHash,
        outputHash,
        action: decision.action,
        intent: decision.intent,
        confidence: decision.confidence,
      });

      return result;
    } catch (error) {
      const safeInput = normalizedInput || this.safeString(input).slice(0, 512);
      const inputHash = this.stableHash(safeInput);
      const errorMessage = this.errorToString(error);

      if (!traceId) {
        traceId = this.createTraceId(
          agentId,
          mode,
          tickId,
          logicalIndex,
          kappa,
          resonance,
          inputHash
        );
      }

      const result = this.createFailureResult({
        mode,
        agentId,
        traceId,
        createdTick: tickId,
        measurementStartedAt,
        logicalIndex,
        kappa,
        resonance,
        normalizedInput: safeInput,
        inputHash,
        error: errorMessage,
        warnings: ["AI core entered degraded fallback mode."],
        rulesApplied: ["ERROR-ENVELOPE", "AUTOHEAL-ON-FAULT", "DEGRADED-FALLBACK"],
        metadata: {
          deterministic: true,
          realCore: true,
          degraded: true,
          timeAuthority: "tick",
          tickId,
          durationAuthority: "monotonic_side_channel",
          ...options.metadata,
        },
      });

      await this.healBridge.reportFailure(result);

      // External diagnostic side-channel only.
      await this.miniMax.reportBug(
        "AI_PROCESS_FAILED",
        errorMessage,
        "ai_core",
        { mode, agentId, traceId, tickId, logicalIndex },
        error instanceof Error ? error.stack : undefined
      );

      return result;
    }
  }

  private createFailureResult(input: {
    mode: AIProcessResult["mode"];
    agentId: string;
    traceId: string;
    createdTick: number;
    measurementStartedAt: number;
    logicalIndex: number;
    kappa: number;
    resonance: number;
    normalizedInput: string;
    inputHash: string;
    error: string;
    warnings: string[];
    rulesApplied: string[];
    metadata: Record<string, unknown>;
  }): AIProcessResult {
    const output =
      "Degradierter AI-Fallback: Anfrage wurde sicher abgefangen und an AutoHeal gemeldet.";

    const outputHash = this.stableHash(output);

    return Object.freeze({
      ok: false,
      mode: input.mode,
      agentId: input.agentId,
      traceId: input.traceId,
      createdAt: input.createdTick,
      logicalIndex: input.logicalIndex,
      kappa: input.kappa,
      resonance: input.resonance,
      inputHash: input.inputHash,
      outputHash,
      durationMs: this.measureDurationMs(input.measurementStartedAt),
      payload: {
        input: input.normalizedInput,
        normalizedInput: input.normalizedInput,
        decision: {
          action: "heal_request" as const,
          confidence: 1,
          intent: "safe_degraded_fallback",
          response: output,
          heal: {
            code: "AI_DEGRADED_FALLBACK",
            message: input.error,
            severity: "warn" as const,
          },
          facts: [],
          risks: ["ai-failure", "recovered-by-fallback"],
        },
        output,
        axiomHash: this.stableHash(
          `failed:${input.mode}:${input.agentId}:${input.createdTick}:${input.logicalIndex}:${input.inputHash}:${input.error}`
        ),
        rulesApplied: input.rulesApplied,
        learningHints: [],
      },
      error: input.error,
      warnings: input.warnings,
      metadata: input.metadata,
    });
  }

  private buildOutput(response: string, confidence: number): string {
    const safeConfidence = Math.round(confidence * 100) / 100;
    return `${response} [confidence=${safeConfidence}]`;
  }

  private normalizeInput(input: string, maxLength: number): string {
    if (typeof input !== "string") {
      throw new TypeError("AI input must be a string");
    }

    const normalized = input
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();

    if (normalized.length === 0) {
      throw new Error("AI input must not be empty");
    }

    return normalized.slice(0, maxLength);
  }

  private normalizeAgentId(agentId: string): string {
    const normalized = agentId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._:-]/g, "-")
      .replace(/-+/g, "-");

    return normalized || AIService.DEFAULT_AGENT_ID;
  }

  private normalizeTickId(value: number | undefined): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.trunc(value as number));
  }

  private normalizeLogicalIndex(value: number | undefined): number {
    if (!Number.isFinite(value)) return ARE_CONSTANTS.DEFAULT_LOGICAL_INDEX;
    return Math.max(0, Math.trunc(value as number));
  }

  private normalizeKappa(_value: number | undefined): number {
    // Kappa is always 1000 - ARE invariant
    return ARE_CONSTANTS.KAPPA_INVARIANT;
  }

  private normalizeResonance(value: number | undefined): number {
    if (!Number.isFinite(value)) return ARE_CONSTANTS.DEFAULT_RESONANCE;

    const resonance = Math.trunc((value as number) * 1_000_000) / 1_000_000;
    return Math.max(0, Math.min(ARE_CONSTANTS.MAX_RESONANCE, resonance));
  }

  private createLearningHints(input: string, intent: string, mode: string): string[] {
    const hints: string[] = [];

    if (mode === "npc") {
      hints.push("Evaluate NPC outcome after next deterministic tick.");
    }

    if (mode === "swarm") {
      hints.push("Compare command proposal hash across swarm peers.");
    }

    if (intent === "selfheal_recovery") {
      hints.push("Route to AutoHeal recovery policy.");
    }

    if (input.length > 1_000) {
      hints.push("Compress prompt for future deterministic processing.");
    }

    return hints;
  }

  private createTraceId(
    agentId: string,
    mode: string,
    tickId: number,
    logicalIndex: number,
    kappa: number,
    resonance: number,
    inputHash: string
  ): string {
    const identity = [
      "ai-trace-v2",
      mode,
      agentId,
      tickId,
      logicalIndex,
      kappa,
      resonance,
      inputHash,
    ].join(":");
    return `trace_${this.stableHash(identity)}_${tickId}_${logicalIndex}`;
  }

  /**
   * FNV-1a hash - deterministic stable hash for input/output/axiom.
   */
  private stableHash(input: string): string {
    let hash = 0x811c9dc5;

    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  private measureDurationMs(startedAt: number): number {
    const elapsed = performance.now() - startedAt;
    if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
    // Observability-only value. Keep precision bounded and do not hash it.
    return Math.round(elapsed * 1000) / 1000;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message: string
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    const integer = Math.floor(value);
    return Math.max(min, Math.min(max, integer));
  }

  private safeString(value: unknown): string {
    if (typeof value === "string") return value;

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private errorToString(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private log(
    severity: "debug" | "info" | "warn" | "error",
    message: string,
    payload: Record<string, unknown>
  ): void {
    const line = JSON.stringify({
      service: "AIService",
      severity,
      message,
      ...payload,
    });

    if (severity === "error") {
      console.error(line);
      return;
    }

    if (severity === "warn") {
      console.warn(line);
      return;
    }

    console.log(line);
  }
}