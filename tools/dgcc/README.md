# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `unit` step runs `pnpm run test:dgcc` (shared build plus `validate-content-core` Vitest). Use `pnpm run test` for the full suite.

`extreme` mode includes `serverBuild` but not `clientBuild` until the Babylon/Vite client production bundle is aligned in this monorepo; run `pnpm --prefix client run build` separately when working on the client.

Optional interact-radius consistency (not part of DGCC modes): `pnpm run check:interact` (GameConfig vs `packages/shared/src/utils/interaction.ts`).
