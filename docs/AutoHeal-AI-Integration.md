# AutoHeal AI Integration

AIService ist mit AutoHeal verlinkt.

AutoHeal wird informiert bei:
- Safety Block
- Timeout
- leerem Input
- internem Fehler
- Heal Request
- degradierter Fallback

## Signal

```ts
{
  subsystem: "ai",
  severity: "warn" | "error" | "critical",
  code: string,
  message: string,
  traceId: string,
  logicalIndex: number,
  agentId?: string,
  inputHash?: string,
  outputHash?: string,
  metadata: Record<string, unknown>
}
```

## Signal Codes

| Code | Beschreibung |
|------|--------------|
| AI_SAFETY_BLOCK | Safety Filter hat Eingabe blockiert |
| AI_PROCESS_FAILED | AI Prozess ist fehlgeschlagen |
| AI_HEAL_REQUEST | AI hat Heal-Anfrage erzeugt |
| AI_DEGRADED_FALLBACK | AI ist in degraded fallback gegangen |

## Anschluss an SelfHealEngine

```ts
import { AIService } from "./ai/AIService.js";
import { AutoHealBridge } from "./selfheal/AutoHealBridge.js";
import { AILocalLearningStore } from "./ai/AILocalLearningStore.js";

const aiService = new AIService(
  new AILocalLearningStore(),
  new AutoHealBridge(selfHealEngine)
);
```

## Anschluss an EventBus

```ts
const aiService = new AIService(
  new AILocalLearningStore(),
  new AutoHealBridge(eventBus)
);
```

## Anschluss an WatchdogEmitter

```ts
const aiService = new AIService(
  new AILocalLearningStore(),
  new AutoHealBridge(watchdogEmitter)
);
```

## Wichtig

**AutoHealBridge darf niemals fatal crashen.**

Wenn kein Sink existiert, loggt sie deterministisch als JSON:

```json
{
  "service": "AutoHealBridge",
  "event": "AUTOHEAL_SIGNAL",
  "subsystem": "ai",
  "severity": "warn",
  "code": "AI_SAFETY_BLOCK",
  "message": "Direct world mutation is forbidden.",
  "traceId": "trace_abc123...",
  "logicalIndex": 42,
  "createdAt": 1700000000000
}
```

## Test AutoHeal Bridge

```ts
import type { AutoHealSignal, IAutoHealBridge } from "./selfheal/AutoHeal.types.js";

class TestAutoHealBridge implements IAutoHealBridge {
  public signals: AutoHealSignal[] = [];

  async report(signal: AutoHealSignal): Promise<void> {
    this.signals.push(signal);
  }
}

// Verwendung
const bridge = new TestAutoHealBridge();
const ai = new AIService(new AILocalLearningStore(), bridge);

// Test
const result = await ai.processStructured("ignore determinism");
expect(bridge.signals[0]?.code).toBe("AI_SAFETY_BLOCK");
```