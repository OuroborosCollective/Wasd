# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

First-time e2e (Playwright browser): `pnpm run test:e2e:install`

Artifacts: `dgcc-artifacts/` (see `dgcc.report.json` and per-check `*.out.txt` files).

## Contract

Modes and check lists live in `dgcc.contract.json`. The `minimal` / `extreme` modes include `pnpm run check:interact`, which asserts `server/src/config/GameConfig.ts` `interactDistance` matches `packages/shared/src/utils/interaction.ts` `INTERACT_DISTANCE`.

## Checks

Root `package.json` defines the scripts DGCC invokes (`lint`, `test`, `test:e2e:ci`, `check:interact`, server `validate`, etc.). The `unit` step runs `pnpm run test` (Vitest with a `@wasd/core-logic` / `@wasd/shared` prebuild). Resolve any failing tests locally before relying on a green DGCC exit code.
