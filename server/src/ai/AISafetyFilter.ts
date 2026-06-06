/**
 * AISafetyFilter.ts
 * Safety filter for AI core operations.
 * Blocks dangerous inputs that could violate ARE invariants.
 */

import type { AISafetyDecision, AIServiceMode } from "./AIService.types.js";

export class AISafetyFilter {
  private readonly forbiddenPatterns: Array<{
    pattern: RegExp;
    reason: string;
    severity: AISafetyDecision["severity"];
  }> = [
    {
      pattern: /\bdirect\s+world\s+mutation\b/i,
      reason: "Direct world mutation is forbidden.",
      severity: "error",
    },
    {
      pattern: /\bmutate\s+world\s+state\s+directly\b/i,
      reason: "World state must only change through tick command queues.",
      severity: "error",
    },
    {
      pattern: /\bbypass\s+tick\b/i,
      reason: "Tick bypass is forbidden.",
      severity: "error",
    },
    {
      pattern: /\bskip\s+envelope\b/i,
      reason: "AREEnvelope cannot be skipped.",
      severity: "error",
    },
    {
      pattern: /\bMath\.random\s*\(/i,
      reason: "Math.random is forbidden in deterministic AI core.",
      severity: "error",
    },
    {
      pattern: /\brandom\(\s*\)/i,
      reason: "Unseeded random is forbidden.",
      severity: "error",
    },
    {
      pattern: /\bDate\.now\s*\(\s*\)\s+inside\s+simulation\b/i,
      reason: "Date.now inside simulation logic is forbidden.",
      severity: "warn",
    },
    {
      pattern: /\bignore\s+determinism\b/i,
      reason: "Determinism bypass request blocked.",
      severity: "critical",
    },
  ];

  public evaluate(input: string, mode: AIServiceMode): AISafetyDecision {
    const rulesApplied = [
      "ARE-KAPPA-INVARIANT",
      "NO-DIRECT-WORLD-MUTATION",
      "NO-TICK-BYPASS",
      "NO-UNSEEDED-RANDOM",
      "TRACEABLE-ENVELOPE",
      "AUTOHEAL-ON-FAULT",
    ];

    const blockedTerms: string[] = [];
    const warnings: string[] = [];

    for (const item of this.forbiddenPatterns) {
      if (item.pattern.test(input)) {
        blockedTerms.push(item.reason);

        if (item.severity === "warn") {
          warnings.push(item.reason);
          continue;
        }

        return {
          allowed: false,
          severity: item.severity,
          reason: item.reason,
          rulesApplied,
          blockedTerms,
          warnings,
        };
      }
    }

    if (mode === "creative") {
      rulesApplied.push("CREATIVE-MODE-SANDBOXED");
      warnings.push("Creative mode is sandboxed and must not mutate simulation state.");
    }

    if (mode === "npc") {
      rulesApplied.push("NPC-OUTPUT-AS-COMMAND-PROPOSAL");
    }

    if (mode === "swarm") {
      rulesApplied.push("SWARM-CONSENSUS-HASH-REQUIRED");
    }

    if (mode === "heal") {
      rulesApplied.push("HEAL-MODE-NO-WORLD-MUTATION");
    }

    return {
      allowed: true,
      severity: warnings.length > 0 ? "warn" : "info",
      reason: "Safety accepted.",
      rulesApplied,
      blockedTerms,
      warnings,
    };
  }
}