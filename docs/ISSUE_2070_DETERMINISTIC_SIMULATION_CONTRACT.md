# Issue #2070 – Deterministischer Simulationsvertrag

**Audit-Basis:** `main` bei `dad57978d07cd2745db8cc7624dd9baea73dc2af` (2026-08-12). Dieses Dokument beschreibt ausschließlich den auf diesem Commit nachweisbaren Vertrag. Es ersetzt weder Tick-State noch Hashes, erzeugt keinen Client-Fallback und enthält keine Runtime-Fassade.

> **Verbindliche Kette:** `kanonischer Input → geordneter Tick → serverseitige Mutation → Snapshot-Projektion → kanonischer Hash/Evidence → read-only Rendering`.

## Autoritätsgrenze

Der Client sendet einen fachlichen Wunsch und darf weder `actorId`, `tickId`, `logicalIndex`, `receivedOrder`, `chunkKey` noch `intentHash` bestimmen. Diese Felder werden auf dem Server konstruiert, validiert und in den Hash aufgenommen. Der Renderer konsumiert ausschließlich einen Snapshot beziehungsweise ein daraus abgeleitetes Overlay-Modell und schreibt keine Gameplay-Fakten zurück. [1] [2]

| Vertragsstufe | Aktiver Verantwortungsträger | Nachweisbare Invariante | Nicht zulässig |
|---|---|---|---|
| Input | `server/src/intents/ServerCanonicalIntent.ts` | Server setzt Actor, Tick, Reihenfolge, Chunk und SHA-256-Intent-Hash; Payload wird stabil normalisiert. [1] | Clientgelieferte Autoritäts- oder Hashfelder |
| Intake | `CanonicalIntentIntake` | Intents werden tickweise gehalten und über `logicalIndex`, `receivedOrder`, Actor, Chunk und Hash stabil sortiert. [2] | Direkte Weltmutation im Intake |
| Tick | `WorldTickScheduler` | Ein Schritt inkrementiert genau einen Tick; aktivierte Systeme werden nach Priorität und Namen geordnet ausgeführt. Der Scheduler liest keine Wall-Clock. [3] | Tick-Identität aus FPS, Uhrzeit oder Clientdaten ableiten |
| Projektion | `LiveGameplaySnapshotComposer` | Snapshot-Felder werden serverseitig gebildet, sortiert und eingefroren; die Komposition mutiert keine Quellen. [4] | Renderer als Gameplay-Entscheider oder zweite Projektion mit eigenen Fakten |
| Hash/Evidence | `WorldHashSnapshot` | Payload, Entitäten und Chunks werden kanonisiert beziehungsweise nach IDs und Koordinaten geordnet in den WorldHash aufgenommen. [5] | Telemetrie, Renderausgabe oder Wall-Clock in den WorldHash übernehmen |
| Rendering | Shared Overlay-Contract und Client-Bridge | Der Overlay-Contract ist eine reine Ableitung eines Server-Snapshots; fehlende Fakten führen zu ehrlichen Statuswerten statt zu erfundenem Content. [6] [7] | Lokale NPC-, Haus-, Lineage- oder Discovery-Erfindung |

## Tick- und Inputvertrag

Ein Tick ist eine rein logische Folgezahl. Die Sollfrequenz beträgt **10 Hz** beziehungsweise **100 ms**, aber der Scheduler leitet keine Simulationswahrheit aus der realen Zeit ab. Seine Reihenfolge ist verbindlich: `input → spatial-interest → resource-economy → npc-memory-rumor → world-brain → snapshot-composer`. Jeder Schritt validiert diese Reihenfolge, bevor er Systeme ausführt. [3]

Der kanonische Input muss den Serverkontext tragen. `canonicalizeClientIntent` verweigert insbesondere `actorId`, `chunkKey`, `tickId`, `logicalIndex`, `receivedOrder` und `intentHash` im Client-Payload, normalisiert Zahlen auf sechs Dezimalstellen und erzeugt den Hash erst nach der serverseitigen Zusammensetzung. [1] Die Intake-Schicht ist absichtlich ein deterministisches Register und keine Mutationsabkürzung; die Weltmutation bleibt in den Tick-Systemen. [2]

## Projektionsvertrag

`LiveGameplaySnapshotComposer` ist die Präsentationsgrenze. Seine Eingaben stammen aus serverseitig bereitgestellten Ports; Ausgabe-Arrays werden in stabiler Schlüsselreihenfolge sortiert und eingefroren. Für den aktuellen Vertrag ist `worldSurface` ein serverseitig gelieferter Teil dieser Projektion. [4]

Der gemeinsame `WorldOverlayModel`-Vertrag bestimmt, dass 2D- und 3D-Clients semantisch dieselben Snapshot-Fakten konsumieren. Die Ableitung besitzt weder Seiteneffekte noch RNG noch Wall-Clock-Abhängigkeiten und beschreibt die Statusgrenze `live`, `waiting`, `empty`, `stale` und `blocked` ehrlich. [6] Die 3D-Snapshot-Bridge konsumiert den HTTP-Snapshot read-only; HTTP-Fehler, fehlende Payloads und beschädigte Daten werden als `blocked` oder `waiting` dargestellt und nicht durch Demo-Inhalte ersetzt. [7]

## Hash- und Evidencevertrag

