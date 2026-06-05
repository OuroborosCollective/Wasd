#!/usr/bin/env bash
# =============================================================================
# QUEST STATE BACKUP SCRIPT
# 
# Creates timestamped, sha256-verified backups of quest state.
# Implements rotation to prevent unbounded disk growth.
#
# Usage:
#   APP_DIR=/opt/areloria scripts/backup-quest-state.sh
#   QUEST_STATE_FILE=/custom/path/scripts/backup-quest-state.sh
#   QUEST_BACKUP_KEEP=48 scripts/backup-quest-state.sh
#
# Rules:
# - Never commit backups to git
# - Never restore destructively without explicit operator confirmation
# - Keep at least 24 backups (configurable via QUEST_BACKUP_KEEP)
# - Verify sha256 before restore
# - Backups contain gameplay state, not secrets
# =============================================================================

set -euo pipefail

# Configuration with defaults
APP_DIR="${APP_DIR:-/opt/areloria}"
QUEST_STATE_FILE="${QUEST_STATE_FILE:-${APP_DIR}/data/quest-state.json}"
BACKUP_DIR="${QUEST_BACKUP_DIR:-${APP_DIR}/data/backups/quest}"
KEEP="${QUEST_BACKUP_KEEP:-24}"

# Color output helpers (no colors in production log files)
log_info() { echo "[quest-backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) $1"; }
log_error() { echo "[quest-backup] ERROR: $1" >&2; }

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Check if quest state file exists
if [ ! -f "$QUEST_STATE_FILE" ]; then
  log_info "no quest state file found: $QUEST_STATE_FILE"
  log_info "nothing to backup"
  exit 0
fi

# Generate timestamp
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="${BACKUP_DIR}/quest-state-${STAMP}.json"
MANIFEST_FILE="${BACKUP_FILE}.sha256"

# Copy quest state to backup
cp "$QUEST_STATE_FILE" "$BACKUP_FILE"

# Create sha256 manifest
sha256sum "$BACKUP_FILE" > "$MANIFEST_FILE"

log_info "wrote backup: $BACKUP_FILE"
log_info "wrote manifest: $MANIFEST_FILE"

# Verify the backup was written correctly
if [ ! -f "$BACKUP_FILE" ]; then
  log_error "backup file was not created"
  exit 1
fi

if [ ! -f "$MANIFEST_FILE" ]; then
  log_error "manifest file was not created"
  exit 1
fi

# Verify sha256 matches
if ! sha256sum -c "$MANIFEST_FILE" > /dev/null 2>&1; then
  log_error "sha256 verification failed for $BACKUP_FILE"
  exit 1
fi

log_info "backup verified successfully"

# Rotation: keep newest N json files and their sha256 manifests
# Find old backups (excluding current backup)
mapfile -t OLD_BACKUPS < <(find "$BACKUP_DIR" -maxdepth 1 -name 'quest-state-*.json' -type f ! -name "$(basename "$BACKUP_FILE")" | sort -r | tail -n +"$((KEEP + 1))")

if [ ${#OLD_BACKUPS[@]} -eq 0 ]; then
  log_info "no old backups to rotate"
else
  for old in "${OLD_BACKUPS[@]}"; do
    rm -f "$old" "${old}.sha256" 2>/dev/null || true
    log_info "removed old backup: $old"
  done
fi

# Report backup statistics
BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name 'quest-state-*.json' -type f | wc -l)
log_info "total backups: $BACKUP_COUNT (keeping newest $KEEP)"

exit 0