# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `unit` step runs `pnpm run test:dgcc` (client Vitest suites plus `validateContentRoot` on `game-data`). Use `pnpm run test` for the full monorepo Vitest run.

Optional: `pnpm run check:interact` aligns `GameConfig.interactDistance` with `shared/interaction.ts` (not part of the default contract modes).
