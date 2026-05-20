# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Optional interact-radius consistency (GameConfig vs `@wasd/shared`): `pnpm run check:interact`.

Before `pnpm run dgcc` in a clean checkout, run `pnpm -C packages/shared build` if Vitest reports unresolved `@wasd/shared`. The `unit` step builds that package automatically before `vitest run`.
