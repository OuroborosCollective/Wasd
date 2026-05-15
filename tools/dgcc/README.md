# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

## What runs

- **Prep** (unless `DGCC_SKIP_PREP=1`): `pnpm run dgcc:prep` builds `@wasd/shared` and `@wasd/core-logic` so the server, Vitest, and Playwright smoke can resolve workspace packages.
- **Unit (DGCC scope)**: `pnpm run test:dgcc` runs `vitest.config.dgcc.ts` — protocol, content validation, client unit tests, and related invariants. Full `pnpm run test` is the entire monorepo matrix (WS integration, optional DB, and so on).

Artifacts: `dgcc-artifacts/` (including `prep.out.txt` when prep runs).
