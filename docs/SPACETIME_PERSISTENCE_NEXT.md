# SpacetimeDB — nächste Schritte (Persistenz)

Aktuell: `PERSISTENCE_DRIVER=spacetime` nutzt optional **JSON-File-Fallback** für Spieler (`SPACETIME_PERSIST_FILE_FALLBACK`), HTTP-Schema-Probe in `spacetimePersistenceBackend.ts`. Echte Tabellen-Sync fehlt.

## Empfohlene Reihenfolge

1. **Rust-Modul** — Im Repo ist in **`spacetimedb-modules/areloria-glb`** bereits eine Tabelle **`player_row`** (`uid` PK, `json`, `updated_at_ms`) neben `glb_link`. Nach `spacetime publish` kann der Server per SQL lesen/schreiben; Reducers für saubere Auth können folgen.

2. **Server**
   - In `SpacetimePersistenceBackend`: nach init `save`/`load` über HTTP SQL API oder WebSocket-Client (offizielles SDK), statt nur File-Fallback.
   - Env: `SPACETIME_DB_URL`, `SPACETIME_MODULE_NAME`, optional `SPACETIME_TOKEN`.

3. **Migration**
   - Einmaliger Export aus `players.json` → INSERTs in Spacetime.
   - Feature-Flag: solange `SPACETIME_PERSIST_FILE_FALLBACK=1`, duale Schreibweise möglich.

4. **GLB-Links**
   - Bereits Pfad über `glb_link`-Tabelle + `GlbLinksSpacetimeBackend`; Persistenz der **Spieler** ist der nächste größere Block.

5. **Betrieb**
   - Backup-Strategie für Spacetime-Instanz dokumentieren; Health-Check optional um DB-Latenz erweitern.

Referenz: `server/src/modules/spacetime/`, `spacetimedb-modules/areloria-glb/README.md`.

## Beispiel-SQL (HTTP API), sobald Tabelle existiert

```sql
-- Illustration only — Spalten an euer Modul anpassen
SELECT * FROM player_snapshot WHERE uid = '...';
```

Reducers im Rust-Modul ersetzen ad-hoc-SQL für Produktion.
