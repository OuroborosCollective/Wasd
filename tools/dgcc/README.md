# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

## Unit tests

The `unit` step runs `pnpm run test:dgcc` (Vitest config `vitest.dgcc.config.ts`), which excludes a small set of suites that depend on optional services, unreleased workspace packages, or legacy mocks. For the full Vitest surface, use `pnpm run test`.

For a focused gameplay constant check (server `GameConfig` vs `shared/interaction.ts`), run `pnpm run check:interact` separately.
