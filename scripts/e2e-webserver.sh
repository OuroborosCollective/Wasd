#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export ALLOW_GUEST_LOGIN="${ALLOW_GUEST_LOGIN:-1}"
export PLAYER_SAVE_FILE="${PLAYER_SAVE_FILE:-/tmp/areloria-e2e-players.json}"
if [[ -f server/dist/index.js ]]; then
  exec node server/dist/index.js
fi
echo "[e2e-webserver] server/dist/index.js missing; starting via tsx (run pnpm --prefix server build for a faster prod boot)" >&2
exec pnpm exec tsx server/src/index.ts
