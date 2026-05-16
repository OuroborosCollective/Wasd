# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Unit checks use `pnpm run test:dgcc` (see `vitest.dgcc.config.ts`), which builds `@wasd/shared` and `@wasd/core-logic` then runs Vitest with a few deferred server integration suites excluded until repaired. Use `pnpm run test` for the full suite.

Optional consistency check (not part of the default contract): `pnpm run check:interact` compares `server/src/config/GameConfig.ts` with `packages/shared/src/utils/interaction.ts`.
