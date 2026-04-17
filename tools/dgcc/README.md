# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

From a fresh clone, run `pnpm install` at the repo root first so the `unit` step (Vitest) has its dev dependencies (for example `jsdom`). The runner resolves paths from `tools/dgcc/run-dgcc.ts`, so `pnpm run dgcc` still targets the monorepo root even if your shell `cwd` is elsewhere.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `shared/interaction.ts`).
