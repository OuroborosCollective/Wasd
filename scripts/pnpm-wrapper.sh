#!/bin/bash

REQUIRED_PNPM=$(node -p "require('./package.json').engines?.pnpm" 2>/dev/null)

if [ "$REQUIRED_PNPM" = "undefined" ] || [ "$REQUIRED_PNPM" = "null" ] || [ -z "$REQUIRED_PNPM" ]; then
  REQUIRED_PNPM="latest"
fi

INSTALLED_PNPM=$(pnpm -v 2>/dev/null)

if [ "$REQUIRED_PNPM" != "latest" ] && [ "$INSTALLED_PNPM" != "$REQUIRED_PNPM" ]; then
  echo "Required pnpm version ($REQUIRED_PNPM) does not match installed version ($INSTALLED_PNPM). Installing..."
  npm install -g pnpm@$REQUIRED_PNPM
fi

exec pnpm "$@"