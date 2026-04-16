# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
pnpm run dgcc:selfheal
```

Artifacts: `dgcc-artifacts/`

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `shared/interaction.ts`) and `pnpm run audit:model-paths`.

The runner resolves the monorepo root from `tools/dgcc/dgcc.contract.json`, so `tsx tools/dgcc/run-dgcc.ts` still works when the current working directory is not the repository root.
