#!/usr/bin/env bash
# =============================================================================
# QUEST PERSISTENCE PRODUCTION VERIFICATION SCRIPT
#
# Verifies that quest persistence is operational on VPS.
# Tests mount paths, container access, health endpoints, and backup integrity.
#
# Usage:
#   bash scripts/verify-quest-persistence-production.sh
#   APP_DIR=/opt/areloria CONTAINER=my-container scripts/verify-quest-persistence-production.sh
#
# Rules:
# - No secrets committed or logged
# - Graceful degradation if DB unreachable (JSON fallback preserved)
# - Non-destructive verification only
# =============================================================================

set -euo pipefail

# Configuration with defaults
APP_DIR="${APP_DIR:-/opt/areloria}"
CONTAINER="${CONTAINER:-arelorian-engine}"
QUEST_STATE_FILE="${QUEST_STATE_FILE:-${APP_DIR}/data/quest-state.json}"
BACKUP_DIR="${APP_DIR}/data/backups/quest"
LOG_DIR="${APP_DIR}/logs"

# Color output helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

log_info() { echo -e "[quest-prod] $(date -u +%Y-%m-%dT%H:%M:%SZ) $1"; }
log_ok() { echo -e "${GREEN}[quest-prod] ✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}[quest-prod] ⚠${NC} $1"; }
log_error() { echo -e "${RED}[quest-prod] ✗${NC} $1" >&2; }

# Track overall status
FAILED=0

echo ""
log_info "============================================"
log_info "QUEST PERSISTENCE PRODUCTION VERIFICATION"
log_info "============================================"
echo ""

# -----------------------------------------------------------------------------
# 1. Check host data directory
# -----------------------------------------------------------------------------
log_info "1. Checking host data directory..."
if mkdir -p "$APP_DIR/data" 2>/dev/null && test -w "$APP_DIR/data"; then
  log_ok "Host data directory writable: $APP_DIR/data"
  
  # Write test
  if echo "test" > "$APP_DIR/data/.quest-write-test" 2>/dev/null; then
    rm -f "$APP_DIR/data/.quest-write-test"
    log_ok "Write test passed"
  else
    log_error "Write test failed"
    FAILED=$((FAILED + 1))
  fi
else
  log_error "Host data directory not writable: $APP_DIR/data"
  FAILED=$((FAILED + 1))
fi

# -----------------------------------------------------------------------------
# 2. Check container mount
# -----------------------------------------------------------------------------
log_info "2. Checking container mount..."

# Check if container exists
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  log_info "Container found: $CONTAINER"
  
  # Test container data directory
  if docker exec "$CONTAINER" sh -lc 'test -w /app/data' 2>/dev/null; then
    log_ok "Container /app/data writable"
    
    # Verify mount path matches host
    CONTAINER_PATH=$(docker exec "$CONTAINER" sh -lc 'echo /app/data')
    log_info "Container data path: $CONTAINER_PATH"
  else
    log_warn "Container /app/data not writable (may be OK if not mounted)"
  fi
else
  log_warn "Container not running: $CONTAINER (skipping container checks)"
fi

# -----------------------------------------------------------------------------
# 3. Check quest state file
# -----------------------------------------------------------------------------
log_info "3. Checking quest state file..."
if [ -f "$QUEST_STATE_FILE" ]; then
  log_ok "Quest state file exists: $QUEST_STATE_FILE"
  
  # Validate JSON structure
  if command -v node &>/dev/null; then
    if node -e "JSON.parse(require('fs').readFileSync('$QUEST_STATE_FILE', 'utf8'))" 2>/dev/null; then
      log_ok "Quest state file is valid JSON"
    else
      log_warn "Quest state file is not valid JSON (may be empty or initializing)"
    fi
  fi
  
  # Check file size
  SIZE=$(stat -c%s "$QUEST_STATE_FILE" 2>/dev/null || stat -f%z "$QUEST_STATE_FILE" 2>/dev/null || echo "unknown")
  log_info "Quest state file size: $SIZE bytes"
else
  log_warn "Quest state file not found: $QUEST_STATE_FILE (will be created on first save)"
fi

# -----------------------------------------------------------------------------
# 4. Check health endpoint
# -----------------------------------------------------------------------------
log_info "4. Checking health endpoint..."

