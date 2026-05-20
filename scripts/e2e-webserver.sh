#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# Development stack: Vite serves the client (no client/dist required). DGCC and CI use this path.
export NODE_ENV="${NODE_ENV:-development}"
export PORT="${PORT:-3000}"
export PERSISTENCE_DRIVER="${PERSISTENCE_DRIVER:-file}"
export ALLOW_GUEST_LOGIN="${ALLOW_GUEST_LOGIN:-1}"
export PLAYER_SAVE_FILE="${PLAYER_SAVE_FILE:-/tmp/areloria-e2e-players.json}"
exec pnpm exec tsx server/src/index.ts
