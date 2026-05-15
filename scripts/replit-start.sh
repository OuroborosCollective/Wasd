#!/usr/bin/env bash
set -euo pipefail

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3001}"
export GAME_PORT="$PORT"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

echo "=== Ouroboros Replit Boot ==="
echo "Emily: Willkommen, Replit-Architekt. Engine Online. Kausalität stabil."
echo "PORT=$PORT"
echo "DEMO_PORT=${DEMO_PORT:-5173}"

auto_corepack() {
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@9.12.2 --activate >/dev/null 2>&1 || true
  fi
}

auto_corepack

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not available. Falling back to npm installing pnpm locally."
  npm install -g pnpm@9.12.2
fi

pnpm install --no-frozen-lockfile --prefer-offline
pnpm --filter @wasd/core-logic --if-present build
pnpm --filter @wasd/shared --if-present build
pnpm --filter @wasd/server --if-present build

echo "Starting Ouroboros ARE server on :$PORT ..."
pnpm --filter @wasd/server start &
SERVER_PID=$!

echo "Starting Cyber-Zen SDK demo on :${DEMO_PORT:-5173} ..."
cd packages/sdk-examples/replit-demo
pnpm exec vite --host 0.0.0.0 --port "${DEMO_PORT:-5173}"

trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
