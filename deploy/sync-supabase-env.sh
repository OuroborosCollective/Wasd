#!/usr/bin/env bash
# Merge CI-provided Supabase/Postgres env into VPS $APP_DIR/.env (no values logged).
# Expects variables to be exported in the SSH session (GitHub Actions secrets → appleboy envs).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/areloria}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"

mkdir -p "$APP_DIR"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE" 2>/dev/null || true

# Remove one line "KEY=..." at line start (best-effort; values may contain '=').
remove_key() {
  local key="$1"
  local tmp
  tmp="$(mktemp)"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    grep -v "^${key}=" "$ENV_FILE" >"$tmp" && mv "$tmp" "$ENV_FILE"
  else
    rm -f "$tmp"
  fi
}

set_key() {
  local key="$1"
  local val="${2:-}"
  [ -n "$val" ] || return 0
  remove_key "$key"
  # .env line: KEY=value — avoid echo to reduce accidental log exposure
  printf '%s=%s\n' "$key" "$val" >>"$ENV_FILE"
}

# Self-hosted stack aliases (match server Database.ts / supabase config)
if [ -z "${SUPABASE_JWT_SECRET:-}" ] && [ -n "${JWT_SECRET:-}" ]; then
  export SUPABASE_JWT_SECRET="${JWT_SECRET}"
fi
if [ -z "${SUPABASE_JWT_SECRET:-}" ] && [ -n "${GOTRUE_JWT_SECRET:-}" ]; then
  export SUPABASE_JWT_SECRET="${GOTRUE_JWT_SECRET}"
fi
if [ -z "${SUPABASE_JWT_SECRET:-}" ] && [ -n "${AUTH_JWT_SECRET:-}" ]; then
  export SUPABASE_JWT_SECRET="${AUTH_JWT_SECRET}"
fi
if [ -z "${SUPABASE_JWT_SECRET:-}" ] && [ -n "${SECRET_KEY_BASE:-}" ]; then
  export SUPABASE_JWT_SECRET="${SECRET_KEY_BASE}"
fi
if [ -n "${ANON_KEY:-}" ] && [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  export SUPABASE_ANON_KEY="${ANON_KEY}"
fi
if [ -n "${SERVICE_ROLE_KEY:-}" ] && [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}"
fi
if [ -n "${API_EXTERNAL_URL:-}" ]; then
  if [ -z "${SUPABASE_URL:-}" ]; then export SUPABASE_URL="${API_EXTERNAL_URL}"; fi
  if [ -z "${SUPABASE_PUBLIC_URL:-}" ]; then export SUPABASE_PUBLIC_URL="${API_EXTERNAL_URL}"; fi
fi
if [ -n "${POSTGRES_PASSWORD:-}" ] && [ -z "${PGPASSWORD:-}" ]; then
  export PGPASSWORD="${POSTGRES_PASSWORD}"
fi

# Auto-derive VITE_SUPABASE_* from server-side aliases when not explicitly provided.
# This avoids requiring duplicate GitHub secrets for build-time vars.
#
# IMPORTANT: The browser client connects DIRECTLY to Supabase (no proxy).
# VITE_SUPABASE_URL must be the public Supabase URL the browser can reach.
# When SUPABASE_PROXY_URL is set (server-side internal URL), we still need
# a public URL for the client — use SUPABASE_PUBLIC_URL or SUPABASE_URL.
if [ -z "${VITE_SUPABASE_URL:-}" ]; then
  # Prefer the most specific public URL; fall back through aliases
  export VITE_SUPABASE_URL="${SUPABASE_PUBLIC_URL:-${API_EXTERNAL_URL:-${SUPABASE_URL:-}}}"
fi
if [ -z "${VITE_SUPABASE_ANON_KEY:-}" ]; then
  export VITE_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${ANON_KEY:-}}"
fi

set_key "VITE_SUPABASE_URL" "${VITE_SUPABASE_URL:-}"
set_key "VITE_SUPABASE_PUBLIC_URL" "${VITE_SUPABASE_PUBLIC_URL:-${VITE_SUPABASE_URL:-}}"
set_key "VITE_SUPABASE_ANON_KEY" "${VITE_SUPABASE_ANON_KEY:-}"
set_key "SUPABASE_URL" "${SUPABASE_URL:-}"
set_key "SUPABASE_PUBLIC_URL" "${SUPABASE_PUBLIC_URL:-}"
set_key "API_EXTERNAL_URL" "${API_EXTERNAL_URL:-}"
set_key "SUPABASE_ANON_KEY" "${SUPABASE_ANON_KEY:-}"
set_key "SUPABASE_SERVICE_ROLE_KEY" "${SUPABASE_SERVICE_ROLE_KEY:-}"
set_key "SUPABASE_JWT_SECRET" "${SUPABASE_JWT_SECRET:-}"
set_key "JWT_SECRET" "${JWT_SECRET:-}"
set_key "GOTRUE_JWT_SECRET" "${GOTRUE_JWT_SECRET:-}"
set_key "AUTH_JWT_SECRET" "${AUTH_JWT_SECRET:-}"
set_key "SECRET_KEY_BASE" "${SECRET_KEY_BASE:-}"
set_key "DATABASE_URL" "${DATABASE_URL:-}"
set_key "SUPABASE_DB_URL" "${SUPABASE_DB_URL:-}"
set_key "PGHOST" "${PGHOST:-}"
set_key "PGPORT" "${PGPORT:-}"
set_key "PGDATABASE" "${PGDATABASE:-}"
set_key "PGUSER" "${PGUSER:-}"
set_key "PGPASSWORD" "${PGPASSWORD:-}"
set_key "POSTGRES_HOST" "${POSTGRES_HOST:-}"
set_key "POSTGRES_PORT" "${POSTGRES_PORT:-}"
set_key "POSTGRES_DB" "${POSTGRES_DB:-}"
set_key "POSTGRES_USER" "${POSTGRES_USER:-}"
set_key "POSTGRES_PASSWORD" "${POSTGRES_PASSWORD:-}"
set_key "POOLER_PROXY_PORT_TRANSACTION" "${POOLER_PROXY_PORT_TRANSACTION:-}"

set_key "SUPABASE_PROXY_URL" "${SUPABASE_PROXY_URL:-}"
set_key "GAME_ORIGIN" "${GAME_ORIGIN:-}"
set_key "APP_ORIGIN" "${APP_ORIGIN:-}"
set_key "USE_SUPABASE_WS_LOGIN" "${USE_SUPABASE_WS_LOGIN:-}"
set_key "REQUIRE_SUPABASE_AUTH" "${REQUIRE_SUPABASE_AUTH:-}"
set_key "PERSISTENCE_DRIVER" "${PERSISTENCE_DRIVER:-}"
set_key "ALLOW_GUEST_LOGIN" "${ALLOW_GUEST_LOGIN:-}"
set_key "ALLOW_DEV_LOGIN" "${ALLOW_DEV_LOGIN:-}"

echo "sync-supabase-env: updated $ENV_FILE (keys merged; values not printed)"
