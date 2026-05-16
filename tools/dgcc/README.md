# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Optional: `pnpm run check:interact` compares `GameConfig.interactDistance` with `INTERACT_DISTANCE` in `packages/shared/src/utils/interaction.ts`.
