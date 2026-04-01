# Agent Build Instructions

1. Lies zuerst alle Lock-Dateien.
2. Verändere keine Kernregeln.
3. Baue in der vorgegebenen Reihenfolge.
4. Halte Serverlogik serverseitig.
5. Nutze das Clientgerüst nur für Darstellung.

## Dokumentationspflicht (Pflicht für alle Agenten)

- **Vor größeren Änderungen:** `docs/PROJECT_STATUS_2026.md` und `docs/ROADMAP_TO_RELEASE.md` lesen.
- **Nach merge-würdigen Änderungen:** `docs/PROJECT_STATUS_2026.md` aktualisieren (was sich für Spieler/Deploy ändert).
- **Wenn Release-Backlog sich ändert:** `docs/ROADMAP_TO_RELEASE.md` anpassen (erledigt / neu).
- **Vision** nur in `docs/MASTER_DESIGN_BIBLE.md` ändern, wenn sich das Projektziel wirklich ändert.
- Vollständiger Doc-Katalog: `docs/DOCUMENTATION_INDEX.md`.

## Wichtige Reihenfolge
server core -> world -> observer -> npc -> civilization -> economy -> gameplay -> brain -> assets -> gm editor -> client -> integrations