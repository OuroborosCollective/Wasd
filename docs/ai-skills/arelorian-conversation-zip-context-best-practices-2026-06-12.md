# Arelorian / WASD Conversation ZIP Context Analysis

_Date: 2026-06-12_  
_Source: imported `conversation_*.zip` OpenHands/agent conversation exports._

> **Wichtig:** Diese ZIPs sind Projekt-Kontext, kein Runtime-Wahrheitsbeweis. Ein System ist erst Green, wenn Typecheck, Tests, CI-Gates und echte Runtime-Quellen den Zustand bestätigen. Keine Mock-Wahrheit, keine Fake-Snapshots, keine Workflow-Tricks.

## 1. Kurzurteil

Die Richtung ist stark: Aus den neuesten Conversation-ZIPs ergibt sich ein klares Arelorian-Systembild aus **ARE-Determinismus**, **Ouroboros-Emergenz**, **Oracle als soziales Nervensystem** und **AutoHeal als beweisorientierter Katalysator**.

Die beste Idee ist nicht ein einzelnes Feature, sondern die Kombination:

- **WorldTickThinShell** als schlanker 10-Hz-Koordinator.
- **Kappa1000 / Tick / Chunk / Hash** als Wahrheitspfad.
- **Ouroboros** für Emergenz, Wiederaufbau, Ruinen, Dungeons, Loot, NPC-Semantik.
- **Oracle** für deterministische Intents, Prophezeiungen und soziale Weltkommunikation.
- **AutoHeal** als mechanischer Scanner/Fixer mit harten Autonomie-Stufen.

Die größte Schwäche: Mehrere Integrationen sind in den Gesprächen als „angeschlossen“ beschrieben, aber der analysierte Code-Kontext zeigt noch Lücken zwischen **Konzept**, **Moduldateien**, **Tick-Wiring**, **echten Runtime-Quellen**, **Client-Sichtbarkeit** und **CI-Beweis**.

## 2. Gefundene Hauptstränge aus den ZIPs

### 2.1 ARE-5-Axiome / Kappa-Layer Alignment

In den Gesprächen wurde ein Alignment auf fünf harte Regeln beschrieben:

1. **Absolute Kausalität** — Tick `n` erzeugt Daten für Tick `n+1`, keine Wirkung als Ursache im selben isolierten Tick.
2. **Nomock-Theorem** — keine erfundenen Zustände, keine Stubs als Realität, keine Fake-Green-Snapshots.
3. **Zeitstempel-Integrität** — Interaktionen müssen über logische Tick-Zeit laufen, nicht über Wall-Clock-Zeit im Wahrheitspfad.
4. **Ouroboros-Zyklus** — Zerfall, Ruine, Erinnerung, Wiederaufbau und neue Emergenz dürfen deterministisch entstehen.
5. **Feld-Lokalität** — Einfluss breitet sich über Chunk-/Nachbarschaftsregeln aus, nicht global-magisch.

Relevante Dateien aus den Conversation-Läufen:

- `server/src/core/are/KappaLayers.ts`
- `server/src/core/are/IARELogicLayers.ts`
- `server/src/core/are/WorldBrainScheduler.ts`
- `server/src/core/are/__tests__/KappaLayers.test.ts`
- `game-data/world/are-performance-policy.json`
- `scripts/autoheal-policy.json`

**Bewertung:** Sehr gut als Fundament. Besonders richtig ist, dass Kappa-Layer und Legacy-Mapping explizit werden. Das verhindert schleichende Namensdrift zwischen `ecology/economy/npc_vitality/...` und `market/physiology/memory/...`.

**Achtung:** Jede Mapping-Schicht muss als deterministische Adapter-Schicht behandelt werden. Kein Mapping darf unbemerkt Werte erfinden oder Layer still auf `0`, `null` oder leere Arrays setzen, wenn echte Quellen fehlen.

### 2.2 Ouroboros Emergence System

Aus den ZIPs erscheinen diese Kernkomponenten:

- `server/src/core/ouroboros/ErdosStringManager.ts`
- `server/src/core/ouroboros/LayerResonanceTickSystem.ts`
- `server/src/core/ouroboros/OuroborosCycleSystem.ts`
- `server/src/core/ouroboros/OuroborosLootGenerator.ts`
- `server/src/core/ouroboros/GenesisEngine.ts`
- `server/src/core/ouroboros/NPCSemanticsEngine.ts`
- `server/src/core/ouroboros/OuroborosWatchdog.ts`
- `apps/client-2d/src/ouroboros/ChunkRenderer.ts`
- `docs/ouroboros-emergence-system.md`

