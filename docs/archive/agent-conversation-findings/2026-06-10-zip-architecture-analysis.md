# ARELORIAN / WASD – ZIP-Archiv Architektur-Analyse

Analysezeitpunkt: 2026-06-10  
Quellen: 8 hochgeladene Conversation-ZIPs mit 5.017 JSON-Events, 124 MessageEvents und 1.520 ObservationEvents.

## 1. Kurzfazit

Die ZIPs enthalten einen sehr nützlichen Entwicklungsverlauf der ARE-/Ouroboros-Architektur. Besonders wertvoll sind:

- Core Reality Alignment Phase 0/1
- Branded ARE/Kappa Types
- UnifiedChunkContract und Spatial-Core
- TickSystemRegistry und WorldTickThinShell
- World Brain / 13-Layer-Chunk-Logik
- SnapshotComposer mit Erhaltungssatz
- TickSystemContextProvider als Route-Brücke
- OuroborosTickSystem als Integrationspunkt für autonome NPC-Logik
- deterministic Stitch 2.5D Asset Intake Pipeline
- CI-/Audit-Gates zur Abwehr alter Logik

Die wichtigste Erkenntnis: Das Projekt hat inzwischen eine klare Zielarchitektur, aber die Dokumentation muss diese Zielarchitektur extrem deutlich von alter `WorldTick.ts`-Logik trennen.

## 2. Archiv-Statistik

| ZIP | Events | Messages | Observations | Kernthema |
|---|---:|---:|---:|---|
| conversation_ee55... | 419 | 9 | 128 | Core Reality Alignment Phase 0/1 |
| conversation_79c... | 824 | 34 | 228 | Phase 2-10 TickSystem, World Brain |
| conversation_79c... (1) | 909 | 39 | 249 | Duplikat/erweiterte Version mit Workflow-Aufräumung |
| conversation_6d3... | 609 | 13 | 196 | Ouroboros/ARE Routing Audit und Integration |
| conversation_73a... | 664 | 8 | 212 | Phase 11 Route-Migration / TickContextProvider |
| conversation_b3c... | 387 | 3 | 125 | TS-Fehlerfixes für TickSystem-Dateien |
| conversation_f12... | 566 | 10 | 181 | Stitch 2.5D Asset Intake Pipeline |
| conversation_36f... | 639 | 8 | 201 | Stitch Intake Merge-Blocker / Quarantine / CI |

## 3. ARE-Core Erkenntnisse

### 3.1 Kappa und feste Weltauflösung

- 1 logische Welt-Einheit = 1000 Kappa.
- Chunk-Größe: 64 × 64 Tiles.
- Chunk-Seitenlänge in Kappa: 64.000.
- Kappa-Zellen pro Chunk: 64.000 × 64.000 = 4.096.000.000.
- Diese Korrektur ist extrem wichtig, weil frühere Beschreibungen fälschlich nur 4.096 erwähnten.

Doku-Ort:
`docs/architecture/SPATIAL_KAPPA_GRID.md`

Warum wichtig:
Ohne diese Festlegung entstehen falsche Entfernungen, falsche Spawn-Radien, falsche Broadcast-Bereiche und Drift zwischen Client, Server und Tests.

### 3.2 Branded Types

Gefundene Kern-Typen:

- `Kappa`
- `TickId`
- `StateHash`
- `ChunkCoord`
- `ChunkKey`
- `EntityId`
- später ergänzt: `PlayerId`, `NpcId`, `GuildId`, `QuestId`, `TickSystemId`

Doku-Ort:
`docs/architecture/ARE_TYPE_CONTRACT.md`

Warum wichtig:
Branded Types verhindern, dass normale Strings/Zahlen versehentlich als ChunkKeys, TickIds oder StateHashes verwendet werden. Das ist eine direkte Architektur-Härtung gegen schleichende Logikfehler.

### 3.3 Spatial-Core

Gefundene Module:

- `ChunkMath.ts`
- `UnifiedChunkContract.ts`
- `MortonCode.ts`
- `InterestGrid.ts`
- `ObservedChunkSet.ts`
- `spatial/index.ts`

