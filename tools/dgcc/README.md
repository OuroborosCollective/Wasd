# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `unit` check runs `pnpm run test:dgcc` (client tests plus a small stable server slice). Use `pnpm run test` for the full Vitest suite.

Optional interact-radius consistency (not part of the default contract): `pnpm run check:interact` (`GameConfig` vs `packages/shared/src/utils/interaction.ts`).
