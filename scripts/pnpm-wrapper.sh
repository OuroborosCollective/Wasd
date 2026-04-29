#!/bin/bash

REQUIRED_PNPM=$(jq -r '.engines.pnpm' package.json 2>/dev/null)
if [ -z "$REQUIRED_PNPM" ] || [ "$REQUIRED_PNPM" == "null" ]; then
  REQUIRED_PNPM=$(grep '"pnpm":' package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
fi

INSTALLED_PNPM=$(pnpm -v 2>/dev/null)

if [ -n "$REQUIRED_PNPM" ] && [ "$INSTALLED_PNPM" != "$REQUIRED_PNPM" ]; then
  echo "WARNING: Detected pnpm version $INSTALLED_PNPM does not match required version $REQUIRED_PNPM in package.json" >&2
fi

node scripts/check-integrity.mjs "$@"