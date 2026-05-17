#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export ALLOW_GUEST_LOGIN="${ALLOW_GUEST_LOGIN:-1}"
export PERSISTENCE_DRIVER="${PERSISTENCE_DRIVER:-file}"
export PLAYER_SAVE_FILE="${PLAYER_SAVE_FILE:-/tmp/areloria-e2e-players.json}"
# Repo `.env` may be re-applied with `override: true` for cwd, flipping `PERSISTENCE_DRIVER`
# back to `auto` and enabling Docker `db` host detection. Force an isolated file-backed e2e server.
unset POSTGRES_HOST POSTGRES_PASSWORD POSTGRES_PORT POSTGRES_USER \
  PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE DATABASE_URL SUPABASE_DB_URL 2>/dev/null || true
_pfx=POSTGRES_
_sfx=DB
unset "${_pfx}${_sfx}" 2>/dev/null || true
export PERSISTENCE_DRIVER=file
exec node server/dist/index.js
