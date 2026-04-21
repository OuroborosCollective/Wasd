#!/usr/bin/env bash
# =============================================================================
# Fix: Expose Supabase Postgres port 5432 to host (for Wasd outside Docker)
# Run on VPS as root AFTER Supabase docker-compose is running.
#
# This patches the docker-compose.yml to add port mapping 127.0.0.1:5432:5432
# so Wasd (Node.js on host) can connect to Postgres.
#
# Usage: bash expose-pg-port.sh [/path/to/docker-compose.yml]
# =============================================================================

set -euo pipefail

# Auto-detect compose file
COMPOSE_FILE="${1:-}"
if [ -z "$COMPOSE_FILE" ]; then
  for candidate in \
    /opt/supabase/docker-compose.yml \
    /opt/supabase/docker-compose.yaml \
    /opt/supabase/compose.yml \
    /opt/supabase/compose.yaml \
    ~/supabase/docker-compose.yml \
    ~/supabase/docker-compose.yaml; do
    if [ -f "$candidate" ]; then
      COMPOSE_FILE="$candidate"
      break
    fi
  done
fi

if [ -z "$COMPOSE_FILE" ]; then
  echo "ERROR: Cannot find Supabase docker-compose file."
  echo "Usage: $0 /path/to/docker-compose.yml"
  echo ""
  echo "Search for it: find / -name 'docker-compose*' 2>/dev/null | grep -i supa"
  exit 1
fi

echo "Using compose file: $COMPOSE_FILE"

# Check if port 5432 is already mapped for db service
if grep -A20 '^[[:space:]]*db:' "$COMPOSE_FILE" | grep -q '5432:5432\|127.0.0.1:5432:5432'; then
  echo "Port 5432 already mapped. Nothing to do."
  exit 0
fi

# Backup
cp "$COMPOSE_FILE" "${COMPOSE_FILE}.bak.$(date +%s)"
echo "Backup created: ${COMPOSE_FILE}.bak.*"

# Add port mapping under the db service
# Strategy: find the 'db:' service section, look for 'ports:' or add it
if grep -A20 '^[[:space:]]*db:' "$COMPOSE_FILE" | grep -q '^[[:space:]]*ports:'; then
  # ports: section exists, add the mapping
  # Find the line number of 'ports:' under 'db:'
  DB_LINE=$(grep -n '^[[:space:]]*db:' "$COMPOSE_FILE" | head -1 | cut -d: -f1)
  PORTS_LINE=$(tail -n +$DB_LINE "$COMPOSE_FILE" | grep -n '^[[:space:]]*ports:' | head -1 | cut -d: -f1)
  INSERT_AT=$((DB_LINE + PORTS_LINE))
  
  sed -i "${INSERT_AT}a\\      - \"127.0.0.1:5432:5432\"" "$COMPOSE_FILE"
  echo "Added port mapping to existing 'ports:' section"
else
  # No ports section, add one
  DB_LINE=$(grep -n '^[[:space:]]*db:' "$COMPOSE_FILE" | head -1 | cut -d: -f1)
  
  # Find the next line after db: that's at same or lesser indentation (next service or top level)
  TOTAL_LINES=$(wc -l < "$COMPOSE_FILE")
  NEXT_SERVICE_LINE=$TOTAL_LINES
  for i in $(seq $((DB_LINE + 1)) $TOTAL_LINES); do
    LINE=$(sed -n "${i}p" "$COMPOSE_FILE")
    # Check if this line starts a new service (not indented more than db:)
    if echo "$LINE" | grep -qE '^[a-zA-Z]'; then
      NEXT_SERVICE_LINE=$i
      break
    fi
  done
  
  # Insert ports before next service (or at end)
  INSERT_AT=$((NEXT_SERVICE_LINE - 1))
  # Find last non-empty line of db service
  while [ $INSERT_AT -gt $DB_LINE ] && [ -z "$(sed -n "${INSERT_AT}p" "$COMPOSE_FILE" | tr -d '[:space:]')" ]; do
    INSERT_AT=$((INSERT_AT - 1))
  done
  
  sed -i "${INSERT_AT}a\\    ports:\\n      - \"127.0.0.1:5432:5432\"" "$COMPOSE_FILE"
  echo "Added 'ports:' section with mapping"
fi

echo ""
echo "Done! Restart Supabase to apply:"
echo "  cd $(dirname $COMPOSE_FILE) && docker compose down && docker compose up -d"
echo ""
echo "Then verify:"
echo "  python3 -c \"import socket; s=socket.socket(); s.settimeout(3); print('open' if s.connect_ex(('127.0.0.1',5432))==0 else 'closed')\""
