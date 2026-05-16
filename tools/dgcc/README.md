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

Unit checks use `pnpm run test:dgcc` (see `vitest.dgcc.config.ts`), which builds `@wasd/shared` first and excludes a few suites that require a full live stack or are temporarily out of sync with stubs.
