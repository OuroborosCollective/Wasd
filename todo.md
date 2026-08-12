# Arelorian WASD – Issue-Arbeitsliste

- [x] #2256: Den kanonischen LootDirector mit persistenter Inventory-Origin-Deduplizierung verbinden und den autoritativen Defeat→Delta→Inventory→Restart-Replay-Pfad mit einer echten In-Memory-Domain-Persistenz testen.
- [x] Die bestehende LootCanonicalization-Integration so korrigieren, dass sie die im echten LootDirector fest definierte rollHash-/UID-Sortierung abbildet.
- [x] Die Snapshot-Bridge-Testannahme auf den ehrlichen `empty`-Status für eine inhaltsleere, aber valide Serverantwort korrigieren.