Wichtige Regel:

- Simulation radius = 2 Chunks = 5×5 Grid
- Broadcast radius = 1 Chunk = 3×3 Grid

Doku-Ort:
`docs/architecture/SPATIAL_INTEREST_GRID.md`

Warum wichtig:
Simulation und Netzwerk-Broadcast sind nicht dasselbe. NPCs dürfen weiter denken als Clients sehen. Diese Trennung spart Bandbreite und hält die Welt trotzdem lebendig.

## 4. Tick-System Erkenntnisse

### 4.1 Zielarchitektur

Gefundene Kernmodule:

- `TickSystem.ts`
- `TickSystemRegistry.ts`
- `WorldTickRegistryAdapter.ts`
- `WorldTickScheduler.ts`
- `WorldTickThinShell.ts`

Gefundene TickSysteme:

- `ManifestTickSystem`
- `SpatialBroadcastTickSystem`
- `WarfrontTickSystem`
- `CombatTickSystem`
- `NPCTickSystem`
- `EconomyTickSystem`
- `QuestTickSystem`
- `GuildTickSystem`
- `WorldBrainTickSystem`
- `OuroborosTickSystem`
- `AutonomousPlayerTickSystem`
- `AutoModuleKatalysator`

Doku-Ort:
`docs/architecture/TICK_SYSTEM_REGISTRY.md`

Warum wichtig:
Das ist der Ausweg aus dem alten God-Object `WorldTick.ts`. Domain-Logik soll nicht mehr direkt im Welt-Tick leben, sondern als registrierte, priorisierte Systeme laufen.

### 4.2 Warnung: Priority-Widerspruch

In den Logs steht sinngemäß:

- `OuroborosTickSystem` läuft mit NPC priority 400
- `SpatialBroadcastTickSystem` läuft mit BROADCAST 30
- Gleichzeitig wird behauptet, Ouroboros laufe "nach Gameplay, vor Broadcast"

Wenn die Registry aufsteigend sortiert, läuft 30 vor 400. Dann wäre Broadcast vor Ouroboros, nicht danach.

Empfehlung:
In `docs/architecture/TICK_SYSTEM_REGISTRY.md` eine eindeutige Priority-Tabelle dokumentieren und im Test erzwingen:

- Infrastructure: 0
- Gameplay: 20
- WorldBrain: 25
- AutonomousNPC/Ouroboros: 28 oder klar vor Broadcast
- Broadcast: 30
- Low/Background: 1000

Falls 400 wirklich gewollt ist, muss die Sortierlogik oder die Dokumentation korrigiert werden.

Warum wichtig:
Falsche Tick-Reihenfolge zerstört Kausalität. Wenn Broadcast vor NPC-/WorldBrain-Updates läuft, sendet der Client alte Zustände.

## 5. World Brain / 13-Layer Erkenntnisse

### 5.1 13 Layer

Finale Layer-Namen aus den Logs:

- ecology
- market
- physiology
- trade
- memory
- politics
- conflict
- economy
- kingdoms
- faith
- dungeon
- fear
- cycles

Ältere/alternative Namen aus derselben Phase:

- npc_vitality
- social_memory
- aggression
- conjuncture
- kingdom
- resurrection

Empfehlung:
Die Docs müssen eine kanonische Namensliste festlegen. Alternative alte Namen nur in einem Migration-Abschnitt aufführen.

Doku-Ort:
`docs/architecture/WORLD_BRAIN_13_LAYERS.md`

Warum wichtig:
Wenn Layer-Namen uneinheitlich sind, werden Snapshot-Hashes instabil, Persistenz bricht und Tests vergleichen unterschiedliche Felder.

### 5.2 SnapshotComposer

Gefundene Regel:

`WorldHash = Hash(ChunkID + EntityStates + IARELogicLayers)`

Erhaltungssatz:

`sum(13 ARE layers) = CONST_ARE_TOTAL`

Bei Verstoß:

`throw DeterminismViolation`

