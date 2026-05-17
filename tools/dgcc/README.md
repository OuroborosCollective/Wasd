# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The **unit** step runs `pnpm run test:dgcc-unit` (client Vitest suite after building `@wasd/shared`). Full workspace tests remain `pnpm run test`.

Optional interact-radius consistency (not part of DGCC modes): `pnpm run check:interact`.
