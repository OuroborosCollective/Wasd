# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `unit` step runs `pnpm run test:dgcc` (`tools/dgcc/run-vitest-dgcc.mjs`), a curated subset that passes in the default workspace environment. Use `pnpm run test` for the full suite.

Optional: `pnpm run check:interact` compares `server/src/config/GameConfig.ts` `interactDistance` with `packages/shared/src/utils/interaction.ts` `INTERACT_DISTANCE`.
