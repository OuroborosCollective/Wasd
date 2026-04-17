# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

`assetsAudit` also runs `pnpm run audit:model-paths` so broken GLB paths fail the gate before deploy.
