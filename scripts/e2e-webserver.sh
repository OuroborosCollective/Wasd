#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export ALLOW_GUEST_LOGIN="${ALLOW_GUEST_LOGIN:-1}"
export PLAYER_SAVE_FILE="${PLAYER_SAVE_FILE:-/tmp/areloria-e2e-players.json}"
if [[ ! -f server/dist/index.js ]]; then
  echo "[e2e-webserver] server/dist missing; building shared, core-logic, server..."
  pnpm --filter @wasd/shared build
  pnpm --filter @wasd/core-logic run build:runtime
  pnpm --prefix server run build
fi
if [[ ! -f client/dist/e2e-smoke.html ]]; then
  echo "[e2e-webserver] client/dist missing e2e-smoke; building client..."
  pnpm --filter @wasd/shared build
  pnpm --prefix client run build
fi
exec node server/dist/index.js
