# Architektur-Design: Azure Redis Enterprise Integration für Areloria / Wasd

## Zielsetzung
Integration eines Azure Redis Enterprise (MemoryOptimized_M100) Caches in die bestehende Serverarchitektur von Areloria / Wasd, um die Thinkinglogs der NPC-Agenten und den Zustand des World Brains effizient auszulagern und zwischenzuspeichern, ohne die Kernarchitektur oder den "Vertical Slice" zu gefährden.

## Aktueller Stand & Analyse
- **Cache-Abstraktion:** Es existiert bereits ein rudimentärer In-Memory-Cache (`server/src/core/Cache.ts`), der von `WorldTick.ts` für `world:stats` genutzt wird.
- **World Brain:** Das `HeuristicWorldBrain` (`server/src/modules/brain/HeuristicWorldBrain.ts`) berechnet pro Tick einen World State (Nodes, Anomalien, Center Value).
- **NPC AI:** NPCs generieren in `NPCSystem.tick` durch `NPCBrain.update` Thoughts, die aktuell nur als `[Thought]` via `chatSystem.systemMessage` emittiert werden. Es gibt eine inaktive/lokale `NPCMemoryEngine`.
- **Dependencies:** Bisher ist kein dedizierter Redis-Client im Projekt installiert (weder `redis` noch `ioredis`).

## Azure Redis Verbindungsdaten
- **HostName:** `thinking.germanywestcentral.redis.azure.net`
- **SKU:** `MemoryOptimized_M100` (High Availability: Enabled)
- **Minimum TLS Version:** `1.2`
- *Hinweis:* Für die tatsächliche Verbindung werden ein Access Key oder Password benötigt, die via Environment-Variablen (z.B. `REDIS_PASSWORD`) injiziert werden müssen.

## Geplante Architektur & Implementierungsschritte

### 1. Abhängigkeiten hinzufügen
- Installation von `ioredis` (oder `redis`), um eine robuste, TLS-fähige Verbindung zum Azure Redis Enterprise aufzubauen.

### 2. Cache-Layer erweitern (`server/src/core/Cache.ts`)
- **Ziel:** Den bestehenden In-Memory-Cache durch eine Redis-gestützte Implementierung ersetzen, aber als Fallback den In-Memory-Cache beibehalten, falls Redis nicht konfiguriert ist (Graceful Degradation).
- **Änderungen:**
  - Singleton-Redis-Client initialisieren, der auf `process.env.REDIS_URL` oder spezifische Azure-Variablen (`REDIS_HOST`, `REDIS_PASSWORD`) hört.
  - Die Methoden `set`, `get` und `del` asynchron machen (die bestehende Signatur `async get` ist bereits vorhanden, `set` und `del` sollten angepasst oder asynchron behandelt werden).
  - Die Tests in `cache.test.ts` anpassen, falls sich die Signatur ändert.

### 3. World Brain Caching (`server/src/core/WorldTick.ts`)
- **Ziel:** Den berechneten `worldAnalysis`-Zustand in Redis speichern, damit andere Dienste (oder externe Analyse-Tools) darauf zugreifen können.
- **Implementierung:** 
  - Nach `const worldAnalysis = this.worldBrain.analyze(...)` in `WorldTick.ts` den Zustand asynchron in Redis schreiben (z.B. unter dem Key `world:brain:state`).
  - Ein angemessenes TTL (z.B. 5-10 Sekunden) setzen, da der WorldTick 10Hz läuft und wir Redis nicht mit jedem Tick fluten wollen (Throttling/Debouncing beim Schreiben).

### 4. NPC Thinkinglogs Integration (`server/src/modules/npc/NPCSystem.ts`)
- **Ziel:** Die Gedanken (`decision.thought`) der NPCs persistieren.
- **Implementierung:**
  - In `NPCSystem.tick`, wenn ein NPC einen neuen Gedanken fasst (`if (npc.state !== decision.action)`), diesen nicht nur an das Chat-System senden, sondern auch in Redis ablegen.
  - **Datenstruktur in Redis:**
    - Variante A: Eine Redis-List (`RPUSH npc:thinkinglog:<npcId> {timestamp, thought, action}`) mit `LTRIM`, um die Liste auf z.B. die letzten 50 Gedanken zu begrenzen.
    - Variante B: Ein Pub/Sub-Kanal (`PUBLISH npc:thoughts {npcId, thought}`), falls externe Systeme (wie ein LLM-Agent) darauf lauschen sollen.
    - Variante C: Kombination aus List (für Historie) und Key-Value für den *aktuellen* Gedanken (`npc:current_thought:<npcId>`).
  - Wir implementieren eine robuste List-basierte Logik (Variante A) in einem neuen oder erweiterten Service (z.B. `NPCMemoryEngine` oder direkt via `Cache.ts`), um die Logs abrufbar zu machen.

### 5. Konfiguration & Environment
- Erweiterung der `.env.example` um die Azure Redis Parameter.

## Risikomanagement & Safe Steps
- **Safe Step:** Wir behalten den In-Memory-Fallback bei. Wenn die Redis-Verbindung fehlschlägt, stürzt der Server nicht ab.
- **Performance:** Redis-Aufrufe (insbesondere im 10Hz WorldTick) dürfen den Event-Loop nicht blockieren ("fire and forget" oder gebatchte Writes für NPC-Thoughts).
- **Architektur:** Die Kernlogik (Server Authority, 64x64 Chunks) bleibt völlig unangetastet. Wir klinken uns nur lesend/schreibend in bestehende Hooks (Chat-Emission, WorldAnalysis) ein.
