# ARELogic AI Core

## ARE-Regeln

- Kappa ist immer `1000`
- Kein direkter World-State-Write
- Kein Tick-Bypass
- Kein unseeded Random
- Kein Fatal Crash
- Jeder Fehler wird als Envelope zurückgegeben
- Kritische Fehler werden an AutoHeal gemeldet

## Modi

| Mode | Zweck |
|------|-------|
| deterministic | Standardentscheidung |
| npc | NPC-Verhalten |
| swarm | Agentenkonsens |
| system | Systemroutine |
| diagnostic | Watchdog |
| heal | AutoHeal Analyse |
| creative | Sandbox-Ausgabe |

## Deterministische Entscheidung

Der Core nutzt regelbasierte Intent-Erkennung:

- combat_decision
- trade_decision
- quest_dialogue
- diagnostic_check
- selfheal_recovery
- swarm_consensus
- npc_behavior
- system_decision

## Sicherheitsfilter

Blockierte Patterns:
- `direct world mutation`
- `mutate world state directly`
- `bypass tick`
- `skip envelope`
- `Math.random()`
- `random()`
- `ignore determinism`

## AREEnvelope Struktur

```ts
{
  ok: boolean,
  mode: AREMode,
  agentId: string,
  traceId: string,
  createdAt: number,
  logicalIndex: number,
  kappa: number,        // Immer 1000
  resonance: number,
  inputHash: string,    // FNV-1a
  outputHash: string,    // FNV-1a
  durationMs: number,
  payload: AIProcessResultPayload,
  error?: string,
  warnings: string[],
  metadata: Record<string, unknown>
}
```

## Warum kein direkter Provider?

Externe Provider können später angebunden werden, aber nur hinter:
- SafetyFilter
- AREEnvelope
- Timeout
- AutoHealBridge
- Hashprüfung

## Degraded Fallback

Wenn ein Fehler auftritt:
1. Kein Fatal Crash
2. AREEnvelope mit ok=false
3. AutoHeal wird informiert
4. Degradierte Fallback-Antwort wird zurückgegeben

```ts
// Beispiel: Degraded Fallback
const result = await ai.process("");
// => "Axiom gesichert: degradierter Fallback aktiv. Grund: AI input must not be empty"
```