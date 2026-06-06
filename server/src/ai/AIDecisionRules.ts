/**
 * AIDecisionRules.ts
 * Rule-based decision engine for deterministic AI reasoning.
 */

import type { AIActionType, AIReasonedDecision, AIServiceMode } from "./AIService.types.js";

export class AIDecisionRules {
  public decide(input: string, mode: AIServiceMode): AIReasonedDecision {
    const normalized = input.toLowerCase();

    const intent = this.detectIntent(normalized, mode);
    const risks = this.detectRisks(normalized);
    const facts = this.extractFacts(input);

    const action = this.selectAction(intent, mode, risks);
    const confidence = this.scoreConfidence(input, intent, risks);

    if (action === "heal_request") {
      return {
        action,
        confidence,
        intent,
        response: `AutoHeal-Anfrage erzeugt: ${intent}`,
        heal: {
          code: "AI_HEAL_REQUEST",
          message: `AI core detected recoverable issue: ${intent}`,
          severity: risks.length > 0 ? "warn" : "info",
        },
        facts,
        risks,
      };
    }

    if (action === "command_proposal") {
      return {
        action,
        confidence,
        intent,
        response: this.buildResponse(input, mode, intent),
        command: {
          type: this.commandTypeForIntent(intent, mode),
          payload: {
            intent,
            mode,
            confidence,
            facts,
          },
        },
        facts,
        risks,
      };
    }

    if (action === "reject") {
      return {
        action,
        confidence,
        intent,
        response: `Abgelehnt: ${intent}`,
        facts,
        risks,
      };
    }

    return {
      action,
      confidence,
      intent,
      response: this.buildResponse(input, mode, intent),
      facts,
      risks,
    };
  }

  private detectIntent(input: string, mode: AIServiceMode): string {
    if (input.includes("heal") || input.includes("recovery") || input.includes("degraded")) {
      return "selfheal_recovery";
    }

    if (input.includes("attack") || input.includes("combat") || input.includes("damage")) {
      return "combat_decision";
    }

    if (input.includes("trade") || input.includes("merchant") || input.includes("shop")) {
      return "trade_decision";
    }

    if (input.includes("quest") || input.includes("dialog") || input.includes("dialogue")) {
      return "quest_dialogue";
    }

    if (input.includes("watchdog") || input.includes("diagnose") || input.includes("error")) {
      return "diagnostic_check";
    }

    if (mode === "npc") return "npc_behavior";
    if (mode === "swarm") return "swarm_consensus";
    if (mode === "system") return "system_decision";
    if (mode === "heal") return "selfheal_recovery";

    return "general_reasoning";
  }

  private detectRisks(input: string): string[] {
    const risks: string[] = [];

    if (input.includes("mutation")) risks.push("mutation-risk");
    if (input.includes("random")) risks.push("randomness-risk");
    if (input.includes("timeout")) risks.push("timeout-risk");
    if (input.includes("fatal")) risks.push("fatal-risk");
    if (input.includes("corrupt")) risks.push("corruption-risk");

    return risks;
  }

  private extractFacts(input: string): string[] {
    return input
      .split(/[.!?\n]/g)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  private selectAction(
    intent: string,
    mode: AIServiceMode,
    risks: string[]
  ): AIActionType {
    if (risks.includes("fatal-risk") || risks.includes("corruption-risk")) {
      return "heal_request";
    }

    if (intent === "diagnostic_check") return "diagnose";
    if (intent === "selfheal_recovery") return "heal_request";

    if (mode === "npc" || mode === "swarm" || mode === "system") {
      return "command_proposal";
    }

    return "say";
  }

  private scoreConfidence(input: string, intent: string, risks: string[]): number {
    let score = 0.72;

    if (input.length > 20) score += 0.08;
    if (intent !== "general_reasoning") score += 0.12;
    if (risks.length > 0) score -= 0.1;

    return Math.max(0.1, Math.min(0.99, Math.round(score * 100) / 100));
  }

  private commandTypeForIntent(intent: string, mode: AIServiceMode): string {
    if (intent === "combat_decision") return "AI_COMBAT_PROPOSAL";
    if (intent === "trade_decision") return "AI_TRADE_PROPOSAL";
    if (intent === "quest_dialogue") return "AI_DIALOGUE_PROPOSAL";
    if (intent === "swarm_consensus") return "AI_SWARM_CONSENSUS";
    if (intent === "diagnostic_check") return "AI_DIAGNOSTIC_PROPOSAL";

    return `AI_${mode.toUpperCase()}_PROPOSAL`;
  }

  private buildResponse(input: string, mode: AIServiceMode, intent: string): string {
    switch (mode) {
      case "npc":
        return `NPC-Entscheidung erzeugt: ${intent} :: ${input}`;

      case "swarm":
        return `Swarm-Konsens erzeugt: ${intent} :: ${input}`;

      case "system":
        return `Systementscheidung erzeugt: ${intent} :: ${input}`;

      case "diagnostic":
        return `Diagnose erzeugt: ${intent} :: ${input}`;

      case "heal":
        return `Heal-Analyse erzeugt: ${intent} :: ${input}`;

      case "creative":
        return `Sandbox-Kreativantwort erzeugt: ${intent} :: ${input}`;

      case "deterministic":
      default:
        return `Deterministische Entscheidung erzeugt: ${intent} :: ${input}`;
    }
  }
}