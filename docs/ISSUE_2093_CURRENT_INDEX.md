# Issue #2093 – Current Index gegen den Main-Callgraph

**Audit-Basis:** `main` bei `dad57978d07cd2745db8cc7624dd9baea73dc2af` (2026-08-12). Dieser Index beschreibt keine zweite Runtime-Wahrheit. Er trennt nachweisbare Main-Fakten von noch offenen Merge-, Runtime- und Produktions-Gates.

> Ein Gate bleibt offen, bis sein Restumfang auf dem aktiven Main-Pfad konkret beschrieben und über reale Tests sowie – bei Runtime-Themen – echte Snapshot-, Hash-, Replay- oder Live-Evidence belegt ist.

## Priorisierte offene Gates

| Priorität | Gate | Stand auf Audit-SHA | Konkrete Abschlussbedingung |
|---|---|---|---|
| P0 | #2070 – Simulationsvertrag | Dieser PR kartiert Tick, Input, Projektion und Hash auf den aktiven Main-Pfad. [1] | Vertrag bleibt nur dann erfüllt, wenn alle nachgeordneten Realitätsslices denselben Pfad nutzen. |
| P0 | #2372 – Event/Receipt/Replay | Audit-PR #2485 dokumentiert die Grenze; eine in-memory `RuntimeHistoryLog` ist kein persistenter Hash-Chain-Replay-Nachweis. [2] | Persistente Aufnahme, Rehydrate und Hash-Readback desselben Wahrheitspfads. |
| P0 | #2256 – Kill zu Loot | PR #2489 enthält einen echten Domain-E2E-Pfad, ist aber noch nicht Teil des Audit-Main. [3] | Merge plus erneuter Lauf gegen dann aktuellen Main. |
| P1 | #2466/#2465/#2464 | PR #2484 trägt den gemeinsamen 64-Tile-/Discovery- und Overlay-Pfad, ist noch nicht auf Audit-Main. [4] | Merge, reale 2D-/3D-Verbindung und Folgesnapshot-Evidence. |
| P1 | #2046 – 3D worldSurface | Audit-Main enthält keinen Nachweis einer aktiven Babylon-Projektion. Der gestapelte PR #2492 ergänzt Statuskorrektur und echte Headless-Babylon-Evidence auf #2484. [5] [6] | #2484 und #2492 auf Main, dann Snapshot-Empfang und Mesh-Zuordnung im aktuellen Build belegen. |
| P1 | #2469 – Runtime-Parität | PR #2488 definiert die Evidenzkette, nicht den behaupteten Runtime-Erfolg. [7] | Unit → Guard → Build → Browser → Snapshot-/Hash-Readback für dieselbe integrierte Slice. |
| P2 | #2043 – UI-Mutationsloops | PR #2490 dokumentiert eine SHA-gebundene Coverage-Matrix. [8] | Merge und reale Mutation → Folgesnapshot → Evidence pro kritischem Loop. |
| P2 | #2369/#2370 | PRs #2487/#2486 protokollieren den Security- beziehungsweise Toolchain-Gate-Stand. [9] [10] | Reproduzierbarer Lauf mit Runtime-Digest beziehungsweise isoliertem TypeScript-Vergleich auf bereinigter Baseline. |
| P3 | #2038/#2044/#2045 | Produktions-, Content- und Live-Smoke-Gates sind nicht durch lokale Unit-Evidence ersetzbar. [11] [12] [13] | Echter veröffentlichter Build, Pfad-/Lizenz-Readback und Live-Smoke gegen die Zielumgebung. |
| Ausgesetzt | #2480 | Der referenzierte Sovereign-Frontend-/Backend-Quellbaum ist im WASD-Repository nicht verfügbar; der Nutzer hat das Gate ausdrücklich ausgesetzt. [14] | Zugänglicher Quellbaum oder autorisierter Mirror, danach sessiongebundene Backend-Credentials prüfen. |

## Main-Callgraph-Anker

Der aktuelle Main enthält klar getrennte Kernmodule für kanonische Inputs, logischen Tick, Snapshot-Komposition und WorldHash. Die relevante Reihenfolge ist keine Annahme aus dieser Tabelle, sondern direkt im Scheduler hinterlegt: `input → spatial-interest → resource-economy → npc-memory-rumor → world-brain → snapshot-composer`. [15] Der Server kanonisiert und sortiert Intents in einem separaten Intake. [16] Die Snapshot-Komposition ist serverseitig und sortiert ihre Darstellungsausgabe stabil. [17] Die Hash-Komposition ordnet Entitäten und Chunks deterministisch. [18]

