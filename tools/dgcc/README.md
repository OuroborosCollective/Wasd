# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Before first e2e/DGCC run on a fresh machine, install the Playwright browser once:

```bash
pnpm run test:e2e:install
```

The Playwright web server runs the game server with `E2E_SKIP_DOTENV=1` and file persistence so a repo-root `.env` that targets a container hostname does not break CI smoke tests.

`pnpm run test:e2e:ci` runs `scripts/e2e-ci.mjs`, which applies safe defaults (including a loopback auth-provider URL when unset) so local runs work without embedding credentials in config files.

`pnpm run dgcc:extreme` additionally builds client and server (`tsc`); it stays red until those compile cleanly.
