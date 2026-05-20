# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `packages/shared/src/utils/interaction.ts`).

The `unit` step runs `pnpm run test:dgcc` (a fast Vitest slice: interaction + content validation smoke + all `client/src` and `portal/src` tests). Use `pnpm run test` for the full server test matrix.

`extreme` mode includes `serverBuild` but not the Babylon client Vite bundle until `pnpm --prefix client run build` is green in CI (see client `vite.config.ts` / dependency alignment).
