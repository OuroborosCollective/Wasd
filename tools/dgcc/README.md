# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `e2e` check runs Playwright against the dev stack (`tsx server/src/index.ts` + embedded Vite). It builds `@wasd/shared` first so imports resolve. The `clientBuild` / `serverBuild` checks in `extreme` still validate production bundles separately.

The `unit` check runs `pnpm run test:dgcc` (builds `@wasd/shared`, then `vitest run` on `client/src` and `portal/src`). Use `pnpm run test` locally for the full suite including server integration tests.
