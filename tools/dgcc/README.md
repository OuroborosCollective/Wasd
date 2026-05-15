# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

E2E (`pnpm run test:e2e:ci`) builds `@wasd/shared`, `@wasd/core-logic` (`build:runtime`), and the server (`pnpm run build:server-with-deps`), installs the Chromium browser for Playwright if needed, then runs `e2e/` against `scripts/e2e-webserver.sh`. In production the server also serves `client/public/e2e-smoke.html` at `/e2e-smoke.html` so smoke tests do not require a full Vite client build.
