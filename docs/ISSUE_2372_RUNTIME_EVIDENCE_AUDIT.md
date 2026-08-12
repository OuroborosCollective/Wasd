# Issue #2372: Audit der bestehenden Runtime-Evidence- und Replay-Pfade

## Umfang und Auditstand

Dieser Audit untersucht **keine neue Event-Sourcing-Architektur**. Er klassifiziert die bereits aktiven WASD-Pfade nach autoritativer Mutation, nachgelagerter Projektion und Observability. Der untersuchte Stand ist `dad57978d07cd2745db8cc7624dd9baea73dc2af` auf Basis von `origin/main`.

Als Pilotpfad dient der reale serverseitige Economy-Kauf. Er nutzt die vorhandenen Inventory-, Wallet- und Vendor-Stock-Services, statt eine parallele Zustandsrepräsentation oder einen Ersatz-Snapshot einzuführen.

## Inventar der relevanten Evidenzpfade

| Baustein | Klassifikation | Ordnungs-/Hash-Vertrag | Persistenz- bzw. Recovery-Grenze |
|---|---|---|---|
| `CombatDeltaStore` | Autoritative Tick-Buffer-Projektion | Sortiert nach `tick`, `sequence`, Angreifer und Verteidiger | Reiner In-Memory-Store; keine Persistenzbehauptung |
| `InventoryStore` mit `InventoryService` | Autoritative Mutation | Stable State-/Movement-Hashes; Origin-UID wird je Spieler dedupliziert | Zustände und Origin-UIDs werden über den konfigurierten Inventaradapter gespeichert und beim Hydrieren wiederhergestellt |
| `WalletService` und `VendorStockService` | Autoritative Mutation | Deterministische Service-Reihenfolge unter Economy-Mutation-Lock | Persistenz über eigene Adapter; Economy kompensiert Teilfehler durch State-Restore |
| `RuntimeHistoryLog` | History-/Receipt-Evidence | Schlüsselstabile Payload-Serialisierung; sequenzbasierter Eintragshash | Reiner In-Memory-Log ohne vorige-Hash-Verkettung; nicht als Restart-Replay-Quelle klassifizieren |
| Gameplay-Snapshot-Route | Read-only Projektion | Liest Inventar als autoritativen Consumer-Zustand | Keine mutierende Wirkung; Snapshot ersetzt keine fehlende Event-Evidence |
| Telemetrie, WebSocket, Playtester | Observability-Side-Channel | Keine autoritative Mutationsquelle | Darf keine Gameplay-Mutation herleiten |

## Reale Pilotkette: Economy-Kauf

Der Kaufpfad in `EconomyService.buyResource(...)` validiert Spieler, Tick, Nähe, Bestand und Wallet vor jeder Mutation. Innerhalb des seriengebenden Mutation-Locks wird zuerst der Vendor-Bestand reduziert, danach die Wallet belastet und anschließend der echte `InventoryService` mit einer deterministisch aus Spieler, Vendor, Item, Menge, Bestand und Tick abgeleiteten `originUid` aufgerufen. Erst nach erfolgreichem Inventar-Consumer schreibt der Pfad einen `RuntimeHistoryLog`-Eintrag und gibt dessen `historyHash` im Receipt zurück.

Falls eine Persistenz- oder Consumer-Operation fehlschlägt, stellt der bestehende Pfad Inventar, Origin-UIDs, Movement-Events, Wallet und Vendor-Bestand wieder her. Die geprüften Tests belegen zugleich, dass fehlende Ticks keine Mutation auslösen und dass Origin-Deduplizierung nach einem Service-Neustart weiterhin greift.

> Der Pilot ist **kein allgemeiner Replay-Beweis**. Seine endgültige Wahrheit liegt in den persistenten Inventar-, Wallet- und Vendor-States; der `RuntimeHistoryLog` ergänzt Receipt-Evidence, ist derzeit aber kein persistenter Hash-Chain-Journal.

## Ausgeführte Evidence-Gates

| Befehl | Ergebnis | Abgedeckter Befund |
|---|---:|---|
| `pnpm exec vitest run server/src/tests/economy/EconomyAtomicity.test.ts server/src/tests/economy/EconomyTickEvidence.test.ts server/src/tests/runtime-history-log.test.ts` | 9 Tests bestanden | Kompensation bei Persistenzfehlern, Tick-Fail-Closed, Origin-Restart-Deduplizierung, stabile History-Key-Serialisierung |

## Konkrete Lücken und Entscheidung

Der `RuntimeHistoryLog` besitzt keinen persistenten Adapter und verkettet Einträge nicht mit dem vorherigen Hash. Damit darf er **nicht** als alleiniger Source-of-Truth-Replay-Stream über einen Prozessneustart hinweg ausgegeben werden. Diese Grenze ist dokumentiert, aber noch nicht durch eine Runtime-Mutation kaschiert.

Der nächste zulässige Schritt für #2372 ist daher **weiter belegen**, nicht eine abstrakte neue Event-Sourcing-Schicht zu bauen. Eine kleine additive Änderung ist erst gerechtfertigt, wenn für einen spezifischen produktiven Consumer ein fehlender persistenter Receipt-/Recovery-Nachweis festgestellt wird. Jede solche Änderung muss den bestehenden Service, dessen Persistenzadapter sowie die aktuelle Snapshot-Projektion weiterverwenden.
