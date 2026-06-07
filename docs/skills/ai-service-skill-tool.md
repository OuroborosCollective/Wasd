# Skill Tool: arelogic.ai.real_process

## Zweck

Führt den realen deterministischen ARELogic AI Core aus.

## Input

```ts
{
  prompt: string;
  options?: {
    mode?: "deterministic" | "npc" | "swarm" | "system" | "diagnostic" | "heal" | "creative";
    agentId?: string;
    logicalIndex?: number;
    kappa?: number;
    resonance?: number;
    allowLearning?: boolean;
    memoryScope?: string;
  };
}
```

## Output

```ts
{
  ok: boolean;
  result: AIProcessResult;
}
```

## AIProcessResult

```ts
{
  ok: boolean;
  mode: AREMode;
  agentId: string;
  traceId: string;
  createdAt: number;
  logicalIndex: number;
  kappa: number;        // Immer 1000
  resonance: number;
  inputHash: string;    // FNV-1a
  outputHash: string;   // FNV-1a
  durationMs: number;
  payload: {
    input: string;
    normalizedInput: string;
    decision: {
      action: AIActionType;
      confidence: number;
      intent: string;
      response: string;
      command?: AICommand;
      heal?: AIHeal;
      facts: string[];
      risks: string[];
    };
    output: string;
    axiomHash: string;
    rulesApplied: string[];
    learningHints: string[];
  };
  error?: string;
  warnings: string[];
  metadata: Record<string, unknown>;
}
```

## Beispiel

```ts
import { AIService } from "../ai/AIService.js";
import { AIServiceSkillTool } from "../ai/AIServiceSkillTool.js";

const aiService = new AIService();
const tool = new AIServiceSkillTool(aiService);

const result = await tool.execute({
  prompt: "NPC detects corrupted trade state and requests heal",
  options: {
    mode: "npc",
    agentId: "npc_merchant_01",
    logicalIndex: 100,
    kappa: 1000,
    resonance: 1,
    allowLearning: true,
    memoryScope: "npc:npc_merchant_01"
  }
});

console.log(result.ok);                    // true
console.log(result.result.payload.decision.action);  // "command_proposal"
console.log(result.result.payload.decision.intent);   // "trade_decision"
```

## Regeln

1. SafetyFilter läuft zuerst
2. AutoHeal wird bei Fehlern informiert
3. Keine direkte Weltmutation
4. Ausgabe ist immer AREEnvelope
5. Kappa ist immer 1000
6. Deterministische Hashes für Input/Output/Axiom