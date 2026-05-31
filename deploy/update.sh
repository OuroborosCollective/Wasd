#!/bin/bash
set -euo pipefail

APP_DIR="/opt/areloria"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
GAME_PORT="${GAME_PORT:-3001}"
BUILD_NODE_OPTIONS="${BUILD_NODE_OPTIONS:---max-old-space-size=8192}"
SERVER_BUILD_NODE_OPTIONS="${SERVER_BUILD_NODE_OPTIONS:---max-old-space-size=8192}"

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

DEPLOY_COMMIT="$(git rev-parse --short=12 HEAD)"
export BUILD_COMMIT_SHA="$DEPLOY_COMMIT"
export VITE_BUILD_COMMIT_SHA="$DEPLOY_COMMIT"
export VITE_UI_BUILD_HASH="$DEPLOY_COMMIT"
echo "Deploy commit: $DEPLOY_COMMIT"

ENV_FILE="$APP_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  echo "Loading build-time env from $ENV_FILE ..."
  set -a
  source "$ENV_FILE"
  set +a
  export BUILD_COMMIT_SHA="$DEPLOY_COMMIT"
  export VITE_BUILD_COMMIT_SHA="$DEPLOY_COMMIT"
  export VITE_UI_BUILD_HASH="$DEPLOY_COMMIT"
  echo "  VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-(empty!)}"
  echo "  VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:+***set***}"
else
  echo "WARNING: $ENV_FILE not found — VITE_* build vars may be empty!"
fi

export NODE_ENV=production
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"
export PORT="$GAME_PORT"
export HOST="0.0.0.0"
export CLIENT_ROOT_DIR="$APP_DIR/client"
echo "Game server will listen on PORT=${PORT}; Supabase can keep port 3000."
echo "Game server will serve CLIENT_ROOT_DIR=${CLIENT_ROOT_DIR}."
echo "NODE_OPTIONS=${NODE_OPTIONS}"

if command -v corepack >/dev/null 2>&1; then
  corepack enable || true
  corepack prepare pnpm@11.5.0 --activate || true
fi

if command -v pnpm >/dev/null 2>&1; then
  echo "Using pnpm for installation and targeted build..."
  pnpm config set network-concurrency 2
  pnpm config set child-concurrency 1
  pnpm install --no-frozen-lockfile --prefer-offline

  echo "Building core-logic runtime, shared package and game server..."
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm --filter @wasd/core-logic --if-present run build:runtime
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm --filter @wasd/shared --if-present build
  NODE_OPTIONS="$SERVER_BUILD_NODE_OPTIONS" pnpm --filter @wasd/server --if-present build

  echo "Building browser frontends for /3d/, /2d/ and /portal/..."
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm --filter @wasd/client --if-present build || true
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm --filter @wasd/client-2d --if-present build
  VITE_BASE_PATH="/portal/" NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm --filter @wasd/portal --if-present build
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm --filter @wasd/web --if-present build || true
else
  echo "ERROR: pnpm is required for this monorepo deploy."
  exit 1
fi

echo "Assembling browser route folders under Express webroot..."
test -f client/dist/index.html || { echo "ERROR: client/dist/index.html missing after @wasd/client build"; exit 1; }
test -f apps/client-2d/dist/index.html || { echo "ERROR: apps/client-2d/dist/index.html missing after @wasd/client-2d build"; exit 1; }
test -f portal/dist/index.html || { echo "ERROR: portal/dist/index.html missing after @wasd/portal build"; exit 1; }

rm -rf client/dist/2d client/dist/portal
mkdir -p client/dist/2d client/dist/portal
cp -a apps/client-2d/dist/. client/dist/2d/
cp -a portal/dist/. client/dist/portal/

echo "Writing Cyber-Zen root landing and portal hub entrypoints..."
NODE_OPTIONS="$BUILD_NODE_OPTIONS" node scripts/write-runtime-entrypoints.mjs

test -f client/dist/index.html || { echo "ERROR: client/dist/index.html missing after runtime entrypoints"; exit 1; }
test -f client/dist/portal/index.html || { echo "ERROR: client/dist/portal/index.html missing after runtime entrypoints"; exit 1; }
grep -q 'LIVE_ENTRYPOINTS' client/dist/index.html || { echo "ERROR: client/dist/index.html is not the Cyber-Zen landing page"; exit 1; }
grep -q 'PORTAL ONLINE' client/dist/portal/index.html || { echo "ERROR: client/dist/portal/index.html is not the portal hub"; exit 1; }

if [ -f apps/web/dist/index.html ]; then
  mkdir -p apps/web/dist/2d apps/web/dist/portal
  rm -rf apps/web/dist/2d/* apps/web/dist/portal/*
  cp -a apps/client-2d/dist/. apps/web/dist/2d/
  cp -a client/dist/portal/. apps/web/dist/portal/
fi

echo "Route bundle markers:"
ls -la client/dist/index.html client/dist/2d/index.html client/dist/portal/index.html
[ ! -f apps/web/dist/index.html ] || ls -la apps/web/dist/index.html apps/web/dist/portal/index.html || true

NGINX_WEBROOT="${NGINX_WEBROOT:-$APP_DIR/client/dist}"
if [ ! -f "$NGINX_WEBROOT/index.html" ]; then
  echo "ERROR: NGINX_WEBROOT=$NGINX_WEBROOT has no index.html after route assembly"
  exit 1
fi

if [ "${SKIP_NGINX_REPAIR:-0}" != "1" ] && [ -f deploy/repair-nginx.sh ] && command -v nginx >/dev/null 2>&1; then
  echo "Repairing nginx document root and reverse proxy if permissions allow..."
  APP_DIR="$APP_DIR" WEBROOT="$NGINX_WEBROOT" GAME_PORT="$GAME_PORT" DOMAIN="${DOMAIN:-arelorian.de}" bash deploy/repair-nginx.sh || true
else
  echo "Skipping nginx repair. Set SKIP_NGINX_REPAIR=0 and ensure nginx is installed to enable it."
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
    if [ "$code" = "200" ]; then
      echo "✅ ${name} OK (${url})"
      return 0
    fi
    echo "⏳ ${name} not ready (${url}) [attempt ${i}/${attempts}] status=${code:-n/a}"
    sleep "$wait_sec"
  done

  echo "❌ ${name} failed after ${attempts} attempts (${url}), last status=${code:-n/a}"
  return 1
}

verify_body_contains() {
  local url="$1"
  local name="$2"
  local needle="$3"
  local body
  body="$(curl -sS "$url" || true)"
  if printf '%s' "$body" | grep -q "$needle"; then
    echo "✅ ${name} contains ${needle}"
    return 0
  fi
  echo "❌ ${name} does not contain ${needle} (${url})"
  printf '%s\n' "$body" | head -40
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
verify_body_contains "http://127.0.0.1:${GAME_PORT}/" "Client root landing" "LIVE_ENTRYPOINTS"
verify_url "http://127.0.0.1:${GAME_PORT}/2d/" "2D client"
verify_url "http://127.0.0.1:${GAME_PORT}/portal/" "Portal client"
verify_body_contains "http://127.0.0.1:${GAME_PORT}/portal/" "Portal hub" "PORTAL ONLINE"

echo "Update complete!"
pm2 status
