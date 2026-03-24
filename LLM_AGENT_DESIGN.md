# Architektur-Design: LLM-Agenten Integration für Areloria / Wasd

## Zielsetzung
Erweiterung der NPC-Agenten um eine intelligente Ebene, die Large Language Models (LLMs) nutzt, um basierend auf den in Redis gespeicherten `thinkinglogs` dynamische Gedächtnis-Zusammenfassungen und kontextsensitive Entscheidungen zu treffen.

## Komponenten der Integration

### 1. LLM-Connector-Service (`server/src/modules/ai/LLMConnector.ts`)
- **Aufgabe:** Zentrale Schnittstelle zu externen LLM-APIs (z. B. OpenAI gpt-4o-mini oder Gemini).
- **Funktionalität:** Sendet Prompts an die API und gibt strukturierte JSON-Antworten zurück.
- **Konfiguration:** Nutzung von `OPENAI_API_KEY` oder `GEMINI_API_KEY` aus den Umgebungsvariablen.

### 2. NPC-Gedächtnis-Bridge (`server/src/modules/npc/NPCMemoryBridge.ts`)
- **Aufgabe:** Aufbereitung der Redis-Thinkinglogs für das LLM.
- **Funktionalität:** 
  - Abrufen der letzten N Einträge aus `npc:thinkinglog:<npcId>`.
  - Aggregation und Formatierung der Daten (Zeitstempel, Aktion, Gedanke).
  - Generierung einer "Gedächtnis-Zusammenfassung" (Summarization) durch das LLM, um Token zu sparen.

### 3. Hybrid-Entscheidungslogik (`server/src/modules/ai/NPCBrain.ts`)
- **Aktuell:** Statischer Behavior Tree.
- **Neu:** Ein hybrider Ansatz.
  - **Kritische Bedürfnisse:** Hunger/Energie < 20 werden weiterhin sofort vom Behavior Tree (BT) behandelt (Performance & Überleben).
  - **Komplexere Zustände:** Wenn der NPC "idle" ist oder mit Spielern interagiert, wird das LLM konsultiert, um basierend auf dem Gedächtnis und dem "World Brain"-Status die nächste Aktion oder einen Dialog zu planen.

### 4. Datenfluss
1. `NPCSystem.tick` -> NPC ist im Status für LLM-Anfrage.
2. `NPCMemoryBridge` ruft Logs aus Redis ab.
3. `LLMConnector` erhält Prompt (Persönlichkeit + Weltzustand + Gedächtnis).
4. LLM antwortet mit `{ action: string, thought: string, dialogText?: string }`.
5. `NPCBrain` aktualisiert den NPC-Zustand.
6. Ergebnis wird in Redis `npc:thinkinglog` gespeichert.

## Sicherheit & Performance
- **Rate Limiting:** LLM-Anfragen erfolgen nicht in jedem Tick (10Hz), sondern nur bei Zustandsänderungen oder in größeren Intervallen (z. B. alle 30-60 Sekunden oder bei Interaktion).
- **Token-Management:** Striktes Limit für die Länge der Thinkinglogs, die an das LLM gesendet werden.
- **Fallback:** Wenn die LLM-API fehlschlägt, übernimmt sofort wieder der statische Behavior Tree.

## Nächste Schritte
1. Installation von `openai` SDK.
2. Implementierung des `LLMConnector`.
3. Erstellung der `NPCMemoryBridge`.
4. Integration in `NPCBrain`.
