# Issues #2038 / #2369: schreibgeschützter VPS-Runtime-Audit

## Geltungsbereich

Dieses Dokument hält ausschließlich die während eines schreibgeschützten Audits der tatsächlich laufenden Arelorian-Runtime erhobenen Fakten fest. Es enthält weder Zugangsdaten noch Secret-Werte. Der Audit ist **kein** Deploy-Freigabenachweis: Insbesondere ersetzt er weder einen authentifizierten Gameplay-Loop noch die erforderliche WorldHash-/Replay-Evidence.

## Beobachtete Runtime

| Merkmal | Beobachtung | Einordnung |
|---|---|---|
| Container | `arelorian-engine`, Status `running` | Reale Node-Runtime wurde gefunden. |
| Bildkennung | `sha256:00ffeaefba8d047ded9ddcf49ae5043cf9b5b579a0c34a29cea696b93dfe243e` | Unveränderlicher Container-Image-Bezug für diesen Auditzeitpunkt. |
| Startzeit | `2026-08-12T16:38:53.411771986Z` | Laufzeitbezug, keine Commitbindung. |
| Runtime-Port | `127.0.0.1:3001` | Der Arelorian-Container ist nicht der fremde Host-Port-3000-Dienst. |
| Weltseed | Der Schlüssel `WASD_WORLD_SEED` ist vorhanden. | Der Server verweigert lokal fehlende Seeds fail-closed; der Wert wurde nicht ausgelesen. |
| Persistenz | Health meldet `driver: json`, `degraded: false`, `lastWriteConfirmed: false`. | Kein erfolgreicher Persistenz-Writeback im beobachteten Health-Fenster. |
| Content | Health meldet `mode: legacy`, `root: /app/game-data`. | Der konkrete veröffentlichte Pack-/Manifestnachweis bleibt offen. |

## Endpoint-Readbacks

| Endpunkt | Beobachtung | Schlussfolgerung |
|---|---|---|
| `GET /health` auf Port 3001 | HTTP 200, `ok: true`, aber `worldHash: null` und kein kanonischer Replay-Recorder | Die Runtime ist erreichbar; WorldHash-/Replay-Abnahme ist nicht erbracht. |
| `GET /client-config.json` auf Port 3001 | HTTP 200, `buildHash: dev` | Der produktiv laufende Container ist nicht an einen eindeutigen Git-Commit gebunden. PR #2498 ergänzt diese Bindung. |
| `GET /api/gameplay/snapshot` ohne Identität | HTTP 200, `authenticated: false`, `playerIdentitySource: anonymous`, aber mit `serverTick`, `revisionHash` und `sourceEvidence` | Kein authentifizierter Browser-/Snapshot-Nachweis für #2469; das Ergebnis darf nicht als solcher ausgegeben werden. |
| Öffentlicher `wss://arelorian.de/ws`-Upgrade | HTTP 101 `Switching Protocols` ohne Login-Nachricht oder Intent | Der Upgrade-Pfad ist erreichbar; es wurde keine Gameplay-Mutation ausgelöst. |
| Öffentliche Route `/3d` | Platzhalter `Areloria 3D unavailable` | Blocker für #2046 und #2469. PR #2497 entfernt den Fallback und ergänzt eine Deploy-Readiness-Prüfung. |

## Offene Abnahmegrenzen

Die beobachtete Runtime erlaubt derzeit keine ehrliche Freigabe von #2038, #2369 oder #2469. Es fehlen ein nach Merge erneuerter Container mit gebundenem Commit, ein echter 3D-Clientartefakt-Readback, eine authentifizierte Session gegen diese Revision sowie kanonische WorldHash-/Replay-Evidence. Die in #2497 und #2498 umgesetzten Deploygates sollen einen künftigen Testlauf an den konkreten Commit und an echte 3D-Artefakte binden.
