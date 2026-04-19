#!/bin/bash
# Quick update script - pulls latest code and rebuilds
set -e

APP_DIR="/opt/areloria"
BUILD_NODE_OPTIONS="${BUILD_NODE_OPTIONS:---max-old-space-size=8192}"
SERVER_BUILD_NODE_OPTIONS="${SERVER_BUILD_NODE_OPTIONS:---max-old-space-size=8192}"
echo "Updating Areloria MMORPG..."

cd "$APP_DIR"
git pull origin main

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
  local attempts=10
  local wait_sec=3
  local code=""

  for i in $(seq 1 "$attempts"); do
    code="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
    if [ "$code" = "200" ]; then
      echo "${name} OK (${url})"
      return 0
    fi
    echo "${name} not ready (${url}) [attempt ${i}/${attempts}] status=${code:-n/a}"
    sleep "$wait_sec"
  done

  echo "${name} failed after ${attempts} attempts (${url}), last status=${code:-n/a}"
  return 1
}

verify_url "http://127.0.0.1:3000/health" "Health endpoint"
verify_url "http://127.0.0.1:3000/" "Client root"

echo "Update complete!"
pm2 status
