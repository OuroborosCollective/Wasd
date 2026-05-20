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

## Behavior

- **Prerequisites**: Before checks that need them, DGCC builds `@wasd/shared` and (when `e2e` or `serverBuild` is in the contract) the server bundle so Playwright can start `node server/dist/index.js` and Vitest can resolve workspace packages.
- **Unit check**: Runs `pnpm run test:dgcc` (focused Vitest files: content validation + repo-root). For the full suite, use `DGCC_FULL_UNIT=1 pnpm run dgcc` or `pnpm run test` directly.
- **Guest / E2E login**: WebSocket `login` is handled via `resolveLoginIdentity` so guest smoke (`guest_e2e_smoke*`) and `ALLOW_GUEST_LOGIN=1` match production auth rules.

## Environment

| Variable | Effect |
|----------|--------|
| `DGCC_MODE` | Same as `--mode=` (`minimal` or `extreme`). |
| `DGCC_FIX` | `1` / `0` overrides contract `fix.enabled` for asset self-heal (empty model folders). |
| `DGCC_FULL_UNIT` | `1` runs full `vitest run` instead of `test:dgcc`. |
| `DGCC_PERSISTENCE_DRIVER` | Passed to the unit Vitest process (default `file`). |
| `DGCC_DATABASE_URL` | If set, passed as `DATABASE_URL` to unit Vitest; if unset, `DATABASE_URL` is cleared for that run. |