Doku-Ort:
`docs/architecture/SNAPSHOT_COMPOSER.md`

Warum wichtig:
Das ist einer der stärksten deterministischen Schutzmechanismen des Systems. Jeder Tick wird überprüfbar. Jeder Replay kann denselben Hash erzeugen.

### 5.3 LayerPersistenceQueue

Gefundene Regel:

- async non-blocking writes
- Flush-Intervall: 300 Ticks
- Bei 10 Hz entspricht das 30 Sekunden

Doku-Ort:
`docs/architecture/LAYER_PERSISTENCE_QUEUE.md`

Warum wichtig:
Persistenz darf den Tick nicht blockieren. Gleichzeitig muss der Weltzustand regelmäßig gesichert werden.

## 6. Phase 11 / Route-Migration

### 6.1 TickSystemContextProvider

Gefundene Eigenschaften:

- liefert `tickId`
- liefert `worldTimeHours`
- liefert `tickTimestamp` als deterministisch tick-basierten Wert
- liefert `seedHash` per FNV-1a
- soll HTTP-Routen von direktem `WorldTick.tickCount` entkoppeln

Refaktorierte Routen laut Logs:

- `gameplaySnapshot.ts`
- `onboardingRoute.ts`
- `questEventRoute.ts`
- `lootRoutes.ts`
- `inventoryRoute.ts`
- `craftingRoute.ts`
- `equipmentRoute.ts`
- `resourceGatherRoute.ts`
- `skillEventRoute.ts`
- `selfHealWorkshopRoute.ts`
- später zusätzlich:
  - `areHeartbeat.ts`
  - `areReplayRoute.ts`
  - `manifestResyncRoute.ts`

Doku-Ort:
`docs/architecture/TICK_CONTEXT_AND_ROUTES.md`

Warum wichtig:
REST-Routen sind sonst eine gefährliche Seitentür für alte Zeitlogik. Sie müssen denselben deterministischen Tick-Kontext verwenden wie die Simulation.

### 6.2 Kritische Warnung: `liveHeal.getStatus().tickCount`

In einem Fix wurde `tickContextProvider` über `liveHeal.getStatus().tickCount` an den echten Tick angebunden, weil `WorldTick.tickCount` privat war.

Das ist als Übergang pragmatisch, aber architektonisch gefährlich.

Empfehlung:
- Kurzfristig in Docs als "temporary bridge" markieren.
- Mittelfristig öffentlichen `getTickStatus()` oder `getTickId()` an der Shell/Scheduler-Grenze bereitstellen.
- Keine neuen Routen dürfen `(tick as any)` oder private WorldTick-Felder lesen.

Doku-Ort:
`docs/adr/ADR-0003-TICK_CONTEXT_PROVIDER.md`

Warum wichtig:
Sonst wird SelfHeal ungewollt zum Tick-Accessor und damit ein verstecktes Architekturzentrum.

## 7. Ouroboros-Erkenntnisse

### 7.1 Gefundene Dateien

- `OuroborosOracle.ts`
- `OuroborosLoop.ts`
- `OuroborosEngine.ts`
- `AgentNeeds.ts`
- `DynamicFactions.ts`
- `EmergentMarket.ts`
- `WorldEventBus.ts`
- `WorldHistory.ts`
- `LegendDistiller.ts`
- `OuroborosAnchor.ts`

### 7.2 Zyklus

Gefundene Hauptform:

`PERCEIVE → EVALUATE → ACT → REMEMBER → UPDATE`

Weitere Koordinatorform:

`Past → Legend → Belief → Action → History`

### 7.3 Integration

Wichtiger Fund:
Anfangs waren `OuroborosLoop` und `OuroborosEngine` nicht ins TickSystem integriert. Später wurde `OuroborosTickSystem.ts` als Wrapper vorgeschlagen/erstellt.

Doku-Ort:
`docs/architecture/OUROBOROS_TICK_SYSTEM.md`

Warum wichtig:
Das autonome NPC-/Weltgedächtnis darf nicht "nur existieren". Es muss deterministisch im Tick laufen, sonst ist es Deko-Code.

