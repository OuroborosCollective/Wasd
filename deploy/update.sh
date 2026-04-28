#!/bin/bash
# Quick update script - pulls latest code and rebuilds
set -e

APP_DIR="/opt/areloria"
BUILD_NODE_OPTIONS="${BUILD_NODE_OPTIONS:---max-old-space-size=8192}"
SERVER_BUILD_NODE_OPTIONS="${SERVER_BUILD_NODE_OPTIONS:---max-old-space-size=8192}"
echo "Updating Areloria MMORPG..."

cd "$APP_DIR"
git pull origin main

# ── Load .env so VITE_* vars are available at build time ──
# Vite bakes VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY into the client JS
# at BUILD time.  Without this, the client gets empty strings and login breaks.
ENV_FILE="$APP_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  echo "Loading build-time env from $ENV_FILE ..."
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  echo "  VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-(empty!)}"
  echo "  VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:+***set***}"
else
  echo "WARNING: $ENV_FILE not found — VITE_* build vars may be empty!"
fi

# Rebuild using pnpm (workspace aware)
cd "$APP_DIR"
if command -v pnpm >/dev/null 2>&1; then
  echo "Using pnpm for installation and build..."
  pnpm install --no-frozen-lockfile
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm run build
else
  echo "pnpm not found, falling back to npm..."
  cd "$APP_DIR/client"
  npm install
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" npm run build
  cd "$APP_DIR/server"
  npm install
  NODE_OPTIONS="$SERVER_BUILD_NODE_OPTIONS" npm run build
fi

# Restart PM2
pm2 restart areloria

# Post-update verification
verify_url() {
  local url="$1"
  local name="$2"
  local attempts=40
  local wait_sec=5
  local code=""

  for i in $(seq 1 "$attempts"); do
    # Get status code and body (to check for initializing)
    local response
    response=$(curl -s -w "\n%{http_code}" "$url" || echo "offline\n000")
    code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | head -n -1)

    if [ "$code" = "200" ]; then
      echo "✅ ${name} OK (${url})"
      return 0
    fi

    if echo "$body" | grep -q "initializing"; then
       echo "⏳ ${name} initializing (${url}) [attempt ${i}/${attempts}] status=503"
    else
       echo "⏳ ${name} not ready (${url}) [attempt ${i}/${attempts}] status=${code:-n/a}"
    fi
    sleep "$wait_sec"
  done

  echo "❌ ${name} failed after ${attempts} attempts (${url}), last status=${code:-n/a}"
  return 1
}

verify_url "http://127.0.0.1:3000/health" "Health endpoint"
verify_url "http://127.0.0.1:3000/" "Client root"

echo "Update complete!"
pm2 status
