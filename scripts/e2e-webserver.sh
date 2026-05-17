#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export ALLOW_GUEST_LOGIN="${ALLOW_GUEST_LOGIN:-1}"
export PLAYER_SAVE_FILE="${PLAYER_SAVE_FILE:-/tmp/areloria-e2e-players.json}"

if [[ ! -f "$ROOT/server/dist/index.js" ]]; then
  echo "[e2e-webserver] server/dist missing; building server..."
  pnpm --prefix server run build
fi
if [[ ! -f "$ROOT/client/dist/e2e-smoke.html" ]]; then
  echo "[e2e-webserver] client/dist e2e smoke missing; building client..."
  if [[ -z "${NODE_OPTIONS:-}" ]]; then
    export NODE_OPTIONS="--max-old-space-size=6144"
  fi
  pnpm --prefix client run build
fi

exec node server/dist/index.js
