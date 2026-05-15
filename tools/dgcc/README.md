# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

First-time E2E on a machine needs browsers: `pnpm run test:e2e:install`.

By default the `unit` check runs `pnpm run test:dgcc` (fast client Vitest suite). Set `DGCC_UNIT=full` to run the entire monorepo test suite (`pnpm run test`).
