# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Skip checks (comma-separated names): `DGCC_SKIP=unit,e2e pnpm run dgcc` (for constrained agents or while repairing a flaky stage).

Optional interact-radius parity (GameConfig vs `@wasd/shared`): `pnpm run check:interact`.