`WorldHashSnapshot` kanonisiert Werte, sortiert Objekteigenschaften und ordnet Spieler, NPCs und Loot innerhalb jedes Chunks nach ID. Der resultierende WorldHash enthält Tick, PayloadHash, Chunkgröße und die geordneten Chunk-Hashes; sein Zeitmarker lautet deterministisch `deterministic-tick:<tick>`. [5]

Dieser Hash ist eine Evidenz über kausalen Weltzustand. Er ist **nicht** als Nachweis eines Deployments, einer Browser-Verbindung oder eines langlebigen Replays zu interpretieren. Persistente Hash-Chain-Readback- und Runtime-Paritätsnachweise liegen weiterhin in den nachgeordneten Gates #2372 und #2469. [8] [9]

## Aktueller Abdeckungs- und Restumfang

| Vertragsbereich | Aktiver Main-Nachweis | Restliche Abnahmegrenze |
|---|---|---|
| Servergestempelter Input | Vorhanden in `ServerCanonicalIntent` und Intake. [1] [2] | Bewegung, NPC- und sonstige Fachpfade müssen weiterhin gegen denselben Intake-/Tick-/Hash-Pfad belegt werden. [10] |
| Deterministischer Tick | Scheduler mit fester Reihenfolge und 10-Hz-Vertrag vorhanden. [3] | Realer Lauf muss die registrierten Produktivsysteme und das Wiederanlaufen mit Hash-Readback belegen. [8] |
| Snapshot-Projektion | Composer und Shared Overlay-Ableitung vorhanden. [4] [6] | 2D-/3D-Parität und die konkrete 3D-Renderbindung sind erst nach den offenen Overlay-PRs auf `main` vollständig prüfbar. [11] [12] |
| Hash | Kanonischer Chunk-WorldHash vorhanden. [5] | Persistenter Replay-/Rehydrate-Nachweis bleibt offen. [8] |
| Runtime-Evidence | Kein behaupteter Ersatznachweis in diesem Dokument. | Browser-, Snapshot-/Hash-Readback und echte Runtime-Readbacks sind als separate Gates erforderlich. [9] |

## Verbindliche Abnahmeregel

Eine Änderung erfüllt diesen Vertrag nur, wenn sie einen realen, serverautoritären Pfad erweitert und gleichzeitig die betroffene Evidenz aktualisiert. Unit-Tests belegen reine Regeln, ersetzen aber keine Runtime- oder Replay-Evidence. Ein Browser-Smoke ersetzt keinen Hash-Readback. Ein Hash ersetzt kein Persistenz-Rehydrate. Keine dieser Ebenen darf durch Mocks, Stub-Systeme, Fake-Snapshots, zweite Event-Busse oder parallele Client-Wahrheit umgangen werden.

## Referenzen

[1]: https://github.com/OuroborosCollective/Wasd/blob/dad57978d07cd2745db8cc7624dd9baea73dc2af/server/src/intents/ServerCanonicalIntent.ts "ServerCanonicalIntent auf dem auditieren Main-SHA"
[2]: https://github.com/OuroborosCollective/Wasd/blob/dad57978d07cd2745db8cc7624dd9baea73dc2af/server/src/intents/CanonicalIntentIntake.ts "CanonicalIntentIntake auf dem auditieren Main-SHA"
[3]: https://github.com/OuroborosCollective/Wasd/blob/dad57978d07cd2745db8cc7624dd9baea73dc2af/server/src/core/are/WorldTickScheduler.ts "WorldTickScheduler auf dem auditieren Main-SHA"
[4]: https://github.com/OuroborosCollective/Wasd/blob/dad57978d07cd2745db8cc7624dd9baea73dc2af/server/src/gameplay/LiveGameplaySnapshotComposer.ts "LiveGameplaySnapshotComposer auf dem auditieren Main-SHA"
[5]: https://github.com/OuroborosCollective/Wasd/blob/dad57978d07cd2745db8cc7624dd9baea73dc2af/server/src/are/WorldHashSnapshot.ts "WorldHashSnapshot auf dem auditieren Main-SHA"
[6]: https://github.com/OuroborosCollective/Wasd/blob/dad57978d07cd2745db8cc7624dd9baea73dc2af/packages/shared/src/world/WorldOverlayDerivation.ts "WorldOverlayDerivation auf dem auditieren Main-SHA"
[7]: https://github.com/OuroborosCollective/Wasd/blob/dad57978d07cd2745db8cc7624dd9baea73dc2af/client/src/game/WorldOverlaySnapshotBridge.ts "WorldOverlaySnapshotBridge auf dem auditieren Main-SHA"
[8]: https://github.com/OuroborosCollective/Wasd/issues/2372 "Issue #2372 – Event-, Receipt- und Replay-Grenze"
[9]: https://github.com/OuroborosCollective/Wasd/issues/2469 "Issue #2469 – Runtime-Evidence und 2D-/3D-Parität"
[10]: https://github.com/OuroborosCollective/Wasd/issues/2073 "Issue #2073 – NPC-/Spieler-Intent-Parität"
[11]: https://github.com/OuroborosCollective/Wasd/issues/2464 "Issue #2464 – 3D-Snapshot- und Discovery-Parität"
[12]: https://github.com/OuroborosCollective/Wasd/issues/2046 "Issue #2046 – Serverautoritative worldSurface-Projektion"