## 8. LLM/AI/Oracle Erkenntnisse

Gefundene Module:

- `LLMService.ts`
- `AIService.ts`
- `OracleEndpoint.ts`
- `PathfindingSystem.ts`
- `WorldEventBus.ts`

Wichtig:
Externe LLM-Ausgaben dürfen nicht direkt Simulation-State erzeugen. Sie dürfen höchstens Vorschläge, UI-Texte oder asynchrone Analyse liefern, die durch deterministische ARE-Regeln validiert werden.

Doku-Ort:
`docs/architecture/AI_ORACLE_BOUNDARY.md`

Regel:
External AI is advisory, not authoritative.

Warum wichtig:
Ein externes Modell ist nicht replaybar. Wenn es direkt Weltzustand erzeugt, ist Stateless Determinism kaputt.

## 9. Watchdog / Backend Erkenntnisse

Gefundene Backend-Dateien:

- `watchdog-server.ts`
- `axiomatic-event-bus.ts`
- `watchdog-emitter.ts`
- `watchdog-determinism.ts`
- `watchdog-leyline.ts`

Gefundene Eigenschaften:

- 10Hz WebSocket relay
- eigener `WATCHDOG_TICK_HZ = 10`
- AxiomaticEventBus mit `setWorldTick`
- Determinismus-Fingerprinting

Doku-Ort:
`docs/architecture/WATCHDOG_AND_SELFHEAL.md`

Warum wichtig:
Watchdog kann die zweite Schutzschicht sein: nicht nur Fehler sehen, sondern Tick-Konformität, Hash-Abweichungen und alte Logik-Eindringlinge erkennen.

## 10. Asset-Pipeline Erkenntnisse

### 10.1 Stitch 2.5D Intake Pipeline

Gefundene Ergebnisse:

- 31 Assets verarbeitet
- Kategorien: boss, enemy, equipment_overlay, hero, prop, tile, vfx
- deterministic IDs
- SHA-256 content hashes
- stable sorted traversal
- no UUID
- no Date.now / Math.random for gameplay asset IDs
- quarantine-first safety
- docs:
  - `docs/STITCH_2_5D_ASSET_INTAKE.md`
  - `docs/ASSET_PIPELINE_CONTRACT.md`

### 10.2 Merge-Blocker

Gefundene Blocker/Fixes:

- Manifest referenzierte Dateien, die nicht committed waren.
- `.gitignore` ignorierte zu pauschal.
- `processed_sha` wurde im Quarantine-Zweig zu früh benutzt.
- Testdateinamen waren uneinheitlich.
- E2E durfte nicht durch `|| echo` weich fallen.
- Visual report/contact sheet wurde als gewünschtes Artefakt genannt.

Doku-Ort:
`docs/assets/STITCH_2_5D_ASSET_INTAKE.md`
`docs/assets/ASSET_PIPELINE_CONTRACT.md`
`docs/runbooks/ASSET_INTAKE_CI.md`

Warum wichtig:
Assets sind nicht nur Grafik. Im deterministischen System sind Assets Runtime-Verträge. Manifest, Hash, Pfad und Quarantine entscheiden, ob Clients dieselbe Welt sehen.

## 11. CI / Workflow Erkenntnisse

Gefundene Audit-Kriterien:

- worldtick_domain_imports
- any_unknown_in_core
- non_deterministic_apis
- float_positions_in_core
- chunk_radius_conflicts
- snapshot_fields_origin
- persistence_in_tick
- empty_stub_methods

Wichtig:
Der erste Audit war absichtlich "rot", aber baseline-aware. `guard:all` darf in Phase 0/1 nicht hart failen, solange die Baseline als bekannte Altlast markiert ist.

Doku-Ort:
`docs/runbooks/CI_AUDIT_GATES.md`

Warum wichtig:
Ohne Audit-Gates kommt alte Logik zurück: direkte WorldTick-Imports, `Date.now()`, `Math.random()`, `any`, `unknown`, unsaubere Chunk-Radien.

