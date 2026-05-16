# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Optional interact-radius guard (not part of DGCC modes): `pnpm run check:interact` (GameConfig vs `@wasd/shared` `INTERACT_DISTANCE`).
