# Issue #2043: Coverage-Matrix für autoritative UI-Mutationsloops

## Geltungsbereich

Die Matrix bezieht sich auf `dad57978d07cd2745db8cc7624dd9baea73dc2af` von `origin/main`. Sie trennt vorhandene Source-/Test-Evidence von noch ausstehenden Laufzeitnachweisen. Ein vorhandener UI-Einstieg oder Unit-Test bedeutet **nicht**, dass ein realer Browser-Full-Loop bereits erfolgreich bestätigt wäre.

## Matrix

| Mutation-Flow | UI-Einstieg | Autoritativer Intent-/Domainpfad | Persistenz / Evidence | Erwartete Folgesnapshot-Evidence | Gegenwärtiger Nachweis |
|---|---|---|---|---|---|
| Movement / Resync / Stale | `client/src/networking/websocketClient.ts` | `server/src/networking/WebSocketServer.ts` und WorldTick | Tick, kanonische Inputs und Manifest-/Hash-Pfade | Korrigierte Position, Tick und Revision nach Resync | Source-Pfad vorhanden; Live-Resync ist in #2458 offen |
| NPC-Interaktion / Dialog | `apps/client-2d/src/main.tsx` | `server/src/modules/dialogue/DialogueDirector.ts` | Serverdialog- und NPC-Runtime | Neue Dialog-/Interaktionsdaten im Gameplay-Snapshot | Source-Pfad vorhanden; Browser-Readback ausstehend |
| Quest akzeptieren / fortschreiben / abschließen | `apps/client-2d/src/game/questActions.ts`, `QuestJournalPanel.tsx` | `server/src/quests/NpcQuestService.ts`, `server/src/modules/quest/QuestEngine.ts` | Quest-Persistenz und Source-Evidence-Tests | Aktualisierte Quest- und Reward-Felder | Unit-/Persistenztests vorhanden; Browser-Full-Loop ausstehend |
| Combat / Defeat / Respawn | 3D-Client-Core und WebSocket-Client | WorldTick / Combat-Domain | Combat-Deltas und History | Lebens-, Ziel- und Respawn-Felder nach bestätigter Mutation | Source-Pfad vorhanden; End-to-End-Slice ausstehend |
| Loot → Inventory / WorldDrop | Inventar-/World-Rendering liest Snapshot | `LootDirector -> ProceduralLootMachine -> loot_delta` | Persistente Loot-Origin-Deduplizierung; getesteter Defeat→Delta→Inventory→Restart-Replay-Pfad in PR #2489 | Inventar- oder serverseitiger WorldDrop-Folgestepp | Server-E2E liegt vor; UI-/Browser-Readback bleibt #2045 |
| Inventory / Equipment / Storage | `InventoryPanel.tsx`, `EquipmentPanel.tsx`, `StorageOverlay.tsx` | `InventoryDirector`, `EquipmentService`, WorldTick-`transfer_item` | Inventar-/Equipment-Tests und Persistenzadapter | Aktualisierte Slots, Equipment und Storage im Snapshot | Source- und Unit-Evidence vorhanden; Browser-Full-Loop ausstehend |
| Gathering / Crafting | `ResourceGatherIntentAdapter`, Client-2D-Module | WorldTick / `CraftingDirector` | Crafting-Transaction-Truth-Test | Ressourcen-, XP- und Output-Item-Felder | Unit-/Transaction-Evidence vorhanden; Browser-Full-Loop ausstehend |
| Vendor / Work Orders | Kein verifizierter Spieler-UI-Einstieg auf diesem SHA | `EconomyService`, `economyRoute.ts` | Wallet-, Inventory- und Vendor-Adapter; Vendor-Replay-Test | Wallet, Vendorbestand und Inventar nach bestätigter Mutation | Server-Evidence vorhanden; UI als **unavailable** behandeln bis ein realer Einstieg belegt ist |

## Verbindliche Interpretation

Die UI darf nur nach einem passenden Folgesnapshot erfolgreich aussehen. Ein fehlender Serverpfad, fehlende Receipt-Evidence oder ein nicht bestätigter Snapshot muss in den jeweiligen Komponenten als `pending`, `stale`, `blocked`, `unavailable` oder `failure` erscheinen. Lokale Inventar-, Loot-, Quest- oder Economy-Ersatzzustände sind keine zulässige Erfolgsquelle.

Für die Abnahme von #2043 fehlen weiterhin mindestens ein authentifizierter Browser-Loop je kritischem Flow sowie ein über denselben Runtime-Stand gebundener Folgesnapshot. Dieser Browser-/Deploy-Nachweis gehört mit in den Full-Loop-Release-Gate #2045.
