#!/usr/bin/env bash
# Setup script: run on VPS to configure game server for Supabase/Postgres
# Usage: bash /opt/areloria/deploy/setup-supabase-db.sh
set -euo pipefail

APP_DIR="/opt/areloria"
ENV_FILE="$APP_DIR/.env"

# Ensure .env exists
mkdir -p "$APP_DIR"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE" 2>/dev/null || true

# Remove existing key from .env
remove_key() {
  local key="$1"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    local tmp
    tmp="$(mktemp)"
    grep -v "^${key}=" "$ENV_FILE" > "$tmp" && mv "$tmp" "$ENV_FILE"
  fi
}

# Set key=value in .env
set_key() {
  local key="$1"
  local val="$2"
  remove_key "$key"
  printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
}

echo "=== Configuring Supabase/Postgres connection ==="

# --- Database ---
# Direct Postgres on localhost (Supabase stack exposes 5432 to host)
set_key "DATABASE_URL" "postgresql://postgres:Sup3base-1491137-Strong!@127.0.0.1:5432/postgres"
set_key "DATABASE_SSL_DISABLED" "1"
set_key "PERSISTENCE_DRIVER" "auto"

# --- Supabase Auth ---
set_key "SUPABASE_URL" "https://supabase.arelogic.space:8443"
set_key "SUPABASE_PUBLIC_URL" "https://supabase.arelogic.space:8443"
set_key "API_EXTERNAL_URL" "https://supabase.arelogic.space:8443"
# Server-side proxy: use HTTP to avoid self-signed cert issues
set_key "SUPABASE_PROXY_URL" "http://127.0.0.1:8000"
set_key "GAME_ORIGIN" "https://arelogic.space"

set_key "SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsICAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"
set_key "SUPABASE_SERVICE_ROLE_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"
set_key "SUPABASE_JWT_SECRET" "Sup3baseJWTSecret-1491137-LongEnough"

# --- WebSocket Auth ---
set_key "USE_SUPABASE_WS_LOGIN" "1"
set_key "ALLOW_GUEST_LOGIN" "1"
set_key "ALLOW_DEV_LOGIN" "0"

# --- Client Config (served to browser) ---
set_key "VITE_AUTH_PROVIDER" "supabase"
set_key "VITE_SUPABASE_URL" "https://supabase.arelogic.space:8443"
set_key "VITE_SUPABASE_PUBLIC_URL" "https://supabase.arelogic.space:8443"
set_key "VITE_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsICAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"

# --- JWT secret for own tokens ---
set_key "JWT_SECRET" "Sup3baseJWTSecret-1491137-LongEnough"

# --- Site ---
set_key "SITE_URL" "https://arelogic.space"

echo ""
echo "=== .env configured ==="
echo ""
echo "Checking if Postgres is reachable on 127.0.0.1:5432..."
if timeout 3 bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/5432' 2>/dev/null; then
  echo "  -> Postgres port 5432 is OPEN"
else
  echo "  -> WARNING: Cannot connect to 127.0.0.1:5432"
  echo "     If Supabase is in Docker, check that port 5432 is mapped to host:"
  echo "     docker-compose.yml should have:  ports: \"5432:5432\""
  echo "     Or use the Docker host IP instead of 127.0.0.1"
fi

echo ""
echo "Checking if Supabase API is reachable..."
if curl -sk -o /dev/null -w "%{http_code}" "https://supabase.arelogic.space:8443/rest/v1/" --max-time 5 2>/dev/null | grep -q "200\|401\|404"; then
  echo "  -> Supabase REST API is reachable"
else
  echo "  -> WARNING: Cannot reach https://supabase.arelogic.space:8443"
fi

echo ""
echo "Checking Supabase Auth..."
if curl -sk -o /dev/null -w "%{http_code}" "https://supabase.arelogic.space:8443/auth/v1/health" --max-time 5 2>/dev/null | grep -q "200"; then
  echo "  -> Supabase Auth is healthy"
else
  echo "  -> WARNING: Auth health check failed"
fi

echo ""
echo "=== Restarting game server ==="
if command -v pm2 &>/dev/null; then
  pm2 restart areloria 2>/dev/null || pm2 restart all 2>/dev/null || echo "  -> PM2 not running or project not found. Start with: pm2 start ecosystem.config.cjs"
else
  echo "  -> PM2 not found. Restart the game server manually."
fi

echo ""
echo "=== Done ==="
echo "Verify with: curl -s https://arelogic.space/health | python3 -m json.tool"
echo "Look for: persistence.driver=postgres, supabase.configured=true"
