# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The runner resolves the monorepo root from `tools/dgcc/dgcc.contract.json`, so it still works if the shell working directory is not the repo root (for example `pnpm exec tsx` from a subpackage).

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `shared/interaction.ts`).
