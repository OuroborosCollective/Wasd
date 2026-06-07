# MiniMax-M2.7 Autonomous Agent Integration

## Overview

Der MiniMax-M2.7 Autonomous Agent ist ein KI-gesteuerter Agent, der das Areloria MMORPG-System überwacht, Bugs automatisch behebt und die ARELogic-Determinismus-Compliance sicherstellt.

## GitHub Secrets

Um den Agenten zu aktivieren, müssen folgende Secrets in GitHub hinterlegt werden:

### Erforderliche Secrets

| Secret Name | Beschreibung | Beispiel |
|------------|--------------|----------|
| `MINIMAX_API_KEY` | MiniMax API Key für den AI Agent | `eyJhbGciOiJIUzI1NiIs...` |
| `MINIMAX_ENABLED` | Aktiviert/Deaktiviert den MiniMax Agent | `true` oder `false` |
| `AUTONOMOUS_AUTO_FIX` | Erlaubt automatische Fixes via PR | `true` oder `false` |

### Optionale Secrets

| Secret Name | Beschreibung |
|------------|--------------|
| `MINIMAX_BASE_URL` | Alternative API URL (Standard: `https://api.minimax.chat/v1`) |
| `MINIMAX_MODEL` | Modell Name (Standard: `MiniMax-M2.7`) |

## Einrichtung in GitHub

1. **Repository Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** klicken
3. Secrets wie folgt hinterlegen:

### MINIMAX_API_KEY

```
Dein MiniMax API Key
```

### MINIMAX_ENABLED

```
true
```

### AUTONOMOUS_AUTO_FIX

```
true
```

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    MiniMax-M2.7 Agent                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ System      │  │ NPC          │  │ UI/UX        │      │
│  │ Health      │  │ Civilization  │  │ Optimization │      │
│  │ Monitor     │  │ Monitor      │  │ Monitor      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │            MiniMaxClient (API Client)            │      │
│  │  - reportHealth()                                 │      │
│  │  - reportBug()                                    │      │
│  │  - reportDeterminismViolation()                   │      │
│  │  - requestAutonomousFix()                         │      │
│  │  - requestNPCHealthCheck()                        │      │
│  │  - requestUIOptimization()                        │      │
│  │  - requestSystemAnalysis()                        │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        AIService                             │
│  - Verarbeitet AI-Anfragen                                  │
│  - Reportet Fehler an AutoHeal                              │
│  - Reportet Fehler an MiniMax                                │
│  - ARELogic Determinismus durchsetzen                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions                           │
│  - Workflow: minimax-autonomous-agent.yml                   │
│  - Trigger: Alle 15 Minuten / Manuell / Push/PR             │
│  - Actions: Health Check, NPC Check, UI Check, Auto Fix      │
└─────────────────────────────────────────────────────────────┘
```

## Funktionalitäten

### 1. System Health Monitoring

- Überwacht alle Subsysteme (AI Core, NPC, AutoHeal, etc.)
- Sendet regelmäßige Health Reports an MiniMax
- Erstellt Issues für kritische Probleme

### 2. NPC Civilization Health

- Analysiert autonomes NPC-Verhalten
- Erkennt Anomalien in NPC-Entscheidungen
- Überwacht NPC Memory Integrity
- Optimiert NPC Action Success Rates

### 3. UI/UX Optimization

- Analysiert Menu-System Klarheit
- Überprüft Inventory Usability
- Evaluiert Quest Log Accessibility
- Verbessert Combat UI Feedback

### 4. ARELogic Determinism Verification

- Verifiziert Kappa Invariant (immer 1000)
- Erkennt unseeded Random Usage
- Prüft auf direkte World Mutation
- Validiert Tick Bypass Prevention

### 5. Autonomous Fix Execution

- Erstellt Fix-Branches
- Generiert automatische PRs
- Führt Low-Risk Fixes direkt aus
- Dokumentiert alle Änderungen

## Workflows

### Zeitgesteuert (alle 15 Minuten)

```yaml
schedule:
  - cron: '*/15 * * * *'
```

### Manuell Triggerbar

```yaml
workflow_dispatch:
  inputs:
    task:
      type: choice
      options:
        - system_health
        - npc_health
        - ui_optimization
        - full_analysis
        - fix_issue
```

### Event-Trigger

- Push auf main/develop
- Pull Request auf main

## Reporting

Alle Reports werden im JSON-Format an GitHub Actions Step Summary gesendet:

```json
{
  "service": "MiniMax-M2.7",
  "event": "...",
  "subsystem": "...",
  "severity": "...",
  "timestamp": 1234567890
}
```

## Sicherheit

- MiniMax API Key niemals in Logs preisgeben
- Auto-Fix nur mit expliziter Zustimmung (`AUTONOMOUS_AUTO_FIX=true`)
- Alle PRs werden mit Co-Author Markierung erstellt
- Keine direkten Commits auf main

## Troubleshooting

### Agent reagiert nicht

1. `MINIMAX_API_KEY` prüfen
2. `MINIMAX_ENABLED=true` setzen
3. Workflow-Logs prüfen

### Keine automatischen Fixes

1. `AUTONOMOUS_AUTO_FIX=true` setzen
2. Risk-Level prüfen (nur `low` und `medium` werden automatisch gefixt)
3. GitHub Token Permissions prüfen

### Falsche API Calls

1. `MINIMAX_BASE_URL` prüfen
2. `MINIMAX_MODEL` prüfen
3. Network Access verifizieren

## NPC Civilization Features

### Autonome NPC-Handlungen

- NPC trifft Entscheidungen basierend auf ARELogic
- NPC Memory wird deterministisch gespeichert
- NPC Actions sind rückverfolgbar via Trace IDs

### Civilization Health Metrics

| Metric | Zielwert | Kritisch |
|--------|----------|----------|
| Decision Consistency | 100% | < 90% |
| Memory Integrity | 100% | < 95% |
| Action Success Rate | > 80% | < 50% |
| Emergent Behavior Anomalies | 0 | > 3 |

## UI/UX Optimization Targets

| Komponente | Usability Score | Kritisch |
|-----------|-----------------|----------|
| Menu System | > 90% | < 70% |
| Inventory | > 85% | < 60% |
| Quest Log | > 90% | < 70% |
| Combat UI | > 85% | < 60% |
| NPC Dialogue | > 90% | < 70% |

## Links

- [MiniMax API Dokumentation](https://www.minimax.chat/)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [ARELogic AI Core](ARELogic-AI-Core.md)
- [AutoHeal Integration](AutoHeal-AI-Integration.md)