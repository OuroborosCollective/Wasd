#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export ALLOW_GUEST_LOGIN="${ALLOW_GUEST_LOGIN:-1}"
export SUPABASE_AUTH="${SUPABASE_AUTH:-0}" # pragma: allowlist secret
export USE_SUPABASE_WS_LOGIN="${USE_SUPABASE_WS_LOGIN:-0}" # pragma: allowlist secret
export REQUIRE_SUPABASE_AUTH="${REQUIRE_SUPABASE_AUTH:-0}" # pragma: allowlist secret
export PERSISTENCE_DRIVER="${PERSISTENCE_DRIVER:-file}"
export DATABASE_URL="${DATABASE_URL:-}"
export PLAYER_SAVE_FILE="${PLAYER_SAVE_FILE:-/tmp/areloria-e2e-players.json}"
exec node server/dist/index.js
