# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

## Modes

- **minimal** (default for `pnpm run dgcc`): lint, curated unit gate (`pnpm run test:dgcc`, see `vitest.dgcc.config.ts`), E2E, content validate, asset audit, WS/UI smoke checks.
- **extreme** (`pnpm run dgcc:extreme`): same plus a production `server` build. With `fix.enabled`, missing asset subfolders under `client/public/assets/models` are created automatically.

Override the Vitest script used for the `unit` step with `rules.unit.pnpmScript` in `dgcc.contract.json` (default here is `test:dgcc`; use `test` for the full suite).

First-time E2E in a clean environment:

```bash
pnpm run test:e2e:install
```