Diese Anker beweisen **nicht** allein, dass jeder fachliche Endpoint, jeder Persistenzadapter und jeder Client-Renderer bereits lückenlos eingebunden ist. Dafür sind die oben aufgeführten Slice-Gates maßgeblich. Insbesondere darf kein Gate durch einen Mock, eine Ersatz-JSON-Antwort, einen lokalen Client-Fallback oder eine nur dokumentierte Erfolgsbehauptung geschlossen werden.

## Merge- und Evidenzreihenfolge

Die gegenwärtig gestapelten Änderungen müssen in Datenflussreihenfolge bewertet werden. Zuerst muss die autoritative Overlay-Integration aus #2484 auf Main sein. Darauf baut #2492 mit der Korrektur für surface-only-Fakten und dem echten Babylon-NullEngine-Nachweis auf. Parallel muss #2491 den Shared-TypeScript-Baselinefehler beseitigen, damit CI-Ergebnisse nicht durch einen vorbestehenden fehlenden Typimport verfälscht werden. [4] [5] [6]

Nach einem Merge ist jede Aussage in diesem Index erneut gegen den neuen Main-SHA zu überprüfen. Nur ein solcher erneuter Lauf verhindert, dass ein historischer PR-Status als aktueller Callgraph-Fakt fortgeschrieben wird.

## Referenzen

[1]: https://github.com/OuroborosCollective/Wasd/issues/2070 "Issue #2070"
[2]: https://github.com/OuroborosCollective/Wasd/pull/2485 "PR #2485 – Runtime-Evidence- und Replay-Audit"
[3]: https://github.com/OuroborosCollective/Wasd/pull/2489 "PR #2489 – kanonischer Loot-E2E"
[4]: https://github.com/OuroborosCollective/Wasd/pull/2484 "PR #2484 – autoritatives World-Overlay"
[5]: https://github.com/OuroborosCollective/Wasd/issues/2046 "Issue #2046"
[6]: https://github.com/OuroborosCollective/Wasd/pull/2492 "PR #2492 – worldSurface-Renderer-Evidence"
[7]: https://github.com/OuroborosCollective/Wasd/pull/2488 "PR #2488 – Runtime-Evidence-Plan"
[8]: https://github.com/OuroborosCollective/Wasd/pull/2490 "PR #2490 – UI-Mutations-Coverage"
[9]: https://github.com/OuroborosCollective/Wasd/pull/2487 "PR #2487 – Node-Runtime-Security-Gate"
[10]: https://github.com/OuroborosCollective/Wasd/pull/2486 "PR #2486 – TypeScript-Toolchain-Gate"
[11]: https://github.com/OuroborosCollective/Wasd/issues/2038 "Issue #2038 – Produktionsdeploy und Live-Verifikation"
[12]: https://github.com/OuroborosCollective/Wasd/issues/2044 "Issue #2044 – Content-Pack, Pfad- und Lizenznachweis"
[13]: https://github.com/OuroborosCollective/Wasd/issues/2045 "Issue #2045 – Full-loop-E2E und Live-Smokes"
[14]: https://github.com/OuroborosCollective/Wasd/issues/2480 "Issue #2480 – Sovereign GitHub-Auth"
[15]: https://github.com/OuroborosCollective/Wasd/blob/dad57978d07cd2745db8cc7624dd9baea73dc2af/server/src/core/are/WorldTickScheduler.ts "WorldTickScheduler auf Audit-SHA"
[16]: https://github.com/OuroborosCollective/Wasd/blob/dad57978d07cd2745db8cc7624dd9baea73dc2af/server/src/intents/CanonicalIntentIntake.ts "CanonicalIntentIntake auf Audit-SHA"
[17]: https://github.com/OuroborosCollective/Wasd/blob/dad57978d07cd2745db8cc7624dd9baea73dc2af/server/src/gameplay/LiveGameplaySnapshotComposer.ts "LiveGameplaySnapshotComposer auf Audit-SHA"
[18]: https://github.com/OuroborosCollective/Wasd/blob/dad57978d07cd2745db8cc7624dd9baea73dc2af/server/src/are/WorldHashSnapshot.ts "WorldHashSnapshot auf Audit-SHA"
