# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Modes also run `pnpm run check:interact` (GameConfig vs `shared/interaction.ts`) and `pnpm run audit:model-paths` (3D asset references).
