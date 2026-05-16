# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Optional interact-radius alignment (not part of the default contract modes):

```bash
pnpm run check:interact
```

The `unit` check runs `pnpm run test:dgcc` (a fast, gameplay-relevant Vitest slice). Use `pnpm run test` for the full suite.
