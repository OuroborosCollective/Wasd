#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export ALLOW_GUEST_LOGIN="${ALLOW_GUEST_LOGIN:-1}"
export PLAYER_SAVE_FILE="${PLAYER_SAVE_FILE:-/tmp/areloria-e2e-players.json}"
export PERSISTENCE_DRIVER="${PERSISTENCE_DRIVER:-file}"
unset DATABASE_URL 2>/dev/null || true
unset DIRECT_URL 2>/dev/null || true
exec node server/dist/index.js
