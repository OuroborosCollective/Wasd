# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

DGCC resolves the monorepo root from `tools/dgcc/run-dgcc.ts`, so `pnpm run dgcc` works even when the shell cwd is not the repo root (for example, cron jobs). Before the first run in a clean checkout, run `pnpm install` at the repo root so Vitest and server dependencies (for example `jsdom`, `@supabase/supabase-js`) are present.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `shared/interaction.ts`).
