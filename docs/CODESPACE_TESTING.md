# Codespace and Safe Test Lab

This repository uses GitHub Actions as a safe test lab before anything is deployed to the VPS.

## Goal

Do not test risky changes directly on production.

Use this flow:

```txt
branch or pull request
→ Safe Test Lab workflow
→ inspect logs/artifact
→ only then manual VPS deploy
```

## What the workflow does

The workflow `.github/workflows/safe-test-lab.yml` runs on pull requests to `main` and can also be started manually with `workflow_dispatch`.

It performs:

```txt
pnpm install --frozen-lockfile
pnpm guard:monorepo:frozen
pnpm exec vitest run server/src/core/are
pnpm -r --filter ./server build
pnpm build:2d
pnpm build:web
node scripts/safe-test-smoke.mjs
```

It never deploys.
It never connects to the production VPS.
It only builds, tests, and uploads a smoke summary artifact.

## Manual Codespace commands

If you open a Codespace manually, use:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm guard:monorepo:frozen
pnpm exec vitest run server/src/core/are
pnpm -r --filter ./server build
pnpm build:2d
pnpm build:web
node scripts/safe-test-smoke.mjs
```

## Rule

Production deploys remain manual until the alpha is stable.