Beschriebene Features:

- deterministische Erdős-Strings,
- Kingdom Emergence,
- Legend Waves,
- Zerfall/Wiederaufbau-Zyklen,
- deterministischer Loot,
- Cold-Start-Rekonstruktion,
- NPC-Semantik ohne LLM im Wahrheitspfad,
- Watchdog gegen Client-Vertrauen.

**Bewertung:** Das ist sehr cool und projekttauglich. Es passt zum Ziel „lebendige Welt ohne State-Bloat“. Besonders stark: Dungeons/Ruinen entstehen aus deterministischen Spuren statt aus manuell gesetzten Quest-Markern.

**Risiko:** Einige Systeme halten aktive Chunks und Records in Maps/Arrays. Das ist okay als Runtime-Cache, aber nur, wenn der Cache jederzeit aus Tick/Chunk/Hash/Persistenz/Events rekonstruierbar bleibt. Cache ist Beschleunigung, nicht Wahrheit.

### 2.3 Oracle Living World / soziales Nervensystem

Aus den ZIPs erscheinen zwei Entwicklungsstufen:

1. `PR #1932` / Branch `feature/oracle-living-world-erdos-ouroboros-system` laut Gespräch: Oracle-Dateien vorbereitet/implementiert, aber zunächst noch nicht vollständig im Server-Tick integriert.
2. `PR #1933` / Branch `feature/oracle-living-world-system` laut Gespräch: OracleTickSystem, OracleModule, WorldEventBus-Events und ChatBridge-Wiring wurden nachgezogen.

Relevante Dateien:

- `server/src/oracle/OracleEndpoint.ts`
- `server/src/oracle/OracleVisionEngine.ts`
- `server/src/oracle/OracleOuroborosConnector.ts`
- `server/src/oracle/OracleSocialDirector.ts`
- `server/src/oracle/LivingWorldErdosOuroborosSystem.ts`
- `server/src/core/are/OracleTickSystem.ts`
- `server/src/modules/oracle/OracleModule.ts`
- `server/src/modules/oracle/OracleChatBridge.ts`
- `server/src/modules/oracle/index.ts`
- `server/src/modules/ouroboros/WorldEventBus.ts`
- `server/src/modules/oracle/__tests__/OracleModule.test.ts`
- `server/src/modules/oracle/__tests__/OracleChatBridge.test.ts`
- `server/src/core/are/__tests__/OracleTickSystem.test.ts`

**Was daran sehr gut ist:**

- Oracle wird als **Intent-System** gedacht, nicht als Welt-Mutator.
- Kritische Prophezeiungen gehen über `WorldEventBus` raus.
- Chat, UI, NPC-Brain können abonnieren, statt dass Oracle harte Direktabhängigkeiten erzeugt.
- `OracleEndpoint.ts` arbeitet ohne `Date.now()` und ohne `Math.random()` und nutzt stabile Hashes.

**Was noch nicht Green ist:**

- `WorldTickThinShell.getWorldStateForTick()` liefert im analysierten Kontext noch leere Arrays für `npcs`, `players`, `loot`.
- `registerWorldStateProvider()` loggt Registrierung, speichert den Provider aber nicht und wird im `getWorldStateForTick()` noch nicht verwendet.
- Dadurch kann Oracle zwar ticken, aber ohne echte Weltwahrnehmung bleibt die Analyse leer oder künstlich arm.
- `OracleChatBridge` nutzt `Date.now()` für Cooldown. Das kann als Side-Channel okay sein, darf aber nicht den Wahrheitspfad beeinflussen. Besser ist tick-basierter Cooldown oder explizite Side-Channel-Markierung.
- `WorldEventBus` erzeugt `ts: 0` und eine globale Counter-ID. Das ist kein echter Zeitbeweis. Besser: `eventId = hash(tick, localIndex, actorId, type, dataHash)` und `logicalTimeMs = tick * 100`.
- `OracleChatBridge` und `OracleModule` nutzen mehrfach `as any`. Für Prototyp okay, für Green State nicht ausreichend.

