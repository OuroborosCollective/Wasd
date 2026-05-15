#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export ALLOW_GUEST_LOGIN="${ALLOW_GUEST_LOGIN:-1}"
export PLAYER_SAVE_FILE="${PLAYER_SAVE_FILE:-/tmp/areloria-e2e-players.json}"
# Isolated persistence (ignore developer .env pointing at docker "db").
export PERSISTENCE_DRIVER="${PERSISTENCE_DRIVER:-file}"
export E2E_SKIP_ROOT_DOTENV="${E2E_SKIP_ROOT_DOTENV:-1}"
if [[ -n "${DATABASE_URL+x}" ]]; then unset DATABASE_URL; fi # pragma: allowlist secret
if [[ -n "${SUPABASE_DB_URL+x}" ]]; then unset SUPABASE_DB_URL; fi # pragma: allowlist secret
exec node server/dist/index.js
