# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

The runner resolves the monorepo root from `tools/dgcc/run-dgcc.ts`, so it behaves the same no matter which directory you run `pnpm` from.

Artifacts: `dgcc-artifacts/`
