# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/` (gitignored).

## What runs

- **lint** — `eslint server/src client/src tools/dgcc`
- **unit** — focused Vitest gate: `pnpm run test:dgcc` (content + model-path audits; not the full monorepo suite)
- **check:interact** — `GameConfig.interactDistance` vs `packages/shared/src/utils/interaction.ts` (`INTERACT_DISTANCE`)
- **e2e** — Playwright smoke (`pnpm run test:e2e:ci`); Playwright webServer sets `OURO_E2E_SERVER=1` and `PERSISTENCE_DRIVER=file` so repo `.env` does not override curated env for CI
- **contentValidate** — `validate-content-core` Vitest from repo root
- **extreme** adds **clientBuild** / **serverBuild** (after workspace `@wasd/shared` + `@wasd/core-logic` builds for the server)

Install browsers once: `pnpm run test:e2e:install`

Full unit suite (optional): `pnpm run test`
