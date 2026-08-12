# Issue #2469: Runtime-Evidence-Plan für 2D-/3D-Overlay-Parität

## Geltungsbereich

Dieser Plan bezieht sich auf den Integrationsstand `12ee850e7264c60d60c14bbf4a05af46e4003d2d` aus [PR #2484](https://github.com/OuroborosCollective/Wasd/pull/2484). Er definiert die Mindestkette für die dort ergänzten Discovery- und `worldSurface`-Slices. Bis zu einem realen Browser- und Snapshot-Readback bleibt jeder erfolgreiche Unit-, Guard- oder Build-Lauf ausdrücklich **build-only**.

## Verbindliche Evidence-Kette

| Schicht | Nachweis | Akzeptanzkriterium | Gilt allein als Runtime-Erfolg? |
|---|---|---|---:|
| Unit | Shared-Overlay-Derivation, 2D-Adapter, Babylon-Adapter und Snapshot-Bridge-Tests | Beide Clients verarbeiten denselben `WorldOverlayModel`-Vertrag; `blocked` und `waiting` erzeugen keine erfundene Wahrheit | Nein |
| Guard | Architektur- und Determinismus-Guard | Keine neue clientseitige Discovery-Wahrheit, kein entkoppelter Chunk-/Kappa-Vertrag | Nein |
| Build | 2D- und 3D-Produktionsbuild | Aktive Entrypoints und Adapter lösen auf dem getesteten Head auf | Nein |
| Browser | Authentifizierte reale 2D- und 3D-Session gegen denselben Serverstand | Sichtbarer Zustand für denselben autoritativen Faktensatz; keine statische Demo und keine Fixture-Truth | Ja, nur zusammen mit Readback |
| Snapshot-/Hash-Readback | Rohantwort von `GET /api/gameplay/snapshot` derselben Session plus Revision und Hash | `serverTick`, `revisionHash`, `sourceEvidence` und die vom Client gezeigten Fakten lassen sich zuordnen | Ja, nur zusammen mit Browser |

## Reale Browser-Smokes

Für den 2D-Screenshot wird eine authentifizierte `/2d`-Session verwendet, die mindestens einen serverseitig bestätigten Overlay-Fakt empfängt. Sichtbar sein müssen der echte Welt-Canvas und die dauerhaft gemounteten Overlay-Layer für POIs, Ressourcen oder Camp-NPCs. Ein `waiting`- oder `blocked`-Zustand wird ebenfalls erfasst, darf aber nicht als Live-Evidence gewertet werden.

Für den 3D-Screenshot wird dieselbe Spieleridentität gegen dieselbe Serverrevision verwendet. Sichtbar sein müssen die Babylon-Szene und die aus der Snapshot-Bridge abgeleiteten Minimap-Marker. Sobald der Snapshot lineage-`worldSurface.groups` und koordinierte `points` liefert, müssen die read-only Babylon-Objekte im Weltpfad sichtbar sein. Gruppen ohne servergelieferte Mitgliedskoordinate bleiben absichtlich unsichtbar; ein lokaler Ersatzanker ist nicht zulässig.

## Readback-Protokoll

Der Lauf speichert für 2D und 3D jeweils die folgenden Werte in einer evidenzfähigen Textdatei ohne Tokens, Cookies oder personenbezogene Daten:

| Feld | Quelle | Zweck |
|---|---|---|
| Git-Revision | getesteter Server-/Client-Head | Bindet die Evidence an einen unveränderten Stand |
| `serverTick` | Snapshot-Antwort | Ordnet Darstellung einer autoritativen Simulationstaktung zu |
| `revisionHash` | Snapshot-Antwort | Bindet Client-Faktensatz an Serverrevision |
| `sourceEvidence` | Snapshot-Antwort | Zeigt, welcher reale Serverprovider die Fakten geliefert hat |
| `worldSurface.tick`, Gruppen- und Punktzahl | Snapshot-Antwort | Prüft denselben worldSurface-Faktensatz in beiden Clients |
| POI-, Ressourcen- und Camp-NPC-Zahl | Snapshot-Antwort und sichtbare Projektion | Prüft Discovery-Parität ohne Identitätsgleichheit der Darstellung |

Die Screenshot-Zeitpunkte müssen höchstens einen Polling-Zyklus vom protokollierten Snapshot entfernt liegen. Abweichende Icons, Farben oder 2D-/3D-Geometrie sind erlaubt; abweichende Datenquellen, eigene Discovery-Berechnung oder ein vom Snapshot abweichender Faktensatz sind es nicht.

## Aktueller Entscheidungsstatus

Die Unit-, Guard- und Build-Nachweise aus PR #2484 sind vorhanden. Authentifizierte Browser-Sessions und serverseitige Snapshot-Readbacks stehen in der aktuellen Arbeitsumgebung nicht bereit. Deshalb lautet der Status **build-only**; die Issue-Abnahme darf erst nach den oben beschriebenen realen Runtime-Nachweisen erfolgen.
