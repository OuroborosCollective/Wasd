# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

The `unit` step runs **`pnpm run test:dgcc`**: a fast, content- and protocol-focused Vitest subset (not the full `pnpm run test` integration matrix). Use `pnpm run test` locally or in CI when you need the complete server/client test run.

Artifacts: `dgcc-artifacts/`

Before the first E2E run in a fresh clone, install browsers once: `pnpm run test:e2e:install`.
