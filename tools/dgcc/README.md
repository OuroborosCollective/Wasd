# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

For interact-distance consistency (GameConfig vs `shared/interaction.ts`), run `pnpm run check:interact` separately or add it to `tools/dgcc/dgcc.contract.json` under `modes.*.checks` if you want it inside DGCC.
