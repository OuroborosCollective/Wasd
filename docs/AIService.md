# AIService

Der AIService ist ein **realer deterministischer AI-Core** für Arelorian WASD.

Er ist nicht nur eine Fassade.

Er erzeugt echte strukturierte Entscheidungen für:
- NPCs
- Swarm-Agenten
- Systemroutinen
- Watchdog-Diagnose
- AutoHeal-Recovery

## Legacy API

```ts
const output = await ai.process("NPC greets player");
```

## Real Structured API

```ts
const result = await ai.processStructured("NPC starts quest dialogue", {
  mode: "npc",
  agentId: "npc_001",
  logicalIndex: 42,
  kappa: 1000,
  resonance: 1,
  allowLearning: true,
  memoryScope: "npc:npc_001",
});
```

## Output

Der Core liefert:

```ts
decision.action        // "say" | "diagnose" | "recommend" | "command_proposal" | "heal_request" | "reject" | "noop"
decision.intent        // "combat_decision" | "trade_decision" | "quest_dialogue" | "diagnostic_check" | "selfheal_recovery" | ...
decision.confidence    // 0.1 - 0.99
decision.command       // { type: string, target?: string, payload: Record<string, unknown> }
decision.heal          // { code: string, message: string, severity: string }
inputHash              // FNV-1a hash
outputHash             // FNV-1a hash
axiomHash              // FNV-1a hash
warnings               // string[]
metadata               // { deterministic: true, realCore: true, ... }
```

## Keine direkte Weltmutation

AIService erzeugt nur **Vorschläge**.

Weltänderungen laufen über:
- CommandQueue
- WorldTick
- EventBus
- AutoHeal

## Dateien

- `server/src/ai/AIService.ts` - Hauptimplementierung
- `server/src/ai/AIService.types.ts` - Typdefinitionen
- `server/src/ai/AISafetyFilter.ts` - Sicherheitsfilter
- `server/src/ai/AIDecisionRules.ts` - Regelbasierte Entscheidungen
- `server/src/ai/AIReasoningCore.ts` - Reasoning Engine
- `server/src/ai/AILocalLearningStore.ts` - Lokaler Lernspeicher
- `server/src/ai/AICommandMapper.ts` - Command Mapping
- `server/src/ai/AIHealBridge.ts` - AutoHeal Bridge
- `server/src/ai/AIServiceSkillTool.ts` - Skill Tool
- `server/src/core/AREEnvelope.ts` - ARE Envelope Typ
- `server/src/selfheal/AutoHealBridge.ts` - AutoHeal Adapter
- `server/src/selfheal/AutoHeal.types.ts` - AutoHeal Typen