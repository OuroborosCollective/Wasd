# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

The `unit` step runs `pnpm run test:dgcc` (build `@wasd/shared`, then `vitest run client/src`). Use `pnpm run test` for the full workspace suite.

Artifacts: `dgcc-artifacts/`

Self-heal preset (fixes enabled, extreme checks):

```bash
bash tools/dgcc/selfheal-wrapper.sh
```
