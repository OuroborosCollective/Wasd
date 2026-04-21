# Supabase Restore Guide

Diese Dokumentation beschreibt den Prozess zur Wiederherstellung der Datenbank aus den automatisierten Backups.

## Backup-Struktur
Backups werden im Ordner `/backups/[ZEITSTEMPEL]/` gespeichert:
- `schema.sql`: Das reine Datenbank-Schema (Tabellen, Typen, Funktionen).
- `data.sql`: Die reinen Tabellendaten.

## Wiederherstellungsschritte

### 1. Vorbereitung
Stellen Sie sicher, dass Sie Zugriff auf die Ziel-Datenbank haben und die `DB_URL` bereitliegt.
Format: `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DB_NAME]`

### 2. Schema wiederherstellen
Zuerst muss das Schema eingespielt werden. **Achtung:** Dies sollte auf einer leeren Datenbank oder nach einem Drop des `public`-Schemas erfolgen.

```bash
psql "[DB_URL]" -f backups/[TIMESTAMP]/schema.sql
```

### 3. Daten wiederherstellen
Nachdem das Schema existiert, können die Daten importiert werden.

```bash
psql "[DB_URL]" -f backups/[TIMESTAMP]/data.sql
```

## Restore-Test (Staging)
Es wird empfohlen, den Restore regelmäßig in einer separaten Staging-Umgebung zu testen:
1. Erstellen Sie ein neues Supabase-Projekt.
2. Führen Sie die oben genannten Schritte aus.
3. Verifizieren Sie die Integrität der Daten über das Supabase Studio.

## Fehlerbehebung
- **Foreign Key Constraints:** Wenn der Datenimport wegen Constraints fehlschlägt, kann es helfen, die Constraints temporär zu deaktivieren (nur für Fortgeschrittene empfohlen).
- **Berechtigungen:** Stellen Sie sicher, dass der ausführende User (meist `postgres`) ausreichende Rechte hat.
