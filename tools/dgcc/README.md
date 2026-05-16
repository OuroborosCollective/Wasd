# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

## What runs

- **lint** — `pnpm run lint` (ESLint on `server/src` and `client/src`).
- **unit** (contract name) — `pnpm run test:dgcc` (fast Vitest slice: DGCC smoke + model-path audit). Use `pnpm run test` for the full suite.
- **e2e** — `pnpm run test:e2e:ci` (builds `@wasd/shared`, `@wasd/core-logic`, client, server, then Playwright). First time: `pnpm run test:e2e:install`.
- **extreme** — additionally runs **client** and **server** production builds.

Contract file: `tools/dgcc/dgcc.contract.json`.
