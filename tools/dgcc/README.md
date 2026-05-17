# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

The `unit` step runs `pnpm run test:dgcc` (shared package build plus Vitest on `client/src` and `portal/src`) so the gate stays green without requiring a live database or every server integration test.

Artifacts: `dgcc-artifacts/`
