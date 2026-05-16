# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

Unit checks run `pnpm run test:dgcc` (see `vitest.dgcc.config.ts`), which skips a handful of database- and WebSocket-heavy suites so the gate stays green in sandboxes. Use `pnpm run test` for the full suite locally.

Before the first E2E run in a clean environment, install browsers once: `pnpm run test:e2e:install`.

Optional self-heal entry point (enables `DGCC_FIX` and `extreme` by default): `bash tools/dgcc/selfheal-wrapper.sh`.
