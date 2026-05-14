# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

The `minimal` / `extreme` modes also run `pnpm run check:interact` (GameConfig vs `packages/shared/src/utils/interaction.ts`).

## Skipping checks

If a check cannot run in the current environment (for example a long-running or flaky suite), set a comma-separated list:

```bash
DGCC_SKIP_CHECKS=unit pnpm run dgcc
```

Skipped checks are recorded in `dgcc.report.json` with `summary: "skipped (DGCC_SKIP_CHECKS)"` and do not fail the gate.
