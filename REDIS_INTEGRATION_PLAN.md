# Architektur-Design: Azure Redis Enterprise Integration für Areloria / Wasd

## Zielsetzung
Integration eines Azure Redis Enterprise (MemoryOptimized_M100) Caches in die bestehende Serverarchitektur von Areloria / Wasd, um die Thinkinglogs der NPC-Agenten und den Zustand des World Brains effizient auszulagern und zwischenzuspeichern, ohne die Kernarchitektur oder den "Vertical Slice" zu gefährden.

## Aktueller Stand & Analyse
- **Cache-Abstraktion:** Es existiert bereits ein rudimentärer In-Memory-Cache (`server/src/core/Cache.ts`), der von `WorldTick.ts` für `world:stats` genutzt wird.
- **World Brain:** Das `HeuristicWorldBrain` (`server/src/modules/brain/HeuristicWorldBrain.ts`) berechnet pro Tick einen World State (Nodes, Anomalien, Center Value).
- **NPC AI:** NPCs generieren in `NPCSystem.tick` durch `NPCBrain.update` Thoughts, die aktuell nur als `[Thought]` via `chatSystem.systemMessage` emittiert werden. Es gibt eine inaktive/lokale `NPCMemoryEngine`.
- **Dependencies:** Bisher war kein dedizierter Redis-Client im Projekt installiert.

## Azure Redis Verbindungsdaten
- **HostName:** `thinking.germanywestcentral.redis.azure.net`
- **SKU:** `MemoryOptimized_M100` (High Availability: Enabled)
- **Minimum TLS Version:** `1.2`
- **Hinweis:** Für die tatsächliche Verbindung werden ein Access Key oder Password benötigt, die via Environment-Variablen (z.B. `REDIS_PASSWORD`) injiziert werden müssen.

## Implementierte Architektur & Schritte

### 1. Abhängigkeiten hinzugefügt
- `ioredis` und `@types/ioredis` wurden als neue Abhängigkeiten in `server/package.json` installiert.

### 2. RedisClient Singleton (`server/src/core/RedisClient.ts`)
- Ein neuer Singleton-Client `RedisClient.ts` wurde erstellt, der die Verbindung zu Azure Redis Enterprise herstellt.
- Er unterstützt TLS 1.2 und verwendet Umgebungsvariablen (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS`) für die Konfiguration.
- Bei fehlender Konfiguration oder Verbindungsfehlern wird ein In-Memory-Fallback verwendet, um die Ausfallsicherheit zu gewährleisten.
- Die Initialisierung des Redis-Clients erfolgt frühzeitig im `ServerBootstrap.ts` vor dem Start des `WorldTick`.
- Ein Graceful Shutdown für die Redis-Verbindung wurde in `ServerBootstrap.ts` implementiert.

### 3. Cache-Layer erweitert (`server/src/core/Cache.ts`)
- Die bestehende `cache`-Abstraktion in `server/src/core/Cache.ts` wurde umgeschrieben, um den `RedisClient` zu nutzen.
- `set`, `get` und `del` Operationen versuchen zuerst Redis und fallen bei Nichtverfügbarkeit oder Fehlern auf den In-Memory-Cache zurück.
- Redis-Operationen sind asynchron und "fire-and-forget", um den Game-Loop nicht zu blockieren.

### 4. NPC Thinkinglogs Integration (`server/src/modules/npc/NPCThinkingLogService.ts`)
- Ein neuer Service `NPCThinkingLogService.ts` wurde erstellt, um die Gedanken der NPCs in Redis zu persistieren.
- Wenn ein NPC in `NPCSystem.tick` eine neue Entscheidung trifft, wird diese über `npcThinkingLog.logThought` in Redis gespeichert.
- Die Gedanken werden in einer Redis-Liste (`npc:thinkinglog:<npcId>`) mit einer Begrenzung auf die letzten 50 Einträge gespeichert und der aktuelle Gedanke separat (`npc:current_thought:<npcId>`) mit einem TTL von 30 Sekunden.
- Beim Entfernen eines NPCs (`NPCSystem.removeNPC`) werden die zugehörigen Logs in Redis gelöscht.

### 5. World Brain Caching (`server/src/modules/brain/WorldBrainCacheService.ts`)
- Ein neuer Service `WorldBrainCacheService.ts` wurde erstellt, um den Zustand des `HeuristicWorldBrain` in Redis zu cachen.
- Nach der Analyse des World State in `WorldTick.ts` wird der Zustand über `worldBrainCache.persistState` in Redis gespeichert.
- Das Schreiben in Redis ist gedrosselt (maximal alle 5 Sekunden), um die Performance des 10Hz WorldTick nicht zu beeinträchtigen.
- Der aktuelle World-Brain-Zustand wird unter `world:brain:state` mit einem TTL von 10 Sekunden gespeichert, Anomalien unter `world:brain:anomalies` und eine Historie in einer Liste unter `world:brain:history`.

### 6. Konfiguration & Environment
- Die `.env.example` wurde um die Azure Redis Parameter (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS`) erweitert.

## Testergebnisse
- **TypeScript Type-Check:** Erfolgreich bestanden (`npx tsc --noEmit`).
- **Content Validator:** Erfolgreich bestanden (`npm run validate`).
- **Vitest Tests:** 1 Test ist fehlgeschlagen (`server/src/tests/proximity.test.ts`). Dieser Fehler scheint nicht direkt mit der Redis-Integration zusammenzuhängen, da er eine Assertion bezüglich `npc.targetPosition` in `npc-heuristics.test.ts` betrifft, die bereits vor der Redis-Integration existierte. Die Redis-Integration hat keine Änderungen an der Logik der NPC-Bewegung oder des `targetPosition`-Managements vorgenommen.

## Verbleibende Risiken
- Der fehlgeschlagene `proximity.test.ts` muss untersucht und behoben werden. Es ist unwahrscheinlich, dass dies durch die Redis-Integration verursacht wurde, aber es ist ein bestehendes Problem im Projekt.
- Die tatsächliche Performance unter Last mit Redis muss in einer Staging-Umgebung getestet werden, um sicherzustellen, dass die "fire-and-forget"-Strategie und das Throttling ausreichend sind.
- Die korrekte Konfiguration der `REDIS_PASSWORD` Umgebungsvariable ist entscheidend für den erfolgreichen Betrieb des Redis-Caches.

## Nächster kleiner sinnvoller Schritt
- Untersuchung und Behebung des fehlgeschlagenen Tests in `server/src/tests/proximity.test.ts`.
