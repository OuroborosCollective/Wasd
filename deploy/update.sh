#!/bin/bash
set -euo pipefail

APP_DIR="/opt/areloria"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
GAME_PORT="${GAME_PORT:-3001}"
BUILD_NODE_OPTIONS="${BUILD_NODE_OPTIONS:---max-old-space-size=1024}"
SERVER_BUILD_NODE_OPTIONS="${SERVER_BUILD_NODE_OPTIONS:---max-old-space-size=1024}"

echo "Updating Areloria MMORPG..."
cd "$APP_DIR"

echo "Synchronizing repository to origin/${DEPLOY_BRANCH} ..."
git fetch --no-tags origin "refs/heads/${DEPLOY_BRANCH}"
git reset --hard FETCH_HEAD
git clean -fd \
  -e .env \
  -e .env.local \
  -e logs/ \
  -e uploads/ \
  -e storage/ \
  -e data/ \
  -e node_modules/ \
  -e client/node_modules/ \
  -e server/node_modules/

echo "Deploy commit: $(git rev-parse --short HEAD)"

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

# Supabase may own port 3000 on the VPS. Keep the game on 3001 unless overridden.
export NODE_ENV=production
export PORT="$GAME_PORT"
export HOST="0.0.0.0"
echo "Game server will listen on PORT=${PORT}; Supabase can keep port 3000."

if command -v corepack >/dev/null 2>&1; then
  corepack enable || true
  corepack prepare pnpm@9.12.2 --activate || true
fi

if command -v pnpm >/dev/null 2>&1; then
  echo "Using pnpm for installation and targeted build..."
  pnpm config set network-concurrency 2
  pnpm config set child-concurrency 1
  pnpm install --no-frozen-lockfile --prefer-offline

  echo "Building shared package and game server..."
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm --filter @wasd/shared --if-present build
  NODE_OPTIONS="$SERVER_BUILD_NODE_OPTIONS" pnpm --filter @wasd/server --if-present build

  echo "Building browser frontends for /, /3d/, /2d/ and /portal/..."
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm --filter @wasd/client --if-present build
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm --filter @wasd/client-2d --if-present build
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm --filter @wasd/portal --if-present build
else
  echo "ERROR: pnpm is required for this monorepo deploy."
  exit 1
fi

pm2 restart areloria --update-env || pm2 start server/dist/index.js --name areloria --update-env

verify_url() {
  local url="$1"
  local name="$2"
  local attempts="${3:-40}"
  local wait_sec=5
  local code=""

  for i in $(seq 1 "$attempts"); do
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

warn_url() {
  local url="$1"
  local name="$2"
  if verify_url "$url" "$name" 3; then
    return 0
  fi
  echo "⚠️ ${name} did not return 200. Continuing because this endpoint is diagnostic only."
  pm2 logs areloria --lines 40 --nostream || true
  return 0
}

warn_url "http://127.0.0.1:${GAME_PORT}/health" "Health endpoint"
verify_url "http://127.0.0.1:${GAME_PORT}/" "Client root"
verify_url "http://127.0.0.1:${GAME_PORT}/2d/" "2D client"
verify_url "http://127.0.0.1:${GAME_PORT}/3d/" "3D client"
verify_url "http://127.0.0.1:${GAME_PORT}/portal/" "Portal client"

echo "Update complete!"
pm2 status
