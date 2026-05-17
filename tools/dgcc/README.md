# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `packages/shared/src/utils/interaction.ts`).

E2E uses Playwright and starts the compiled server (`scripts/e2e-webserver.sh`). The first `pnpm run test:e2e:ci` run downloads Chromium via `playwright install chromium`.

The gate runs `pnpm run test:dgcc` (Vitest with `vitest.dgcc.config.ts`), which is the full include list from `vitest.config.ts` minus a small set of suites that still target legacy WS handlers. Use `pnpm run test` for the unrestricted Vitest run locally.