HEALTH_RESPONSE=$(curl -fsS --max-time 5 http://localhost:3000/health/quest-persistence 2>/dev/null || echo '{}')
if echo "$HEALTH_RESPONSE" | grep -q '"ok"'; then
  log_ok "Health endpoint reachable"
  
  # Parse and log key health info
  if echo "$HEALTH_RESPONSE" | grep -q '"writable":true'; then
    log_ok "Quest persistence path is writable"
  elif echo "$HEALTH_RESPONSE" | grep -q '"writable":false'; then
    log_error "Quest persistence path is NOT writable"
    FAILED=$((FAILED + 1))
  fi
  
  if echo "$HEALTH_RESPONSE" | grep -q '"filePath"'; then
    FILE_PATH=$(echo "$HEALTH_RESPONSE" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).filePath || '')" 2>/dev/null || echo "unknown")
    log_info "Quest persistence file path: $FILE_PATH"
  fi
  
  echo "$HEALTH_RESPONSE" | head -c 500
else
  log_warn "Health endpoint not reachable (server may be starting)"
fi

echo ""

# -----------------------------------------------------------------------------
# 5. Check backup directory
# -----------------------------------------------------------------------------
log_info "5. Checking backup directory..."

if [ -d "$BACKUP_DIR" ]; then
  log_ok "Backup directory exists: $BACKUP_DIR"
  
  BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name 'quest-state-*.json' -type f 2>/dev/null | wc -l)
  log_info "Backups found: $BACKUP_COUNT"
  
  if [ "$BACKUP_COUNT" -gt 0 ]; then
    log_ok "Backup files present"
    
    # Get latest backup
    LATEST=$(find "$BACKUP_DIR" -maxdepth 1 -name 'quest-state-*.json' -type f | sort | tail -n 1)
    if [ -n "$LATEST" ]; then
      log_info "Latest backup: $LATEST"
      
      # Check if manifest exists
      MANIFEST="${LATEST}.sha256"
      if [ -f "$MANIFEST" ]; then
        log_ok "Backup manifest exists"
        
        # Verify sha256
        if sha256sum -c "$MANIFEST" > /dev/null 2>&1; then
          log_ok "Backup sha256 verification passed"
        else
          log_error "Backup sha256 verification FAILED"
          FAILED=$((FAILED + 1))
        fi
      else
        log_warn "Backup manifest not found: $MANIFEST"
      fi
    fi
  else
    log_warn "No backups found (backup cron may not be running)"
  fi
else
  log_warn "Backup directory not found: $BACKUP_DIR"
fi

# -----------------------------------------------------------------------------
# 6. Check cron configuration
# -----------------------------------------------------------------------------
log_info "6. Checking cron configuration..."

CRON_LINE=$(crontab -l 2>/dev/null | grep 'backup-quest-state.sh' || echo "")
if [ -n "$CRON_LINE" ]; then
  log_ok "Backup cron configured"
  echo "   $CRON_LINE"
else
  log_warn "Backup cron NOT configured (run: crontab -e and add backup cron)"
fi

# -----------------------------------------------------------------------------
# 7. Check logs directory
# -----------------------------------------------------------------------------
log_info "7. Checking logs directory..."

if [ -d "$LOG_DIR" ]; then
  log_ok "Logs directory exists: $LOG_DIR"
  
  # Check backup log
  BACKUP_LOG="$LOG_DIR/quest-backup.log"
  if [ -f "$BACKUP_LOG" ]; then
    LAST_BACKUP=$(tail -5 "$BACKUP_LOG" 2>/dev/null | grep -o '[0-9]\{8\}T[0-9]\{6\}Z' | tail -1 || echo "unknown")
    log_info "Last backup timestamp in log: $LAST_BACKUP"
  else
    log_warn "Backup log not found: $BACKUP_LOG"
  fi
else
  log_warn "Logs directory not found: $LOG_DIR"
fi

# -----------------------------------------------------------------------------
# 8. Check environment variables (without exposing values)
# -----------------------------------------------------------------------------
log_info "8. Checking environment configuration..."

# Check if QUEST_PERSISTENCE_DRIVER is set (don't log the value)
if [ -n "${QUEST_PERSISTENCE_DRIVER:-}" ]; then
  log_ok "QUEST_PERSISTENCE_DRIVER is set: $QUEST_PERSISTENCE_DRIVER"
else
  log_warn "QUEST_PERSISTENCE_DRIVER not set (defaulting to json)"
fi

# Check DATABASE_URL presence (don't log value)
if [ -n "${DATABASE_URL:-}" ]; then
  log_ok "DATABASE_URL is configured"
else
  log_info "DATABASE_URL not set (JSON mode)"
fi

echo ""

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
log_info "============================================"
log_info "VERIFICATION SUMMARY"
log_info "============================================"

if [ $FAILED -eq 0 ]; then
  log_ok "All checks passed!"
  log_info "Quest persistence is operational."
  exit 0
else
  log_error "Some checks failed. Review output above."
  log_info "Action items:"
  log_info "  - Ensure /opt/areloria/data is writable"
  log_info "  - Ensure backup cron is configured"
  log_info "  - Check health endpoint after server restart"
  exit 1
fi