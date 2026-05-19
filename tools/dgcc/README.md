# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Prerequisites

- One-time Playwright browser install (needed for the `e2e` check): `pnpm run test:e2e:install`

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

Artifacts: `dgcc-artifacts/`

## What runs

- **`unit`**: fast invariant slice via `pnpm run test:dgcc` (content validation core, shared protocol source, world-assets path resolution). Use `pnpm run test` for the full Vitest suite locally or in CI.

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `packages/shared` interact distance).

In **`extreme`**, `clientBuild` runs `pnpm run build:client-static-e2e` (mirror `client/public` into `client/dist` for production static serving). A full SPA `vite build` is still `pnpm --prefix client run build` when you need bundles.
