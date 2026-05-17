# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig `interactDistance` vs `packages/shared/src/utils/interaction.ts` `INTERACT_DISTANCE`).

## Unit tests

The gate runs `pnpm run test:dgcc` (Vitest config `vitest.dgcc.config.ts`), a stable slice of the suite. Use `pnpm run test` for the full workspace tests.

## E2E (Playwright)

Install browsers once: `pnpm run test:e2e:install`, then the gate can run `pnpm run test:e2e:ci`.