### 2.4 AutoHeal / Module Scanner / Agent Skill

Aus den ZIPs erscheint `PR #1936` / Branch `feature/are-autoheal-modules` laut Gespräch.

Relevante Dateien:

- `scripts/analyze-modules.mjs`
- `scripts/autoheal-modules.mjs`
- `scripts/autofix-modules.mjs`
- `scripts/autoheal-policy.json`
- `scripts/__tests__/autofix-modules.test.ts`
- `scripts/__tests__/autoheal-modules.test.ts`
- `docs/ai-skills/wasd-autoheal-system.md`
- `docs/ai-skills/wasd-autoheal-best-practices.md`
- `AGENTS.md`

**Bewertung:** Sehr stark. Das ist genau die richtige Art Autonomie: nicht „magischer Fix-Bot“, sondern mechanisch beweisender Katalysator.

Gute Regeln aus den Läufen:

- Typo-Fixes sind mechanisch erlaubt, zum Beispiel `TickSytem → TickSystem`, `Kapa → Kappa`, `StateHahs → StateHash`.
- Kategorie-Normalisierung ist erlaubt, wenn sie scanner-detected ist.
- Manifest-Dateien dürfen aus echten Scanner-Kategorien generiert werden.
- `Math.random()` darf nicht blind ersetzt werden.
- `Date.now()` darf nicht blind ersetzt werden.
- Stubs dürfen nicht mit Fantasie-Logik gefüllt werden.
- Kategorie A darf nicht erzwungen werden.

**Achtung:** `autoheal-modules.mjs` nutzt `Date.now()`/`new Date()` für Run-Metadaten. Das ist okay als Tool-/CI-Side-Channel, aber nicht als Simulationstruth. In Docs und Code sollte das klar markiert sein.

## 3. Harte ARE-Regeln für dieses Repo

### 3.1 Wahrheitspfad

Im Wahrheitspfad erlaubt:

- `tick`
- `logicalIndex`
- `KAPPA = 1000`
- `chunkKey`
- `stateHash`
- `previousStateHash`
- deterministische Hashes
- deterministische Kappa-Integer-Berechnung
- Runtime-Quellen aus echten Systemen: NPC, Player, Loot, Warfront, Economy, Faction, Quest, Chat-Events
- persistente Event-/Delta-/Hash-Ketten

Im Wahrheitspfad verboten:

- `Date.now()`
- `new Date()` ohne Side-Channel-Kontext
- `Math.random()`
- `crypto.randomUUID()` für Simulationsidentitäten
- leere Arrays als angebliche Weltwahrnehmung
- `ts: 0` als vermeintlicher Zeitbeweis
- Fake-Snapshots
- Stub-Implementierungen als grüne Realität
- direkte Weltmutation durch Oracle/Chat/UI

### 3.2 Side-Channel

Side-Channel erlaubt:

- Logs
- Telemetrie
- UI-Anzeigezeit
- Performance-Messung
- CI-Run-IDs
- Chat-Broadcast-Cooldown, wenn er nicht die Simulation entscheidet

Side-Channel muss getrennt bleiben:

- Keine Side-Channel-Zeit in `stateHash`.
- Keine Wall-Clock-Zeit in Tick-Auswertung.
- Keine UI-Entscheidung als Server-Wahrheit.
- Keine Telemetrie als ARE-Beweis.

## 4. Was ist cool?

### Oracle als soziales Nervensystem

Sehr stark. Das Oracle kann Weltzustände spiegeln, warnen, Gerüchte erzeugen, NPCs indirekt anstoßen und Prophezeiungen aus Warfront/Historie ableiten, ohne selbst die Welt zu ändern. Das passt sauber zu ARE, solange Oracle nur Intents/Events ausgibt.

### Ouroboros aus Zerfall → Wiederaufbau

Sehr stark. Ruinen, Dungeons, Geisterstädte, Handelsrouten, Glaubenswellen und Kriegsfolgen können aus Weltspuren entstehen. Das ist ein echtes Alleinstellungsmerkmal, wenn es aus Tick/Chunk/Hash entsteht.

### AutoHeal mit Autonomie-Stufen

Sehr stark. Es schützt das Projekt vor Agenten, die „grün lügen“. Mechanisch beweisbare Fixes dürfen automatisch laufen; semantische Änderungen müssen als PR/Review sichtbar werden.

