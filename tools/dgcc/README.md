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

## Modes

- **minimal** (default): `lint`, `test:dgcc` (shared + client Vitest slice), `test:e2e:ci`, content validate, asset audit, WS smoke file check, UI a11y smoke.
- **extreme**: same checks as minimal, plus `clientBuild` and `serverBuild`, with contract-driven fixes enabled by default (`DGCC_FIX=1`).

For the full Vitest suite (including server integration tests): `pnpm run test`.
