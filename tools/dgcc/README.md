# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

`extreme` additionally runs `clientBuild` and `serverBuild` (see `tools/dgcc/dgcc.contract.json`).
