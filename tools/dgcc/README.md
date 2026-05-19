# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/` (gitignored).

The **unit** check runs `pnpm run build:shared` before `pnpm run test` so `@wasd/shared` resolves like a fresh clone.

Self-heal wrapper (enables contract fixes by default): `bash tools/dgcc/selfheal-wrapper.sh`

Before first E2E run in a clean environment: `pnpm run test:e2e:install`
