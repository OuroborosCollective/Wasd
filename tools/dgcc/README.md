# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `shared/interaction.ts`).

Optional: set `DGCC_ROOT` to the monorepo root if you invoke the runner from another working directory (otherwise it walks up until it finds `tools/dgcc/dgcc.contract.json`).
