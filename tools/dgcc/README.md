# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Prerequisites

- One-time Playwright browsers: `pnpm run test:e2e:install` (required before `e2e` / full DGCC).
- `pnpm run test` already builds `@wasd/shared` and `@wasd/core-logic` runtime bundles before Vitest.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

Artifacts: `dgcc-artifacts/`

Optional manual gate (not part of DGCC modes): `pnpm run check:interact` — ensures `GameConfig.interactDistance` matches `packages/shared/src/utils/interaction.ts`.