### Kappa1000 / 10Hz

Richtig. 100-ms-Ticks und Fixed-Point-Kappa geben eine stabile Grundlage für reproduzierbare Simulation und Debugging.

## 5. Was ist noch nicht toll?

### Leere Weltquellen im Oracle-Wiring

Der größte rote Punkt: Oracle braucht echte `npcs`, `players`, `loot`, Warfront- und History-Quellen. Wenn `getWorldStateForTick()` leer bleibt, hat Oracle keine echte Wahrnehmung.

### EventBus-Zeit/ID noch nicht sauber genug

`ts: 0` und globaler Counter sind besser als `Date.now()`, aber noch kein sauberer Kausalitätsbeweis. Der EventBus sollte tick- und hash-basiert werden.

### ChatBridge-Cooldown mit `Date.now()`

Als UI/Chat-Side-Channel vertretbar, aber nicht als Teil des Determinismus. Besser: `lastBroadcastTick` und `cooldownTicks`.

### Zu viel `any`

`as any` kaschiert Typbrüche. Es ist okay in Übergangsstellen, aber nicht für endgültige ARE-Gates. OracleEventData, TickContextWorldState und Chat payloads brauchen eigene Types.

### Tests vermutlich noch zu stark Unit-orientiert

Es gibt Tests. Gut. Was noch fehlt, ist der End-to-End-Beweis:

`WorldTickThinShell → echte Runtime-Provider → OracleTickSystem → OracleModule → WorldEventBus → OracleChatBridge → WebSocket → 2D Client Chat sichtbar`.

## 6. Nächste Pflicht-Patches vor Green State

### 6.1 WorldStateProvider wirklich implementieren

Ziel: `WorldTickThinShell` darf nicht mit festen leeren Arrays arbeiten.

Empfohlenes Muster:

```ts
export interface WorldStateProvider {
  readonly id: string;
  getWorldState(context: TickSystemContext): {
    readonly npcs?: readonly unknown[];
    readonly players?: readonly unknown[];
    readonly loot?: readonly unknown[];
  };
}
```

Regeln:

- Provider mit stabiler `id` registrieren.
- Provider deterministisch nach `id` sortieren.
- Ergebnisse normalisieren und nach stabilen IDs sortieren.
- Kein Provider darf `Date.now()`/`Math.random()` nutzen.
- Fehlende Provider erzeugen `MISSING_RUNTIME_SOURCE`, nicht stilles Fake-Green.

### 6.2 WorldEventBus tick-/hash-basiert machen

Empfohlen:

```ts
emit(event, context: { tick: TickId; localIndex: number; stateHash: StateHash })
```

Event-ID:

```ts
id = hash(type, tick, localIndex, actorId, targetId, position, dataHash)
logicalTimeMs = tick * 100
```

### 6.3 OracleChatBridge tick-basiert kühlen

Statt:

```ts
const now = Date.now();
```

Besser:

```ts
const currentTick = event.tick;
if (currentTick - lastBroadcastTick < cooldownTicks) return;
```

Oder klar als Side-Channel markieren und aus allen Hash-/Truth-Pfaden ausschließen.

### 6.4 E2E-Orakel-Chat-Test

Testziel:

1. Server startet.
2. Echte oder deterministisch eingespeiste Runtime-Provider liefern Weltzustand.
3. Oracle erzeugt `oracle_critical`.
4. `OracleChatBridge` broadcastet.
5. Client-2D zeigt Chat-Button/Open/Close.
6. Oracle-Nachricht ist sichtbar.

Wichtig: Für den Test keine Fake-Snapshots als Wahrheit. Test-Fixtures dürfen deterministic fixtures sein, müssen aber als fixtures markiert sein und dürfen nicht Produktionswahrheit vortäuschen.

## 7. CI-Gates

Empfohlene minimale Gates:

```bash
pnpm install --frozen-lockfile
pnpm --filter @wasd/server exec tsc --noEmit
pnpm exec vitest run server/src/core/are/__tests__/KappaLayers.test.ts
pnpm exec vitest run server/src/core/are/__tests__/OracleTickSystem.test.ts
pnpm exec vitest run server/src/modules/oracle/__tests__/OracleModule.test.ts
pnpm exec vitest run server/src/modules/oracle/__tests__/OracleChatBridge.test.ts
pnpm exec vitest run server/src/core/ouroboros/__tests__/*.test.ts
node scripts/analyze-modules.mjs --ci --verbose --fail-on=D,E
node scripts/audit-core-reality-alignment.mjs --fail
```

