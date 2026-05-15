# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Optional manual gate (not part of DGCC modes): `pnpm run check:interact` — keeps `GameConfig.interactDistance` aligned with `packages/shared/src/utils/interaction.ts`.
