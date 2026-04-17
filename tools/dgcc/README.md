# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Modes are defined in `tools/dgcc/dgcc.contract.json`. Optional self-heal entrypoint: `tools/dgcc/selfheal-wrapper.sh`.
