# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `unit` step runs `pnpm run test:dgcc` (a stable Vitest subset plus `vitest.dgcc-setup.ts` forcing `PERSISTENCE_DRIVER=file`). Use `pnpm run test` for the full suite.

`extreme` additionally runs `pnpm --prefix server run build` (client production build is intentionally omitted until the Vite + Babylon bundle pipeline is stable in CI).

Optional interact-radius parity: `pnpm run check:interact` (GameConfig vs `packages/shared/src/utils/interaction.ts`).
