# Arelorian WASD – Issue-Arbeitsliste

- [x] #2070: Den verbindlichen deterministischen Vertrag gegen den aktuellen Main-Callgraph mit Tick, kanonischen Inputs, Read-only-Projektion sowie Hash-/Evidence-Grenze dokumentieren.
- [x] #2093: Einen SHA-gebundenen Current Index der offenen WASD/Areloria-Gates gegen den aktuellen Main-Callgraph erstellen.
- [x] Die Snapshot-Bridge-Testannahme auf `empty` für valide, aber inhaltsleere Serverantworten korrigieren, damit die Vertrags-PR keine Nicht-Live-Evidenz als live deklariert.
- [x] Den fehlenden `EvidenceLayer`-Typimport im Shared-Runtime-Evidence-Test ergänzen, damit der Vertrags-PR gegen den aktuellen Main-Ausgangszustand typgeprüft werden kann.
- [ ] #2466 – Den gemeinsamen 64-Tile-/Kappa-Discovery-Vertrag in aktiven Server-, 2D- und 3D-Pfaden durchsetzen und Replay-/Persistenzgrenzen absichern.
- [ ] #2465 – Das serverautoritativ abgeleitete `WorldOverlayModel` im realen 2D-Entrypoint verwenden und Reachability, Projektion sowie Browser-Smokes belegen.
- [ ] #2464 – Den vorhandenen Overlay-Vertrag im Babylon-3D-Pfad für Minimap und `worldSurface` adapterbasiert integrieren.
- [ ] #2469 – Runtime-Evidence und semantische 2D-/3D-Parität für die integrierten Slices belegen.
- [ ] Weitere offene Gates (#2480, #2372, #2370, #2369, #2256, #2046, #2045, #2044, #2043, #2038) nach ihren dokumentierten Abhängigkeiten analysieren und ohne Ersatzwahrheit bearbeiten.
- [x] Gemeinsamen 64-Tile-/Kappa-Discovery-Vertrag im aktiven WorldDiscoveryService durchsetzen und mit Server-, Shared- sowie Build-Prüfungen belegen.
- [x] Reale 2D-Overlay-Container dauerhaft mounten, damit der Viewport nach dem ersten Snapshot messbar bleibt.
- [x] Servergelieferte `worldSurface`-Punkte und Gruppen über einen read-only Babylon-Adapter in den aktiven 3D-Pfad integrieren.
- [x] #2046: Die tatsächliche Babylon-Projektion mit einer echten Headless-Scene gegen servergelieferte Gruppen, Punkte sowie empty/blocked-Zustände testen.
- [x] #2046: Nichtleere serverautoritäre `worldSurface.groups` und `worldSurface.points` in die ehrliche Overlay-Statusableitung einbeziehen.
- [ ] #2480 bleibt ausgesetzt, bis der im Issue referenzierte Sovereign-Frontend- und Backend-Quellbaum im Repository oder als zugänglicher Mirror bereitsteht.
- [x] #2043: Eine SHA-gebundene Coverage-Matrix für reale UI-Mutationsloops erstellen, vorhandene Snapshot-, Intent-, Domain-, Persistenz- und Folgesnapshotpfade belegen und nur nachgewiesene Lücken in bestehenden Truth-Pfaden schließen.
- [x] Die Snapshot-Bridge-Evidenzannahme auf `empty` für valide, aber inhaltsleere Serverantworten korrigieren, damit CI keinen Nicht-Live-Faktensatz als live ausgibt.
- [x] Den fehlenden `EvidenceLayer`-Typimport in den Runtime-Evidence-Tests beheben, damit der Shared-Truth-Vertrag auch im TypeScript-Gate geprüft wird.