## 12. Empfohlene Docs-Struktur

```text
docs/
  INDEX.md
  architecture/
    ARE_CORE_REALITY_ALIGNMENT.md
    ARE_TYPE_CONTRACT.md
    SPATIAL_KAPPA_GRID.md
    SPATIAL_INTEREST_GRID.md
    TICK_SYSTEM_REGISTRY.md
    WORLD_TICK_THIN_SHELL.md
    TICK_CONTEXT_AND_ROUTES.md
    WORLD_BRAIN_13_LAYERS.md
    SNAPSHOT_COMPOSER.md
    LAYER_PERSISTENCE_QUEUE.md
    OUROBOROS_TICK_SYSTEM.md
    AI_ORACLE_BOUNDARY.md
    WATCHDOG_AND_SELFHEAL.md
  adr/
    ADR-0001-STATELESS-DETERMINISM.md
    ADR-0002-UNIFIED-CHUNK-CONTRACT.md
    ADR-0003-TICK-CONTEXT-PROVIDER.md
    ADR-0004-WORLD-BRAIN-13-LAYERS.md
    ADR-0005-ASSET-MANIFEST-DETERMINISM.md
  assets/
    STITCH_2_5D_ASSET_INTAKE.md
    ASSET_PIPELINE_CONTRACT.md
    STYLE_MIXING_2D_TOPDOWN_2_5D.md
  runbooks/
    CI_AUDIT_GATES.md
    WEBSOCKET_PORTS.md
    ASSET_INTAKE_CI.md
    ROUTE_MIGRATION_CHECKLIST.md
  archive/
    agent-conversation-findings/
      2026-06-10-zip-architecture-analysis.md
```

## 13. Priorisierte Umsetzung

1. `docs/INDEX.md` schreiben, damit niemand die Architektur suchen muss.
2. `ARE_CORE_REALITY_ALIGNMENT.md` als Hauptvertrag.
3. `TICK_SYSTEM_REGISTRY.md` inklusive Priority-Reihenfolge und Testpflicht.
4. `WORLD_BRAIN_13_LAYERS.md` mit kanonischen Layer-Namen.
5. `TICK_CONTEXT_AND_ROUTES.md` mit "kein direkter WorldTick.tickCount Zugriff".
6. `CI_AUDIT_GATES.md` mit Rot-Baseline vs. Hard-Fail.
7. Asset-Docs nur danach, weil Core-Determinismus wichtiger ist.

## 14. Wichtigste offene Risiken

1. `WorldTick.ts` ist noch nicht klar genug als Legacy-/Compatibility-Layer abgegrenzt.
2. Priority-Reihenfolge von Ouroboros vs. Broadcast wirkt widersprüchlich.
3. `liveHeal.getStatus().tickCount` als Tick-Quelle ist nur Übergang, kein sauberer Vertrag.
4. Externe LLMs dürfen nicht autoritativ in Simulation schreiben.
5. 13-Layer-Namen müssen final kanonisiert werden.
6. Asset-Manifeste müssen beweisen, dass referenzierte Runtime-Dateien wirklich existieren.
7. `any`/`unknown` und nondeterministische APIs müssen weiter runter.

## 15. Warum diese Infos extrem wichtig sind

Diese ZIPs enthalten den Bauplan für den Sprung von "großem Game-Server mit WorldTick-Godfile" zu einer überprüfbaren, replaybaren und modularen ARE-Engine.

Der Wert liegt nicht in einzelnen Code-Snippets, sondern im Architekturvertrag:

- gleiche Inputs → gleicher Tick
- gleiche Chunks → gleicher Hash
- gleiche Assets → gleiche Manifest-Identität
- gleiche Route → gleicher TickContext
- keine direkte Zeit-/Random-Quelle in Simulation
- keine Domain-Logik im God-Object
- autonome NPC-/WorldBrain-Logik als TickSystem, nicht als lose Services

Das ist die Grundlage, damit Arelorian/WASD nicht unter State-Bloat zusammenbricht.
