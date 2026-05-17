#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export ALLOW_GUEST_LOGIN="${ALLOW_GUEST_LOGIN:-1}"
# This launcher is for automation only: force file-backed persistence (ignore inherited DB URLs).
export PERSISTENCE_DRIVER=file
export DATABASE_URL=""
export PLAYER_SAVE_FILE="${PLAYER_SAVE_FILE:-/tmp/areloria-e2e-players.json}"
exec node server/dist/index.js
