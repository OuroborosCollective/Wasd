# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Prerequisites

From the repo root, run `pnpm install` and build shared code before E2E or Vitest-heavy flows:

```bash
pnpm install
pnpm -C packages/shared build
```

`pnpm run test:e2e:ci` builds the server first, then installs Chromium for Playwright, then runs `e2e/`.

## Usage

```bash
pnpm run dgcc              # minimal: lint, unit, e2e, content, assets, ws, UI smoke
pnpm run dgcc:quick        # same without unit (faster CI smoke; ok when Vitest is not fully green)
pnpm run dgcc:extreme      # minimal + client + server production builds
DGCC_FIX=1 pnpm run dgcc   # allow contract-driven auto-fixes (e.g. empty model subfolders)
bash tools/dgcc/selfheal-wrapper.sh   # extreme + DGCC_FIX=1 by default
```

Artifacts: `dgcc-artifacts/` (gitignored).

Contract: `tools/dgcc/dgcc.contract.json`. Report JSON schema: `tools/dgcc/dgcc.report.schema.json`.

Root scripts used by checks: `lint`, `test`, `validate`, `test:e2e:ci`, plus `client` / `server` builds in extreme mode.
