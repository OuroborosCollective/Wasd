#!/usr/bin/env bash
# =============================================================================
# FIX QUEST DATA PERMISSIONS
#
# Fixes permissions on /opt/areloria/data to be owned by the container user
# instead of world-writable (777).
#
# Usage:
#   bash scripts/fix-quest-data-permissions.sh
#   APP_DIR=/opt/areloria CONTAINER=my-container bash scripts/fix-quest-data-permissions.sh
#
# This script:
# 1. Detects the container's UID/GID
# 2. Sets ownership to container user
# 3. Sets mode to 750 (owner rw, group r-x, no world access)
# 4. Verifies both host and container can write
# =============================================================================

set -euo pipefail

# Configuration with defaults
APP_DIR="${APP_DIR:-/opt/areloria}"
CONTAINER="${CONTAINER:-arelorian-engine}"
DATA_DIR="${QUEST_DATA_DIR:-${APP_DIR}/data}"

# Color output helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_info() { echo -e "[quest-perms] $(date -u +%Y-%m-%dT%H:%M:%SZ) $1"; }
log_ok() { echo -e "${GREEN}[quest-perms] ✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}[quest-perms] ⚠${NC} $1"; }
log_error() { echo -e "${RED}[quest-perms] ✗${NC} $1" >&2; }

echo ""
log_info "============================================"
log_info "FIXING QUEST DATA PERMISSIONS"
log_info "============================================"
echo ""

# Check data directory exists
log_info "Data dir: $DATA_DIR"
if [ ! -d "$DATA_DIR" ]; then
  log_error "Data directory does not exist: $DATA_DIR"
  log_info "Creating directory..."
  mkdir -p "$DATA_DIR"
  log_ok "Directory created"
fi

# Detect container UID/GID
log_info "Detecting container user..."
CONTAINER_UID="$(docker exec "$CONTAINER" sh -lc 'id -u' | tr -d '\r\n')"
CONTAINER_GID="$(docker exec "$CONTAINER" sh -lc 'id -g' | tr -d '\r\n')"
CONTAINER_USER="$(docker exec "$CONTAINER" sh -lc 'whoami' | tr -d '\r\n')"

# Validate UID
if ! echo "$CONTAINER_UID" | grep -Eq '^[0-9]+$'; then
  log_error "Invalid container UID: $CONTAINER_UID"
  exit 1
fi

# Validate GID
if ! echo "$CONTAINER_GID" | grep -Eq '^[0-9]+$'; then
  log_error "Invalid container GID: $CONTAINER_GID"
  exit 1
fi

log_info "Container user: $CONTAINER_USER"
log_info "Container uid:gid = ${CONTAINER_UID}:${CONTAINER_GID}"

# Get current permissions
CURRENT_MODE=$(stat -c '%a' "$DATA_DIR" 2>/dev/null || echo "unknown")
CURRENT_OWNER=$(stat -c '%U:%G' "$DATA_DIR" 2>/dev/null || echo "unknown:unknown")
log_info "Current permissions: $CURRENT_MODE $CURRENT_OWNER"

# Apply new permissions
log_info "Setting ownership to ${CONTAINER_UID}:${CONTAINER_GID}..."
chown -R "${CONTAINER_UID}:${CONTAINER_GID}" "$DATA_DIR"

log_info "Setting mode to 750..."
chmod 750 "$DATA_DIR"

# Verify host permissions
log_info "Verifying host permissions..."
NEW_MODE=$(stat -c '%a' "$DATA_DIR" 2>/dev/null || echo "unknown")
NEW_OWNER=$(stat -c '%U:%G' "$DATA_DIR" 2>/dev/null || echo "unknown:unknown")
log_info "New permissions: $NEW_MODE $NEW_OWNER"

if [ "$NEW_MODE" = "750" ]; then
  log_ok "Mode set to 750 (owner rw, group r-x, no world access)"
else
  log_error "Failed to set mode to 750 (got $NEW_MODE)"
  exit 1
fi

# Verify container write access
log_info "Verifying container write access..."
if docker exec "$CONTAINER" sh -lc 'test -w /app/data && echo container-write-ok' 2>/dev/null | grep -q "container-write-ok"; then
  log_ok "Container can write to /app/data"
else
  log_error "Container cannot write to /app/data"
  log_info "Container mount may be read-only or path mismatch"
  exit 1
fi

# Test write from container
log_info "Testing write from container..."
if docker exec "$CONTAINER" sh -lc 'touch /app/data/.perm-test && rm /app/data/.perm-test' 2>/dev/null; then
  log_ok "Container write test passed"
else
  log_error "Container write test failed"
  exit 1
fi

echo ""
log_ok "Permissions fixed successfully!"
log_info "Summary:"
log_info "  - Owner: $NEW_OWNER (container user)"
log_info "  - Mode: 750 (no world-writable)"
log_info "  - Container write: OK"