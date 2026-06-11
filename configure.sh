#!/usr/bin/env bash
set -Eeuo pipefail

echo "=== ARELORIA / WASD No-Firebase Bootstrap ==="

APP_PATH="${APP_PATH:-.}"
BOOTSTRAP_JS_PATH="${APP_PATH}/src/bootstrap.js"

APP_NAME="${APP_NAME:-Areloria WASD}"
APP_ENV="${APP_ENV:-development}"

API_HTTP_URL="${API_HTTP_URL:-http://localhost:3001}"
WS_URL="${WS_URL:-ws://localhost:3001/ws}"

SERVER_TICK_HZ="${SERVER_TICK_HZ:-10}"
DETERMINISM_MODE="${DETERMINISM_MODE:-strict}"
ASSET_BASE_URL="${ASSET_BASE_URL:-/assets}"

echo "APP_PATH: ${APP_PATH}"
echo "BOOTSTRAP_JS_PATH: ${BOOTSTRAP_JS_PATH}"
echo "APP_ENV: ${APP_ENV}"
echo "API_HTTP_URL: ${API_HTTP_URL}"
echo "WS_URL: ${WS_URL}"
echo "SERVER_TICK_HZ: ${SERVER_TICK_HZ}"

if [ ! -d "${APP_PATH}" ]; then
  echo "Error: APP_PATH does not exist: ${APP_PATH}"
  exit 1
fi

mkdir -p "$(dirname "${BOOTSTRAP_JS_PATH}")"

echo "Generating ${BOOTSTRAP_JS_PATH}..."

cat > "${BOOTSTRAP_JS_PATH}" <<EOF
window["APP_TEMPLATE_BOOTSTRAP"] = Object.freeze({
  app: Object.freeze({
    name: "${APP_NAME}",
    env: "${APP_ENV}",
    firebaseEnabled: false,
  }),

  network: Object.freeze({
    apiHttpUrl: "${API_HTTP_URL}",
    wsUrl: "${WS_URL}",
  }),

  arelogic: Object.freeze({
    serverTickHz: ${SERVER_TICK_HZ},
    tickMs: ${SERVER_TICK_HZ} > 0 ? Math.floor(1000 / ${SERVER_TICK_HZ}) : 100,
    determinismMode: "${DETERMINISM_MODE}",
    kappaInvariant: 1000,
  }),

  assets: Object.freeze({
    baseUrl: "${ASSET_BASE_URL}",
  }),

  features: Object.freeze({
    firebase: false,
    auth: "guest-or-own-backend",
    websocketGateway: "native-ws",
    runtime: "pixi-2d-client",
  }),
});
EOF

echo "Successfully generated ${BOOTSTRAP_JS_PATH}."

echo "Checking package manager..."

if [ -f "${APP_PATH}/pnpm-lock.yaml" ]; then
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "Error: pnpm lockfile found but pnpm is not installed."
    echo "Install with: corepack enable && corepack prepare pnpm@9.12.2 --activate"
    exit 1
  fi

  echo "Installing dependencies with pnpm..."
  (cd "${APP_PATH}" && pnpm install)

elif [ -f "${APP_PATH}/package-lock.json" ]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is not installed."
    exit 1
  fi

  echo "Installing dependencies with npm ci..."
  (cd "${APP_PATH}" && npm ci)

elif [ -f "${APP_PATH}/yarn.lock" ]; then
  if ! command -v yarn >/dev/null 2>&1; then
    echo "Error: yarn lockfile found but yarn is not installed."
    exit 1
  fi

  echo "Installing dependencies with yarn..."
  (cd "${APP_PATH}" && yarn install --frozen-lockfile)

else
  if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is not installed."
    exit 1
  fi

  echo "No lockfile found. Installing dependencies with npm install..."
  (cd "${APP_PATH}" && npm install)
fi

echo "No-Firebase bootstrap completed successfully."
exit 0
