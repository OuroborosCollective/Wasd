# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

## Checks

The contract lists which steps run per mode (`tools/dgcc/dgcc.contract.json`). **Unit tests are not part of the default gate** because Vitest depends on optional services, secrets, and database-related environment injected by some hosts; run the full suite locally with `pnpm run test` or `pnpm run test:dgcc` (uses `scripts/run-vitest-dgcc.mjs` for file persistence and stripped DB URL variables).

The `minimal` / `extreme` modes run `pnpm run check:interact` (GameConfig vs `packages/shared/src/utils/interaction.ts`).

`extreme` also runs `pnpm --prefix server run build`. Client `vite build` is not in the default contract until the 3D client production bundle is reliably green in CI; use `pnpm run build:3d` or `pnpm --prefix client run build` when you need a full client build check.
