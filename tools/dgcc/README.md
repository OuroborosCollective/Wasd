# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Modes

- **`minimal`** (default via `pnpm run dgcc`): lint, interact-distance consistency, E2E smoke, content validation, asset folder audit, WS smoke file, and light UI checks. The full Vitest suite is **not** included here so this gate stays usable while server tests are being repaired.
- **`extreme`** (`pnpm run dgcc:extreme`): everything in minimal plus **full unit tests** (`pnpm run test`) and explicit client + server production builds.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
bash tools/dgcc/selfheal-wrapper.sh
```

`pnpm run ci:verify` runs lint, unit tests, content validation, interact check, and model-path audit (no Playwright E2E).

Artifacts: `dgcc-artifacts/`
