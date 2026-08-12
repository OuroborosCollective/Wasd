# Arelorian WASD – Issue-Arbeitsliste

- [x] #2372: Den realen JSON-Crafting-Receipt-Pfad auf Hash-Integrität, Rehydrate und korrupten Persistenzinhalt prüfen, ohne einen zweiten Event- oder Replay-Pfad zu erzeugen.
- [x] Den fehlenden `EvidenceLayer`-Typimport im Shared-Runtime-Evidence-Test ergänzen, damit der Crafting-Receipt-PR gegen den aktuellen Main-Ausgangszustand typgeprüft werden kann.
- [x] Die Snapshot-Bridge-Testannahme auf `empty` für valide, aber inhaltsleere Serverantworten korrigieren, damit der autonome Check keine Nicht-Live-Evidenz als live deklariert.
