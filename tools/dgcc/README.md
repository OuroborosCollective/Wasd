# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

Artifacts: `dgcc-artifacts/`

## Behavior notes

- The **unit** step runs Vitest with extra `--exclude` globs for suites that need optional services (remote SQL, optional auth client libraries, or flaky WS harness timing). Run `pnpm run test` for the full server test set.
- **E2E** uses Playwright’s `webServer` with `PERSISTENCE_DRIVER=file` and clears the DB connection URL so a developer `.env` does not force a missing remote database during smoke tests.
- Preflight builds run `@wasd/shared` and `@wasd/core-logic` before compiling the server for E2E, so `server/dist` resolves workspace packages reliably.
