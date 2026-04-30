#!/bin/bash

REQUIRED_PNPM=$(node -p "try { const pkg = require('./package.json'); (pkg.engines && pkg.engines.pnpm) || 'latest' } catch(e) { 'latest' }" 2>/dev/null)

if [ "$REQUIRED_PNPM" = "undefined" ] || [ -z "$REQUIRED_PNPM" ] || [ "$REQUIRED_PNPM" = "null" ]; then
  REQUIRED_PNPM="latest"
fi

if command -v pnpm >/dev/null 2>&1; then
  INSTALLED_PNPM=$(pnpm -v 2>/dev/null)
  if [ "$REQUIRED_PNPM" != "latest" ] && [ "$INSTALLED_PNPM" != "$REQUIRED_PNPM" ]; then
    echo "Updating pnpm to $REQUIRED_PNPM..."
    npm install -g pnpm@$REQUIRED_PNPM >/dev/null 2>&1
  fi
  exec pnpm "$@"
elif command -v corepack >/dev/null 2>&1; then
  if [ "$REQUIRED_PNPM" != "latest" ]; then
    corepack prepare pnpm@$REQUIRED_PNPM --activate >/dev/null 2>&1
  fi
  exec corepack pnpm "$@"
else
  echo "pnpm not found. Falling back to npx..."
  if [ "$REQUIRED_PNPM" = "latest" ]; then
    exec npx pnpm "$@"
  else
    exec npx pnpm@$REQUIRED_PNPM "$@"
  fi
fi