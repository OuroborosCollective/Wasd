#!/usr/bin/env bash
# Production build + PM2 restart for Wasd (server + client + shared).
# Run from repo root after `git pull` / `git reset --hard` (e.g. CI or pull-and-deploy.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export APP_DIR="$ROOT"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"

echo "→ vps-prod-build: repo root=${ROOT}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found; enabling corepack…"
  corepack enable || true
  corepack prepare pnpm@11.5.0 --activate || true
fi

echo "→ pnpm install"
pnpm install --frozen-lockfile

echo "→ build @wasd/server graph + @wasd/client graph"
pnpm --filter @wasd/server... --filter @wasd/client... run build

if [[ -f scripts/sync-world-assets.mjs ]]; then
  echo "→ sync world assets (optional)"
  node scripts/sync-world-assets.mjs || true
fi

echo "→ PM2 ecosystem"
bash deploy/write_pm2_ecosystem.sh

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Error: pm2 is not installed (npm i -g pm2)." >&2
  exit 1
fi

if pm2 describe areloria >/dev/null 2>&1; then
  echo "→ pm2 restart areloria"
  pm2 restart areloria --update-env
else
  echo "→ pm2 start ecosystem.config.cjs"
  pm2 start ecosystem.config.cjs
fi
pm2 save || true

echo "→ vps-prod-build finished"
