#!/bin/bash
find . -name ".pnp.cjs" -exec rm -rf {} +
find . -name ".pnp.loader.mjs" -exec rm -rf {} +
find . -name ".yarnrc.yml" -exec rm -rf {} +
find . -name ".yarn" -exec rm -rf {} +
find . -name "yarn.lock" -exec rm -rf {} +
pnpm install --no-frozen-lockfile