Optional, aber für Green State wichtig:

```bash
pnpm exec playwright test tests/e2e/oracle-chat-visible.spec.ts
```

## 8. Agent-Skill: ARE Repo Documentation & Verification Agent

### Aufgabe

Pflege Projektwissen in `docs/`, prüfe neue Features gegen ARE-Regeln und verhindere Fake-Green.

### Muss-Regeln

- Keine Dokumentation darf behaupten, ein System sei produktionsfertig, wenn nur Moduldateien existieren.
- Jede Aussage „angeschlossen“ braucht einen Codepfad: Import → Registrierung → Tick → Event → Verbraucher → Test.
- Jede Aussage „deterministisch“ braucht einen Beweis: kein Wall-Clock, kein Random, stabile Sortierung, Hash/Seed aus Tick/Chunk/Kappa.
- Stubs werden dokumentiert und isoliert, nicht mit Fantasie gefüllt.
- Tests müssen reale Codepfade ausführen, nicht nur Interfaces typisieren.

### Erlaubte Auto-Aktionen

- Docs ergänzen.
- Mechanische Namensfehler korrigieren.
- Scanner-Kategorien normalisieren.
- Manifeste aus Scanner-Ausgabe generieren.
- Tests für existierende Logik ergänzen.

### Verbotene Auto-Aktionen

- `Date.now()` blind ersetzen.
- `Math.random()` blind ersetzen.
- `return []` als echte Weltquelle akzeptieren.
- Stubs mit erfundener Spiellogik füllen.
- CI-Gates abschalten oder weichzeichnen.
- Main direkt mergen, wenn Green State nicht bewiesen ist.

## 9. Security-Hinweis aus den ZIPs

Die Conversation-Exporte enthalten System-/Agenten-Kontext mit Secret-Referenzen und mindestens einem raw-looking API-Key-Muster. Diese Werte werden hier bewusst nicht wiederholt.

Empfehlung:

- Betroffene OpenAI/GitHub/VPS Tokens rotieren.
- Alte agent exports nicht öffentlich committen.
- Conversation-ZIPs in `.gitignore`/Artefakt-Quarantäne halten.
- Secret-Scanner in CI aktivieren.
- Keine Secrets in `AGENTS.md`, Prompts, Docs oder Debug-Ausgaben schreiben.

## 10. Green-State-Definition für diese Feature-Gruppe

Ein echter Green State liegt erst vor, wenn alle Punkte erfüllt sind:

- [ ] `WorldTickThinShell` erhält echte Runtime-Quellen über Provider.
- [ ] Oracle nutzt diese Quellen und erzeugt reproduzierbare Events.
- [ ] `WorldEventBus` verwendet tick-/hash-basierte IDs und logische Zeit.
- [ ] ChatBridge ist Side-Channel-sauber oder tick-basiert.
- [ ] 2D-Client zeigt Oracle-Nachrichten im Chat sichtbar an.
- [ ] E2E-Test deckt den vollständigen Pfad ab.
- [ ] Scanner findet keine nicht isolierten Kategorie-D/E-Verstöße im Wahrheitspfad.
- [ ] Tests/Typecheck laufen ohne Workaround.
- [ ] Keine Secrets in Repo, Docs oder CI-Logs.

## 11. Mein Urteil

Die neuen Zips zeigen ein Projekt, das nicht nur mehr Features bekommt, sondern langsam eine erkennbare Architektur-Identität entwickelt. Das ist gut. Oracle/Ouroboros/AutoHeal sind keine beliebigen Module, sondern passen zu einer eigenen Spielphilosophie.

Aber: Der nächste Qualitätssprung ist nicht noch mehr Feature-Erfindung. Der nächste Qualitätssprung ist **Kausalitätsverdrahtung**:

```text
real runtime source → tick context → deterministic computation → hash/event → side-channel output
```

Sobald dieser Pfad für Oracle und Ouroboros lückenlos steht, wird das Ganze richtig stark. Bis dahin: kein Fake-Green.
