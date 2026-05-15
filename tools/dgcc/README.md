# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Unit gate: DGCC runs `pnpm run test:dgcc` (client unit tests plus `validate-content-core`). Use `pnpm run test` for the full Vitest suite.

Optional: `pnpm run check:interact` compares `server/src/config/GameConfig.ts` with `packages/shared/src/utils/interaction.ts` (not part of the default DGCC check list).
