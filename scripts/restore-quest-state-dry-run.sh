#!/usr/bin/env bash
# =============================================================================
# QUEST STATE RESTORE DRY-RUN SCRIPT
# 
# Verifies a quest state backup without performing destructive restore.
# Validates sha256 integrity and schema structure.
#
# Usage:
#   scripts/restore-quest-state-dry-run.sh <backup-file>
#   scripts/restore-quest-state-dry-run.sh /opt/areloria/data/backups/quest/quest-state-20240115T120000Z.json
#
# Rules:
# - This script does NOT perform a destructive restore
# - It validates the backup file before any restore operation
# - sha256 verification is required
# - Schema validation ensures backup compatibility
# =============================================================================

set -euo pipefail

BACKUP_FILE="${1:-}"

log_info() { echo "[quest-restore-dry-run] $(date -u +%Y-%m-%dT%H:%M:%SZ) $1"; }
log_error() { echo "[quest-restore-dry-run] ERROR: $1" >&2; }

# Validate arguments
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  echo ""
  echo "Validates a quest state backup without destructive restore."
  echo "Verifies sha256 integrity and schema structure."
  exit 2
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  log_error "backup file not found: $BACKUP_FILE"
  exit 1
fi

# Check if manifest file exists
MANIFEST_FILE="${BACKUP_FILE}.sha256"
if [ ! -f "$MANIFEST_FILE" ]; then
  log_error "manifest file not found: $MANIFEST_FILE"
  log_error "cannot verify backup integrity without sha256 manifest"
  exit 1
fi

# Verify sha256
log_info "verifying sha256 integrity..."
if ! sha256sum -c "$MANIFEST_FILE" > /dev/null 2>&1; then
  log_error "sha256 verification failed for $BACKUP_FILE"
  log_error "backup may be corrupted"
  exit 1
fi
log_info "sha256 verification passed"

# Validate JSON schema using Node.js
log_info "validating quest backup schema..."
node << 'NODEEOF'
const fs = require('node:fs');
const path = process.argv[1];
const file = path;

try {
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);

  // Validate schema structure
  if (!data || typeof data.schemaVersion !== 'number') {
    throw new Error('Invalid backup: missing or invalid schemaVersion');
  }

  if (data.schemaVersion !== 1) {
    throw new Error(`Unsupported schema version: ${data.schemaVersion} (expected 1)`);
  }

  if (!Array.isArray(data.players)) {
    throw new Error('Invalid backup: players must be an array');
  }

  // Validate each player entry
  for (const player of data.players) {
    if (typeof player.playerId !== 'string') {
      throw new Error('Invalid player: missing playerId');
    }

    if (!Array.isArray(player.quests)) {
      throw new Error(`Invalid quests for player ${player.playerId}: must be an array`);
    }

    // Validate each quest
    for (const quest of player.quests) {
      if (typeof quest.id !== 'string') {
        throw new Error(`Invalid quest in ${player.playerId}: missing id`);
      }
    }
  }

  console.log(`[quest-restore-dry-run] Schema validation passed: ${data.players.length} players`);
  process.exit(0);
} catch (error) {
  console.error(`[quest-restore-dry-run] ERROR: ${error.message}`);
  process.exit(1);
}
NODEEOF
"$BACKUP_FILE"

NODE_EXIT=$?

if [ $NODE_EXIT -ne 0 ]; then
  log_error "schema validation failed"
  exit 1
fi

log_info "dry-run validation complete: backup is valid"
log_info "NOTE: This script does NOT perform a destructive restore"
log_info "To restore, use restore-quest-state.sh with --confirm flag"

exit 0