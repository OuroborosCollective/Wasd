#!/bin/bash

# Supabase Backup Script
# Exportiert Schema und Daten getrennt, validiert die Ergebnisse.

set -e

# Konfiguration (Sollte über Umgebungsvariablen gesetzt werden)
# DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DB_NAME]"
# BACKUP_DIR="./backups"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CURRENT_BACKUP_DIR="${BACKUP_DIR}/${TIMESTAMP}"
SCHEMA_FILE="${CURRENT_BACKUP_DIR}/schema.sql"
DATA_FILE="${CURRENT_BACKUP_DIR}/data.sql"

echo "Starte Backup: ${TIMESTAMP}"

# 1. Verzeichnis erstellen
mkdir -p "${CURRENT_BACKUP_DIR}"

# Fehlerbehandlung
error_exit() {
    echo "FEHLER: $1"
    # Hier könnte eine Benachrichtigung (z.B. Webhook) erfolgen
    exit 1
}

# 2. Schema exportieren
echo "Exportiere Schema..."
pg_dump "${DB_URL}" --schema-only --no-owner --no-privileges > "${SCHEMA_FILE}" || error_exit "Schema-Export fehlgeschlagen"

# 3. Daten exportieren
echo "Exportiere Daten..."
pg_dump "${DB_URL}" --data-only --no-owner --no-privileges --exclude-table=schema_migrations > "${DATA_FILE}" || error_exit "Daten-Export fehlgeschlagen"

# 4. Verifikation
echo "Starte Verifikation..."

if [ ! -f "${SCHEMA_FILE}" ]; then
    error_exit "Schema-Datei wurde nicht erstellt"
fi

if [ ! -f "${DATA_FILE}" ]; then
    error_exit "Daten-Datei wurde nicht erstellt"
fi

SCHEMA_SIZE=$(stat -c%s "${SCHEMA_FILE}")
DATA_SIZE=$(stat -c%s "${DATA_FILE}")

if [ "$SCHEMA_SIZE" -le 0 ]; then
    error_exit "Schema-Datei ist leer"
fi

if [ "$DATA_SIZE" -le 0 ]; then
    error_exit "Daten-Datei ist leer"
fi

echo "Backup erfolgreich abgeschlossen und validiert."
echo "Ort: ${CURRENT_BACKUP_DIR}"
echo "Schema Größe: ${SCHEMA_SIZE} Bytes"
echo "Daten Größe: ${DATA_SIZE} Bytes"

